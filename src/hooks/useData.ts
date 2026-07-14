import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
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
  Employee, Attendance, Payroll, Expense,
} from '@/types'

export { where, orderBy, limit, Timestamp }
export type { QueryConstraint }

// Generic hooks
export function useCollection<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  return useQuery<T[]>({
    queryKey: [collectionName, ...constraints.map((c) => c.toString())],
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
export function useSales(constraints: QueryConstraint[] = []) {
  return useCollection<Sale>('sales', constraints)
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
export function useRawMaterials() {
  return useCollection<RawMaterial>('rawMaterials', [where('isActive', '==', true)])
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
export function useProductionBatches() {
  return useCollection<ProductionBatch>('productionBatches', [orderBy('date', 'desc')])
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
