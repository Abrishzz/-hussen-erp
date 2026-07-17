import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  increment,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/store/authStore'
import type {
  Product, Sale, RawMaterial, StockMovement, Supplier,
  Recipe, ProductionBatch, FinishedGood,
  Employee, Attendance, Payroll, Expense, SystemUser,
  Branch, WarehouseStockItem, BranchStockItem, Distribution, DistributionLine,
  CashClose, CashCloseReturn, CartItem,
} from '@/types'

export { where, orderBy, limit, Timestamp }
export type { QueryConstraint }

// Generic hooks
export function useCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options: { enabled?: boolean } = {}
) {
  return useQuery<T[]>({
    queryKey: [collectionName, ...constraints.map((c) => c.toString())],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const q = query(collection(db, collectionName), ...constraints)
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
    },
  })
}

export function useDoc<T>(collectionName: string, id?: string) {
  return useQuery<T | null>({
    queryKey: [collectionName, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null
      const snap = await getDoc(doc(db, collectionName, id))
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
    },
  })
}

export function useAdd(collectionName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => addDoc(collection(db, collectionName), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collectionName] }),
  })
}

export function useUpdate(collectionName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateDoc(doc(db, collectionName, id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collectionName] }),
  })
}

export function useRemove(collectionName: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, collectionName, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [collectionName] }),
  })
}

