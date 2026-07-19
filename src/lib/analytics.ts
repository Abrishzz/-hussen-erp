import type { Sale, SystemUser, Expense } from '@/types'

/** Coerce a Firestore Timestamp / {seconds} / Date / ISO string into a JS Date. */
export function toDate(value: unknown): Date {
  if (!value) return new Date(0)
  if (value instanceof Date) return value
  const anyVal = value as { toDate?: () => Date; seconds?: number }
  if (typeof anyVal.toDate === 'function') return anyVal.toDate()
  if (typeof anyVal.seconds === 'number') return new Date(anyVal.seconds * 1000)
  return new Date(value as string)
}

/** Inclusive date-range filter over sales using their `timestamp`. `from`/`to` are yyyy-mm-dd. */
export function filterSalesByRange(sales: Sale[] | undefined, from: string, to: string): Sale[] {
  if (!sales) return []
  const start = new Date(from)
  const end = new Date(to + 'T23:59:59')
  return sales.filter((s) => {
    const d = toDate(s.timestamp)
    return d >= start && d <= end
  })
}

/**
 * Only approved expenses count against takings — pending/rejected never do.
 * Rows with no status predate the approval flow (they could only be created by
 * the owner back then), so they are treated as already approved.
 */
export function approvedExpenses(expenses: Expense[] | undefined): Expense[] {
  return (expenses || []).filter((e) => !e.status || e.status === 'approved')
}

/**
 * Total approved expenses falling on a single day (`yyyy-mm-dd`). This is the
 * amount deducted from that day's sales.
 */
export function approvedExpensesOn(expenses: Expense[] | undefined, day: string): number {
  return approvedExpenses(expenses)
    .filter((e) => toDate(e.date).toISOString().split('T')[0] === day)
    .reduce((sum, e) => sum + e.amount, 0)
}

/** Total approved expenses within an inclusive `yyyy-mm-dd` range. */
export function approvedExpensesInRange(
  expenses: Expense[] | undefined,
  from: string,
  to: string
): number {
  const start = new Date(from)
  const end = new Date(to + 'T23:59:59')
  return approvedExpenses(expenses)
    .filter((e) => {
      const d = toDate(e.date)
      return d >= start && d <= end
    })
    .reduce((sum, e) => sum + e.amount, 0)
}

export interface StaffPerformanceRow {
  staffId: string
  name: string
  orders: number
  revenue: number
  itemsSold: number
  avgOrder: number
}

/**
 * Aggregates completed sales per cashier (staff). Names are resolved from the
 * users collection; unknown ids fall back to a short id label.
 */
export function staffPerformance(
  sales: Sale[],
  users: SystemUser[] | undefined
): StaffPerformanceRow[] {
  const nameById = new Map<string, string>()
  users?.forEach((u) => nameById.set(u.id, u.displayName || u.email || u.id))

  const byStaff: Record<string, StaffPerformanceRow> = {}
  sales.forEach((s) => {
    const id = s.cashierId || 'unknown'
    if (!byStaff[id]) {
      byStaff[id] = {
        staffId: id,
        name: nameById.get(id) || `#${id.slice(0, 6)}`,
        orders: 0,
        revenue: 0,
        itemsSold: 0,
        avgOrder: 0,
      }
    }
    const row = byStaff[id]
    row.orders += 1
    row.revenue += s.total
    row.itemsSold += s.items.reduce((n, it) => n + it.quantity, 0)
  })

  return Object.values(byStaff)
    .map((r) => ({ ...r, avgOrder: r.orders ? Math.round(r.revenue / r.orders) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** Revenue totals keyed by yyyy-mm-dd (sorted ascending). Values in cents. */
export function salesByDay(sales: Sale[]): { date: string; total: number; orders: number }[] {
  const map: Record<string, { total: number; orders: number }> = {}
  sales.forEach((s) => {
    const key = toDate(s.timestamp).toISOString().split('T')[0]
    if (!map[key]) map[key] = { total: 0, orders: 0 }
    map[key].total += s.total
    map[key].orders += 1
  })
  return Object.entries(map)
    .map(([date, v]) => ({ date, total: v.total, orders: v.orders }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface BranchPerformanceRow {
  branchId: string
  name: string
  orders: number
  revenue: number
  itemsSold: number
}

/**
 * Aggregates sales per branch. Sales made by users with no branch (owner/manager
 * selling centrally) collect under an "unassigned" row rather than vanishing.
 */
export function branchPerformance(
  sales: Sale[],
  branches: { id: string; name: string }[] | undefined,
  unassignedLabel = 'Unassigned'
): BranchPerformanceRow[] {
  const nameById = new Map<string, string>()
  branches?.forEach((b) => nameById.set(b.id, b.name))

  const byBranch: Record<string, BranchPerformanceRow> = {}
  sales.forEach((s) => {
    const id = s.branchId || 'unassigned'
    if (!byBranch[id]) {
      byBranch[id] = {
        branchId: id,
        name: id === 'unassigned' ? unassignedLabel : nameById.get(id) || `#${id.slice(0, 6)}`,
        orders: 0,
        revenue: 0,
        itemsSold: 0,
      }
    }
    const row = byBranch[id]
    row.orders += 1
    row.revenue += s.total
    row.itemsSold += s.items.reduce((n, it) => n + it.quantity, 0)
  })

  return Object.values(byBranch).sort((a, b) => b.revenue - a.revenue)
}

/** Revenue split by payment method. Values in cents. */
export function paymentBreakdown(sales: Sale[]): { method: string; total: number }[] {
  const map: Record<string, number> = {}
  sales.forEach((s) => {
    map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.total
  })
  return Object.entries(map).map(([method, total]) => ({ method, total }))
}
