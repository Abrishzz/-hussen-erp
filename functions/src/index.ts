import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

admin.initializeApp()

const db = admin.firestore()

// Auto-deduct raw materials when a production batch is confirmed
export const onProductionBatchConfirmed = functions.firestore
  .document('productionBatches/{batchId}')
  .onWrite(async (change, context) => {
    const { batchId } = context.params
    const after = change.after?.data()

    if (!after || after.status !== 'completed') return null

    const recipeId = after.recipeId
    const recipeSnap = await db.collection('recipes').doc(recipeId).get()
    if (!recipeSnap.exists) {
      functions.logger.warn(`Recipe ${recipeId} not found for batch ${batchId}`)
      return null
    }

    const recipe = recipeSnap.data()!
    const multiplier = after.actualQty / recipe.batchYield

    const batch = admin.firestore.batch()
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

    // Update finished goods
    const finishedGoodRef = db.collection('finishedGoods').doc(recipe.productId)
    const finishedSnap = await finishedGoodRef.get()
    if (finishedSnap.exists) {
      batch.update(finishedGoodRef, {
        currentStock: admin.firestore.FieldValue.increment(after.actualQty),
      })
    } else {
      batch.set(finishedGoodRef, {
        productId: recipe.productId,
        productName_en: recipe.productName_en,
        productName_am: recipe.productName_am,
        currentStock: after.actualQty,
        unit: 'pcs',
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

// Set custom claims when a user document is created
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const userDoc = await db.collection('users').doc(user.uid).get()
  const role = userDoc.exists ? (userDoc.data()?.role || 'cashier') : 'cashier'

  await admin.auth().setCustomUserClaims(user.uid, { role })
  await db.collection('users').doc(user.uid).set(
    {
      email: user.email,
      role,
      displayName: user.displayName || '',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
    },
    { merge: true }
  )

  functions.logger.info(`User ${user.uid} created with role: ${role}`)
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