// ─── Users (login accounts) ───
export function useUsers() {
  return useCollection<SystemUser>('users')
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SystemUser> }) =>
      updateDoc(doc(db, 'users', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Products ───
export function useProducts() {
  return useCollection<Product>('products', [where('isActive', '==', true)])
}

export function useProduct(id?: string) {
  return useDoc<Product>('products', id)
}

export function useAddProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => addDoc(collection(db, 'products'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      updateDoc(doc(db, 'products', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateDoc(doc(db, 'products', id), { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ─── Sales ───
export function useSales(constraints: QueryConstraint[] = [], options: { enabled?: boolean } = {}) {
  return useCollection<Sale>('sales', constraints, options)
}

export function useTodaySales() {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  return useCollection<Sale>('sales', [
    where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
    where('status', '==', 'completed'),
    orderBy('timestamp', 'desc'),
  ])
}

export function useAddSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Sale, 'id'>) => addDoc(collection(db, 'sales'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales'] }),
  })
}

// ─── Raw Materials ───
export function useRawMaterials(options: { enabled?: boolean } = {}) {
  return useCollection<RawMaterial>('rawMaterials', [where('isActive', '==', true)], options)
}

export function useAddMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<RawMaterial, 'id'>) => addDoc(collection(db, 'rawMaterials'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rawMaterials'] }),
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RawMaterial> }) =>
      updateDoc(doc(db, 'rawMaterials', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rawMaterials'] }),
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateDoc(doc(db, 'rawMaterials', id), { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rawMaterials'] }),
  })
}

// ─── Stock Movements ───
export function useStockMovements(materialId?: string) {
  const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')]
  if (materialId) constraints.unshift(where('materialId', '==', materialId))
  return useCollection<StockMovement>('stockMovements', constraints)
}

export function useAddMovement() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: (data: Omit<StockMovement, 'id' | 'staffId'>) =>
      addDoc(collection(db, 'stockMovements'), { ...data, staffId: user?.uid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stockMovements'] })
      qc.invalidateQueries({ queryKey: ['rawMaterials'] })
    },
  })
}

// ─── Suppliers ───
export function useSuppliers() {
  return useCollection<Supplier>('suppliers', [where('isActive', '==', true)])
}

export function useAddSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Supplier, 'id'>) => addDoc(collection(db, 'suppliers'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      updateDoc(doc(db, 'suppliers', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateDoc(doc(db, 'suppliers', id), { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

// ─── Recipes ───
export function useRecipes() {
  return useCollection<Recipe>('recipes')
}

export function useAddRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Recipe, 'id'>) => addDoc(collection(db, 'recipes'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useUpdateRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Recipe> }) =>
      updateDoc(doc(db, 'recipes', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

export function useDeleteRecipe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'recipes', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes'] }),
  })
}

// ─── Production Batches ───
export function useProductionBatches(options: { enabled?: boolean } = {}) {
  return useCollection<ProductionBatch>('productionBatches', [orderBy('date', 'desc')], options)
}

export function useAddBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<ProductionBatch, 'id'>) => addDoc(collection(db, 'productionBatches'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productionBatches'] }),
  })
}

export function useUpdateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductionBatch> }) =>
      updateDoc(doc(db, 'productionBatches', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productionBatches'] }),
  })
}

// ─── Finished Goods ───
export function useFinishedGoods() {
  return useCollection<FinishedGood>('finishedGoods')
}

// ─── Employees ───
export function useEmployees() {
  return useCollection<Employee>('employees', [where('isActive', '==', true)])
}

export function useAddEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Employee, 'id'>) => addDoc(collection(db, 'employees'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      updateDoc(doc(db, 'employees', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => updateDoc(doc(db, 'employees', id), { isActive: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

// ─── Attendance ───
export function useAttendance(empId?: string) {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')]
  if (empId) constraints.unshift(where('empId', '==', empId))
  return useCollection<Attendance>('attendance', constraints)
}

export function useAddAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Attendance, 'id'>) => addDoc(collection(db, 'attendance'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

// ─── Payroll ───
export function usePayroll(month?: string) {
  const constraints: QueryConstraint[] = []
  if (month) constraints.push(where('month', '==', month))
  return useCollection<Payroll>('payroll', constraints)
}

export function useAddPayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Payroll, 'id'>) => addDoc(collection(db, 'payroll'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  })
}

// ─── Expenses ───
export function useExpenses(constraints: QueryConstraint[] = []) {
  return useCollection<Expense>('expenses', constraints.length ? constraints : [orderBy('date', 'desc')])
}

export function useAddExpense() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: (data: Omit<Expense, 'id' | 'recordedBy'>) =>
      addDoc(collection(db, 'expenses'), { ...data, recordedBy: user?.uid }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) =>
      updateDoc(doc(db, 'expenses', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'expenses', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

// ─── Branches ───
export function useBranches() {
  return useCollection<Branch>('branches')
}

export function useActiveBranches() {
  return useCollection<Branch>('branches', [where('isActive', '==', true)])
}

export function useAddBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Branch, 'id'>) => addDoc(collection(db, 'branches'), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Branch> }) =>
      updateDoc(doc(db, 'branches', id), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  })
}

// ─── Warehouse (central) stock ───
export function useWarehouseStock() {
  return useCollection<WarehouseStockItem>('warehouseStock')
}

/**
 * Manager confirms a produced batch: its actual quantity flows into the central
 * warehouse pool and the batch is flagged confirmed.
 */
export function useConfirmBatch() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (args: {
      batchId: string
      productId: string
      name_en: string
      name_am: string
      qty: number
    }) => {
      const batch = writeBatch(db)
      batch.set(
        doc(db, 'warehouseStock', args.productId),
        {
          productId: args.productId,
          name_en: args.name_en,
          name_am: args.name_am,
          qty: increment(args.qty),
        },
        { merge: true }
      )
      batch.update(doc(db, 'productionBatches', args.batchId), {
        confirmed: true,
        confirmedBy: user?.uid || '',
        confirmedAt: Timestamp.now(),
      })
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouseStock'] })
      qc.invalidateQueries({ queryKey: ['productionBatches'] })
    },
  })
}

/** Sets a product's central warehouse quantity outright (used by the product form). */
export function useSetWarehouseQty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { productId: string; name_en: string; name_am: string; qty: number }) =>
      setDoc(
        doc(db, 'warehouseStock', args.productId),
        { productId: args.productId, name_en: args.name_en, name_am: args.name_am, qty: args.qty },
        { merge: true }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouseStock'] }),
  })
}

