import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

const db = admin.firestore()

// Auto-deduct raw materials when a production batch is marked completed.
//
// Finished goods are NOT credited here: the branch workflow credits
// `warehouseStock` when the manager confirms the batch, so writing finishedGoods
// would be a second, unused source of truth.
export const onProductionBatchConfirmed = functions.firestore
  .document('productionBatches/{batchId}')
  .onWrite(async (change, context) => {
    const { batchId } = context.params
    const before = change.before?.data()
    const after = change.after?.data()

    if (!after || after.status !== 'completed') return null

    // Only act on the *transition* into 'completed'. Every later write to the doc
    // (notably the manager setting `confirmed: true`) also fires onWrite, and
    // without this guard the raw materials would be deducted again each time.
    if (before && before.status === 'completed') return null

    const recipeId = after.recipeId
    const recipeSnap = await db.collection('recipes').doc(recipeId).get()
    if (!recipeSnap.exists) {
      functions.logger.warn(`Recipe ${recipeId} not found for batch ${batchId}`)
      return null
    }

    const recipe = recipeSnap.data()!
    const multiplier = after.actualQty / recipe.batchYield

    const batch = db.batch()
    const movements: Array<{
      materialId: string
      type: 'OUT'
      qty: number
      referenceId: string
      staffId: string
      timestamp: FirebaseFirestore.Timestamp
      note: string
    }> = []

    for (const ingredient of recipe.ingredients) {
      const matRef = db.collection('rawMaterials').doc(ingredient.materialId)
      const matSnap = await matRef.get()

      if (!matSnap.exists) {
        functions.logger.warn(`Material ${ingredient.materialId} not found`)
        continue
      }

      const qtyNeeded = ingredient.qtyPerBatch * multiplier
      batch.update(matRef, {
        currentQty: admin.firestore.FieldValue.increment(-qtyNeeded),
      })

      movements.push({
        materialId: ingredient.materialId,
        type: 'OUT',
        qty: qtyNeeded,
        referenceId: batchId,
        staffId: after.staffId,
        timestamp: admin.firestore.Timestamp.now(),
        note: `Auto-deducted for production batch ${batchId}`,
      })
    }

    // Calculate batch cost
    let totalCost = 0
    for (const ingredient of recipe.ingredients) {
      const matSnap = await db.collection('rawMaterials').doc(ingredient.materialId).get()
      if (matSnap.exists) {
        const matData = matSnap.data()!
        totalCost += (matData.avgCost || 0) * ingredient.qtyPerBatch * multiplier
      }
    }

    batch.update(db.collection('productionBatches').doc(batchId), { cost: totalCost })

    // Write stock movements
    for (const mov of movements) {
      const movRef = db.collection('stockMovements').doc()
      batch.set(movRef, mov)
    }

    await batch.commit()
    functions.logger.info(`Batch ${batchId} processed successfully, cost: ${totalCost}`)
    return null
  })

// Seed a /users doc for accounts created outside the app (e.g. the Firebase
// console). The in-app "Create User" flow writes this doc itself with the chosen
// role, so we must never overwrite an existing one — this trigger races that
// write, and clobbering it would silently demote a new manager to cashier.
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const ref = db.collection('users').doc(user.uid)
  const existing = await ref.get()
  if (existing.exists) {
    functions.logger.info(`User ${user.uid} already has a /users doc; leaving it as-is`)
    return null
  }

  await ref.set({
    email: user.email,
    role: 'cashier',
    displayName: user.displayName || '',
    branchId: '',
    isActive: true,
    createdAt: admin.firestore.Timestamp.now(),
  })
  functions.logger.info(`User ${user.uid} seeded with default role: cashier`)
  return null
})

/**
 * Keeps the `role` custom claim in step with the /users doc, which is the source
 * of truth the app and security rules read. This also covers an owner changing
 * someone's role in User Management — otherwise the claim would stay stale
 * forever, since nothing else ever refreshes it.
 */
export const syncUserRoleClaim = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const { userId } = context.params
    const after = change.after?.data()
    if (!after) return null

    const role = after.role
    const validRoles = ['owner', 'manager', 'cashier', 'staff']
    if (!validRoles.includes(role)) {
      functions.logger.warn(`User ${userId} has unknown role "${role}"; claim not set`)
      return null
    }
    if (change.before?.data()?.role === role) return null // nothing changed

    try {
      await admin.auth().setCustomUserClaims(userId, { role })
      functions.logger.info(`Synced claim for ${userId}: role=${role}`)
    } catch (err) {
      functions.logger.error(`Could not set claim for ${userId}`, err)
    }
    return null
  })

// Daily low stock alert
export const checkLowStock = functions.https.onCall(async (_, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }

  const materials = await db.collection('rawMaterials').get()
  const lowStockItems: Array<{ name: string; currentQty: number; reorderLevel: number }> = []

  materials.forEach((doc) => {
    const data = doc.data()
    if (data.currentQty <= data.reorderLevel) {
      lowStockItems.push({
        name: data.name_en,
        currentQty: data.currentQty,
        reorderLevel: data.reorderLevel,
      })
    }
  })

  return { lowStockItems, count: lowStockItems.length }
})

export const changeUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }
  
  const callerUid = context.auth.uid
  const callerRecord = await admin.auth().getUser(callerUid)
  
  if (callerRecord.customClaims?.role !== 'owner') {
    throw new functions.https.HttpsError('permission-denied', 'Only owners can change user passwords')
  }

  const { uid, newPassword } = data
  if (!uid || !newPassword || newPassword.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid uid or password too short')
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword })
    functions.logger.info(`Password updated for user ${uid} by owner ${callerUid}`)
    return { success: true }
  } catch (error) {
    functions.logger.error(`Failed to update password for ${uid}`, error)
    throw new functions.https.HttpsError('internal', 'Failed to update password')
  }
})
