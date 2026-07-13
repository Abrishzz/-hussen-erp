/**
 * Seeds the local Firebase Emulator with demo users and data for Hussen Bakery ERP.
 *
 * Prereq: emulators running (`npm run emulators`).
 * Run with: `npm run seed`
 *
 * Demo logins (password for all: `password123`):
 *   owner@hussenbakery.com    -> role: owner
 *   cashier@hussenbakery.com  -> role: cashier
 *   staff@hussenbakery.com    -> role: staff
 */
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

// Point admin SDK at the emulators.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'hussen-bakery-erp'
initializeApp({ projectId: PROJECT_ID })

const auth = getAuth()
const db = getFirestore()

const PASSWORD = 'password123'

const users = [
  { uid: 'owner-uid', email: 'owner@hussenbakery.com', displayName: 'Hussen (Owner)', role: 'owner' },
  { uid: 'cashier-uid', email: 'cashier@hussenbakery.com', displayName: 'Cashier One', role: 'cashier' },
  { uid: 'staff-uid', email: 'staff@hussenbakery.com', displayName: 'Baker Staff', role: 'staff' },
]

// Prices stored in cents (santim). ETB 25.00 => 2500.
const products = [
  { name_en: 'White Bread', name_am: 'ነጭ ዳቦ', price: 2500, category: 'Bread', imageUrl: '' },
  { name_en: 'Whole Wheat Bread', name_am: 'ሙሉ ስንዴ ዳቦ', price: 3000, category: 'Bread', imageUrl: '' },
  { name_en: 'Bread Roll', name_am: 'ትንሽ ዳቦ', price: 1000, category: 'Bread', imageUrl: '' },
  { name_en: 'Chocolate Cake (slice)', name_am: 'ቸኮሌት ኬክ', price: 6000, category: 'Cake', imageUrl: '' },
  { name_en: 'Vanilla Cake (slice)', name_am: 'ቫኒላ ኬክ', price: 5500, category: 'Cake', imageUrl: '' },
  { name_en: 'Birthday Cake (whole)', name_am: 'የልደት ኬክ', price: 45000, category: 'Cake', imageUrl: '' },
  { name_en: 'Croissant', name_am: 'ክሮዋሰንት', price: 3500, category: 'Pastry', imageUrl: '' },
  { name_en: 'Doughnut', name_am: 'ዶናት', price: 2000, category: 'Pastry', imageUrl: '' },
  { name_en: 'Sambusa', name_am: 'ሳምቡሳ', price: 1500, category: 'Pastry', imageUrl: '' },
  { name_en: 'Cookie (pack)', name_am: 'ኩኪ', price: 4000, category: 'Pastry', imageUrl: '' },
  { name_en: 'Meat Pie', name_am: 'ስጋ ፓይ', price: 4500, category: 'Savory', imageUrl: '' },
  { name_en: 'Macchiato', name_am: 'ማኪያቶ', price: 3000, category: 'Drinks', imageUrl: '' },
]

// avgCost stored in cents per unit.
const rawMaterials = [
  { name_en: 'Wheat Flour', name_am: 'የስንዴ ዱቄት', unit: 'sack', currentQty: 20, reorderLevel: 5, avgCost: 350000 },
  { name_en: 'Sugar', name_am: 'ስኳር', unit: 'kg', currentQty: 80, reorderLevel: 20, avgCost: 8500 },
  { name_en: 'Butter', name_am: 'ቅቤ', unit: 'kg', currentQty: 15, reorderLevel: 10, avgCost: 45000 },
  { name_en: 'Eggs', name_am: 'እንቁላል', unit: 'pcs', currentQty: 300, reorderLevel: 100, avgCost: 1200 },
  { name_en: 'Yeast', name_am: 'እርሾ', unit: 'kg', currentQty: 4, reorderLevel: 5, avgCost: 30000 },
  { name_en: 'Cooking Oil', name_am: 'የምግብ ዘይት', unit: 'liter', currentQty: 40, reorderLevel: 15, avgCost: 22000 },
  { name_en: 'Cocoa Powder', name_am: 'የኮኮዋ ዱቄት', unit: 'kg', currentQty: 6, reorderLevel: 3, avgCost: 60000 },
  { name_en: 'Packaging Box', name_am: 'የማሸጊያ ሳጥን', unit: 'pcs', currentQty: 500, reorderLevel: 150, avgCost: 800 },
]

