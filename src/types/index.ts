import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'cashier' | 'staff'

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  phone?: string
  isActive: boolean
  language?: 'en' | 'am'
}

export interface Product {
  id: string
  name_en: string
  name_am: string
  price: number // stored in cents
  category: string
  imageUrl: string
  isActive: boolean
  createdAt: Timestamp
}

export interface CartItem {
  product: Product
  quantity: number
  discount: number // per-item discount in cents
}

export interface Sale {
  id: string
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'telebirr' | 'bank'
  cashReceived?: number
  changeDue?: number
  cashierId: string
  customerName?: string
  status: 'completed' | 'voided' | 'held'
  timestamp: Timestamp
}

export interface SaleItem {
  productId: string
  name_en: string
  name_am: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface RawMaterial {
  id: string
  name_en: string
  name_am: string
  unit: 'kg' | 'liter' | 'pcs' | 'sack'
  currentQty: number
  reorderLevel: number
  avgCost: number // in cents per unit
  isActive: boolean
}

export interface StockMovement {
  id: string
  materialId: string
  type: 'IN' | 'OUT' | 'WASTE'
  qty: number
  unitCost?: number
  referenceId?: string
  staffId: string
  timestamp: Timestamp
  note?: string
}

export interface Supplier {
  id: string
  name: string
  phone: string
  address: string
  productsSupplied: string[]
  isActive: boolean
}

export interface Recipe {
  id: string
  productId: string
  productName_en: string
  productName_am: string
  ingredients: RecipeIngredient[]
  batchYield: number // units produced per batch
  instructions?: string
}

export interface RecipeIngredient {
  materialId: string
  materialName_en: string
  materialName_am: string
  qtyPerBatch: number
  unit: string
}

export interface ProductionBatch {
  id: string
  recipeId: string
  productName_en: string
  productName_am: string
  plannedQty: number
  actualQty: number
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  staffId: string
  date: Timestamp
  cost: number // in cents
  notes?: string
}

export interface FinishedGood {
  productId: string
  productName_en: string
  productName_am: string
  currentStock: number
  unit: string
}

export interface Employee {
  id: string
  name: string
  role: string
  phone: string
  salary: number // in cents
  salaryType: 'daily' | 'monthly'
  hireDate: Timestamp
  isActive: boolean
}

export interface Attendance {
  id: string
  empId: string
  date: Timestamp
  checkIn: string
  checkOut: string
  status: 'present' | 'absent' | 'late' | 'half-day'
}

export interface Expense {
  id: string
  category: string
  amount: number // in cents
  description: string
  date: Timestamp
  recordedBy: string
}

export interface Payroll {
  id: string
  empId: string
  month: string // YYYY-MM
  baseSalary: number
  daysWorked: number
  deductions: number
  netPay: number
  paidAt: Timestamp
}

export interface AppSettings {
  shopName: string
  shopName_am: string
  logo: string
  taxRate: number
  defaultLanguage: 'en' | 'am'
  darkMode: boolean
  currency: string
}
