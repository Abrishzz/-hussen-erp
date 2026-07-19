import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'owner' | 'manager' | 'cashier' | 'staff'

export interface Branch {
  id: string
  name: string
  name_am?: string
  location?: string
  phone?: string
  isActive: boolean
  createdAt?: Timestamp
}

/** Central warehouse pool of confirmed finished goods, ready to distribute. Doc id = productId. */
export interface WarehouseStockItem {
  id: string
  productId: string
  name_en: string
  name_am: string
  qty: number
}

/** Per-branch received stock. Doc id = `${branchId}_${productId}`. */
export interface BranchStockItem {
  id: string
  branchId: string
  productId: string
  name_en: string
  name_am: string
  qty: number
}

export interface DistributionLine {
  branchId: string
  branchName: string
  productId: string
  name_en: string
  name_am: string
  qty: number
}

export interface Distribution {
  id: string
  lines: DistributionLine[]
  createdBy: string
  createdByName?: string
  createdAt: Timestamp
}

export interface CashCloseReturn {
  productId: string
  name_en: string
  qty: number
}

export interface CashClose {
  id: string
  branchId: string
  branchName: string
  date: string // yyyy-mm-dd
  cashierId: string
  cashierName: string
  totalSales: number
  orderCount: number
  byPayment: { cash: number; telebirr: number; bank: number }
  returnedItems: CashCloseReturn[]
  status: 'submitted' | 'confirmed'
  submittedAt: Timestamp
  confirmedBy?: string
  confirmedByName?: string
  confirmedAt?: Timestamp
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  role: UserRole
  phone?: string
  isActive: boolean
  language?: 'en' | 'am' | 'om'
}

/** A `/users/{uid}` document — the record used to manage login accounts. */
export interface SystemUser {
  id: string
  email: string
  displayName: string
  role: UserRole
  phone?: string
  isActive: boolean
  language?: 'en' | 'am' | 'om'
  /** For cashiers: the branch they sell at. */
  branchId?: string
  createdAt?: Timestamp
}

export interface Product {
  id: string
  name_en: string
  name_am: string
  price: number
  category: string
  imageUrl: string
  isActive: boolean
  createdAt: Timestamp
}

export interface CartItem {
  product: Product
  quantity: number
  discount: number
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
  branchId?: string
  customerName?: string
  /** For telebirr/bank sales: a compressed Base64 JPEG of the payment proof. */
  paymentProof?: string
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
  avgCost: number
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
  batchYield: number
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
  cost: number
  notes?: string
  /** Manager confirmed the produced quantity into the central warehouse. */
  confirmed?: boolean
  confirmedBy?: string
  confirmedAt?: Timestamp
  productId?: string
}

export interface FinishedGood {
  id: string
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
  salary: number
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
  amount: number
  description: string
  date: Timestamp
  recordedBy: string
}

export interface Payroll {
  id: string
  empId: string
  month: string
  baseSalary: number
  daysWorked: number
  deductions: number
  /** Amount withheld this payroll to repay outstanding loans/advances (cents). */
  loanRepayment?: number
  netPay: number
  paidAt: Timestamp
}

/**
 * A loan or salary advance given to an employee, repaid by withholding
 * `installment` from each payroll until `balance` reaches zero. An advance is
 * just a loan whose installment equals the principal (repaid in one payroll).
 */
export interface Loan {
  id: string
  empId: string
  empName: string
  type: 'loan' | 'advance'
  principal: number
  installment: number
  balance: number
  reason?: string
  issuedAt: Timestamp
  issuedBy?: string
  status: 'active' | 'settled'
}

export interface AppSettings {
  shopName: string
  shopName_am: string
  logo: string
  taxRate: number
  defaultLanguage: 'en' | 'am' | 'om'
  darkMode: boolean
  currency: string
  telebirrNumber?: string
  bankAccount?: string
}

/** An action submitted by a manager for owner approval in the HR module. */
export interface HrApproval {
  id: string
  type:
    | 'add_employee'
    | 'edit_employee'
    | 'delete_employee'
    | 'add_attendance'
    | 'issue_loan'
    | 'settle_loan'
    | 'pay_salary'
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  submittedBy: string
  submittedByName: string
  submittedAt: Timestamp
  reviewedBy?: string
  reviewedByName?: string
  reviewedAt?: Timestamp
  note?: string
}

export interface OrderItem {
  productId: string
  name_en: string
  name_am: string
  price: number
  quantity: number
  imageUrl?: string
}

export interface Order {
  id: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryAddress: string
  notes?: string
  paymentMethod: 'cash' | 'telebirr' | 'bank'
  /** For telebirr/bank: the transaction reference number the customer received when paying. */
  transactionRef?: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  createdAt: Timestamp
  deliveryDate?: string
  deliveryTime?: string
}