const suppliers = [
  { name: 'Bulehora Flour Mills', phone: '+251912000001', address: 'Bulehora, Oromia', productsSupplied: ['Wheat Flour', 'Sugar'], isActive: true },
  { name: 'Oromia Dairy Supply', phone: '+251912000002', address: 'Yabelo Road, Bulehora', productsSupplied: ['Butter', 'Eggs'], isActive: true },
]

async function seedUsers() {
  for (const u of users) {
    // Write the /users doc first so the onUserCreated trigger (if running) picks up the role.
    await db.collection('users').doc(u.uid).set({
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      isActive: true,
      language: 'en',
      createdAt: Timestamp.now(),
    })
    try {
      await auth.createUser({ uid: u.uid, email: u.email, password: PASSWORD, displayName: u.displayName })
    } catch (e) {
      if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
        await auth.updateUser(u.uid, { email: u.email, password: PASSWORD, displayName: u.displayName })
      } else {
        throw e
      }
    }
    await auth.setCustomUserClaims(u.uid, { role: u.role })
    console.log(`  user: ${u.email} (${u.role})`)
  }
}

async function seedCollection(name, docs, transform = (d) => d) {
  for (const d of docs) {
    await db.collection(name).add(transform(d))
  }
  console.log(`  ${name}: ${docs.length} docs`)
}

async function main() {
  console.log(`Seeding project "${PROJECT_ID}" via emulators...`)

  console.log('Users:')
  await seedUsers()

  console.log('Data:')
  await seedCollection('products', products, (p) => ({ ...p, isActive: true, createdAt: Timestamp.now() }))
  await seedCollection('rawMaterials', rawMaterials, (m) => ({ ...m, isActive: true }))
  await seedCollection('suppliers', suppliers)

  await db.collection('settings').doc('app').set({
    shopName: 'Hussen Bakery',
    shopName_am: 'የሁሴን ዳቦ ቤት',
    logo: '',
    taxRate: 0,
    defaultLanguage: 'en',
    darkMode: false,
    currency: 'ETB',
    lowStockThreshold: 0,
  })
  console.log('  settings/app')

  // A few sample sales spread across today so the dashboard has data.
  const productSnap = await db.collection('products').get()
  const prodList = productSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const sampleCount = 6
  for (let i = 0; i < sampleCount; i++) {
    const picks = [prodList[i % prodList.length], prodList[(i + 3) % prodList.length]]
    const items = picks.map((p) => ({
      productId: p.id,
      name_en: p.name_en,
      name_am: p.name_am,
      quantity: (i % 3) + 1,
      unitPrice: p.price,
      discount: 0,
      total: p.price * ((i % 3) + 1),
    }))
    const subtotal = items.reduce((s, it) => s + it.total, 0)
    const hoursAgo = i * 1.5
    await db.collection('sales').add({
      items,
      subtotal,
      discount: 0,
      total: subtotal,
      paymentMethod: ['cash', 'telebirr', 'bank'][i % 3],
      cashierId: 'cashier-uid',
      customerName: '',
      status: 'completed',
      timestamp: Timestamp.fromMillis(Date.now() - hoursAgo * 3600 * 1000),
    })
  }
  console.log(`  sales: ${sampleCount} sample orders`)

  console.log('\n✅ Seed complete. Log in with owner@hussenbakery.com / password123')
  // FieldValue is imported to keep parity with app writes; reference to avoid lint noise.
  void FieldValue
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
