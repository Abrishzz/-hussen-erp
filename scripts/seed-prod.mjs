/**
 * Seeds the REAL Firebase project (not emulators) with demo users + catalog data.
 *
 * Setting custom-claim roles requires Admin privileges, so this needs a service
 * account key. You run it locally — the key never leaves your machine.
 *
 *   1. Firebase console -> Project settings -> Service accounts -> "Generate new
 *      private key". Save the JSON somewhere safe (do NOT commit it).
 *   2. Run:
 *        GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json \
 *        GCLOUD_PROJECT=hussenerp \
 *        npm run seed:prod
 *
 * Idempotent: users are upserted, catalog collections are only seeded when empty.
 *
 * Demo logins (password for all: `password123`):
 *   owner@hussenbakery.com | manager@hussenbakery.com | cashier@hussenbakery.com | staff@hussenbakery.com
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'hussenerp'

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    'ERROR: set GOOGLE_APPLICATION_CREDENTIALS to your service-account key path.\n' +
      'See the header of scripts/seed-prod.mjs for instructions.'
  )
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

const PASSWORD = 'password123'
const users = [
  { email: 'owner@hussenbakery.com', displayName: 'Hussen (Owner)', role: 'owner' },
  { email: 'manager@hussenbakery.com', displayName: 'Bereket (Manager)', role: 'manager' },
  { email: 'cashier@hussenbakery.com', displayName: 'Cashier One', role: 'cashier' },
  { email: 'staff@hussenbakery.com', displayName: 'Baker Staff', role: 'staff' },
]

// Prices / costs stored in cents (santim).
const products = [
  { name_en: 'White Bread', name_am: 'ነጭ ዳቦ', price: 2500, category: 'Bread' },
  { name_en: 'Whole Wheat Bread', name_am: 'ሙሉ ስንዴ ዳቦ', price: 3000, category: 'Bread' },
  { name_en: 'Bread Roll', name_am: 'ትንሽ ዳቦ', price: 1000, category: 'Bread' },
  { name_en: 'Chocolate Cake (slice)', name_am: 'ቸኮሌት ኬክ', price: 6000, category: 'Cake' },
  { name_en: 'Vanilla Cake (slice)', name_am: 'ቫኒላ ኬክ', price: 5500, category: 'Cake' },
  { name_en: 'Birthday Cake (whole)', name_am: 'የልደት ኬክ', price: 45000, category: 'Cake' },
  { name_en: 'Croissant', name_am: 'ክሮዋሰንት', price: 3500, category: 'Pastry' },
  { name_en: 'Doughnut', name_am: 'ዶናት', price: 2000, category: 'Pastry' },
  { name_en: 'Sambusa', name_am: 'ሳምቡሳ', price: 1500, category: 'Pastry' },
  { name_en: 'Cookie (pack)', name_am: 'ኩኪ', price: 4000, category: 'Pastry' },
  { name_en: 'Meat Pie', name_am: 'ስጋ ፓይ', price: 4500, category: 'Savory' },
  { name_en: 'Macchiato', name_am: 'ማኪያቶ', price: 3000, category: 'Drinks' },
]

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
    let uid
    try {
      const existing = await auth.getUserByEmail(u.email)
      uid = existing.uid
      await auth.updateUser(uid, { password: PASSWORD, displayName: u.displayName })
    } catch {
      const created = await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.displayName })
      uid = created.uid
    }
    await auth.setCustomUserClaims(uid, { role: u.role })
    await db.collection('users').doc(uid).set(
      { email: u.email, displayName: u.displayName, role: u.role, isActive: true, language: 'en', createdAt: Timestamp.now() },
      { merge: true }
    )
    console.log(`  user: ${u.email} (${u.role})`)
  }
}

async function seedIfEmpty(name, docs, transform = (d) => d) {
  const snap = await db.collection(name).limit(1).get()
  if (!snap.empty) {
    console.log(`  ${name}: already has data, skipping`)
    return
  }
  const batch = db.batch()
  for (const d of docs) batch.set(db.collection(name).doc(), transform(d))
  await batch.commit()
  console.log(`  ${name}: ${docs.length} docs`)
}

async function main() {
  console.log(`Seeding REAL project "${PROJECT_ID}"...`)
  console.log('Users:')
  await seedUsers()
  console.log('Catalog:')
  await seedIfEmpty('products', products, (p) => ({ ...p, imageUrl: '', isActive: true, createdAt: Timestamp.now() }))
  await seedIfEmpty('rawMaterials', rawMaterials, (m) => ({ ...m, isActive: true }))
  await seedIfEmpty('suppliers', suppliers)
  await db.collection('settings').doc('app').set({
    shopName: 'Hussen Bakery',
    shopName_am: 'የሁሴን ዳቦ ቤት',
    logo: '',
    taxRate: 0,
    defaultLanguage: 'en',
    darkMode: false,
    currency: 'ETB',
    lowStockThreshold: 0,
  }, { merge: true })
  console.log('  settings/app')
  console.log('\n✅ Done. Quick-login now works live: owner@hussenbakery.com / password123')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