// ─── Branch stock ───
export function useBranchStock(branchId?: string, options: { enabled?: boolean } = {}) {
  const constraints: QueryConstraint[] = []
  if (branchId) constraints.push(where('branchId', '==', branchId))
  return useCollection<BranchStockItem>('branchStock', constraints, options)
}

// ─── Distributions ───
export function useDistributions() {
  return useCollection<Distribution>('distributions', [orderBy('createdAt', 'desc')])
}

/**
 * Manager distributes warehouse stock to branches: warehouse pool is debited and
 * each branch's received stock is credited, atomically, with a distribution record.
 */
export function useDistribute() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (lines: DistributionLine[]) => {
      const batch = writeBatch(db)
      for (const l of lines) {
        batch.set(
          doc(db, 'warehouseStock', l.productId),
          { qty: increment(-l.qty) },
          { merge: true }
        )
        batch.set(
          doc(db, 'branchStock', `${l.branchId}_${l.productId}`),
          {
            branchId: l.branchId,
            productId: l.productId,
            name_en: l.name_en,
            name_am: l.name_am,
            qty: increment(l.qty),
          },
          { merge: true }
        )
      }
      batch.set(doc(collection(db, 'distributions')), {
        lines,
        createdBy: user?.uid || '',
        createdByName: user?.displayName || '',
        createdAt: Timestamp.now(),
      })
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouseStock'] })
      qc.invalidateQueries({ queryKey: ['branchStock'] })
      qc.invalidateQueries({ queryKey: ['distributions'] })
    },
  })
}

/** Deducts branch stock for the sold cart items (called on POS checkout). */
export function useDeductBranchStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ branchId, items }: { branchId: string; items: CartItem[] }) => {
      const batch = writeBatch(db)
      for (const it of items) {
        batch.set(
          doc(db, 'branchStock', `${branchId}_${it.product.id}`),
          { qty: increment(-it.quantity) },
          { merge: true }
        )
      }
      await batch.commit()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branchStock'] }),
  })
}

// ─── Cash closes ───
export function useCashCloses(constraints: QueryConstraint[] = [], options: { enabled?: boolean } = {}) {
  return useCollection<CashClose>(
    'cashCloses',
    constraints.length ? constraints : [orderBy('submittedAt', 'desc')],
    options
  )
}

/**
 * Branch end-of-day close: records the day's totals, and returns any unsold branch
 * stock back to the central warehouse (per the "returned to central" policy).
 */
export function useSubmitCashClose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      branchId: string
      branchName: string
      date: string
      cashierId: string
      cashierName: string
      totalSales: number
      orderCount: number
      byPayment: { cash: number; telebirr: number; bank: number }
    }) => {
      // Read this branch's remaining stock and return it to the warehouse.
      const stockSnap = await getDocs(
        query(collection(db, 'branchStock'), where('branchId', '==', args.branchId))
      )
      const batch = writeBatch(db)
      const returnedItems: CashCloseReturn[] = []
      stockSnap.forEach((d) => {
        const s = d.data() as BranchStockItem
        if (s.qty > 0) {
          returnedItems.push({ productId: s.productId, name_en: s.name_en, qty: s.qty })
          batch.set(doc(db, 'warehouseStock', s.productId), { qty: increment(s.qty) }, { merge: true })
          batch.update(d.ref, { qty: 0 })
        }
      })
      batch.set(doc(collection(db, 'cashCloses')), {
        ...args,
        returnedItems,
        status: 'submitted',
        submittedAt: Timestamp.now(),
      })
      await batch.commit()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashCloses'] })
      qc.invalidateQueries({ queryKey: ['branchStock'] })
      qc.invalidateQueries({ queryKey: ['warehouseStock'] })
    },
  })
}

/** Manager confirms a branch's cash close (money received). */
export function useConfirmCashClose() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: (id: string) =>
      updateDoc(doc(db, 'cashCloses', id), {
        status: 'confirmed',
        confirmedBy: user?.uid || '',
        confirmedByName: user?.displayName || '',
        confirmedAt: Timestamp.now(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashCloses'] }),
  })
}
