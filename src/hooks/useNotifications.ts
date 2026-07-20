import { useTranslation } from 'react-i18next'
import {
  useRawMaterials, useProductionBatches, useCashCloses, useBranchStock, useSales,
  useOrders, useInquiries, useExpenses,
} from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { filterSalesByRange } from '@/lib/analytics'

export type NotificationSeverity = 'info' | 'warning' | 'danger'

export interface AppNotification {
  id: string
  severity: NotificationSeverity
  title: string
  description: string
  /** Route to open when the notification is clicked. */
  path: string
}

/**
 * Notifications are *derived* from live data rather than stored in their own
 * collection — there's nothing to write, mark-read or keep in sync, and they can
 * never go stale against the numbers they describe.
 *
 * Each source query is gated by role so we never fire a read the security rules
 * would reject (e.g. a manager cannot read rawMaterials).
 */
export function useNotifications(): AppNotification[] {
  const { t } = useTranslation()
  const { role, branchId } = useAuthStore()

  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const isStaff = role === 'staff'
  const isCashier = role === 'cashier'
  const managerish = isOwner || isManager

  const { data: materials } = useRawMaterials({ enabled: isOwner || isStaff })
  const { data: batches } = useProductionBatches({ enabled: managerish })
  const { data: closes } = useCashCloses([], { enabled: managerish || isCashier })
  const { data: branchStock } = useBranchStock(branchId || undefined, { enabled: isCashier && !!branchId })
  const { data: sales } = useSales([], { enabled: isCashier })
  const { data: orders } = useOrders({ enabled: managerish })
  const { data: inquiries } = useInquiries({ enabled: managerish })
  const { data: expenses } = useExpenses([], { enabled: managerish })

  const notes: AppNotification[] = []

  // Raw materials at/below reorder level — owner & staff act on this.
  if (isOwner || isStaff) {
    const low = (materials || []).filter((m) => m.currentQty <= m.reorderLevel)
    if (low.length > 0) {
      notes.push({
        id: 'low-stock',
        severity: 'danger',
        title: t('notifications.lowStockTitle', { count: low.length }),
        description: low.slice(0, 3).map((m) => m.name_en).join(', ') + (low.length > 3 ? '…' : ''),
        path: '/inventory',
      })
    }
  }

  // Produced batches waiting for the manager to confirm into the warehouse.
  if (managerish) {
    const pending = (batches || []).filter((b) => b.status === 'completed' && !b.confirmed)
    if (pending.length > 0) {
      notes.push({
        id: 'pending-production',
        severity: 'warning',
        title: t('notifications.pendingProductionTitle', { count: pending.length }),
        description: pending.slice(0, 3).map((b) => b.productName_en).join(', ') + (pending.length > 3 ? '…' : ''),
        path: '/distribution',
      })
    }

    // Branch cash closes awaiting confirmation of money received.
    const awaiting = (closes || []).filter((c) => c.status === 'submitted')
    if (awaiting.length > 0) {
      notes.push({
        id: 'awaiting-cash',
        severity: 'warning',
        title: t('notifications.awaitingCashTitle', { count: awaiting.length }),
        description: awaiting.slice(0, 3).map((c) => c.branchName).join(', ') + (awaiting.length > 3 ? '…' : ''),
        path: '/cash-close',
      })
    }

    // New online orders from the storefront waiting to be actioned.
    const newOrders = (orders || []).filter((o) => o.status === 'pending')
    if (newOrders.length > 0) {
      notes.push({
        id: 'new-orders',
        severity: 'warning',
        title: t('notifications.newOrdersTitle', { count: newOrders.length }),
        description: newOrders.slice(0, 3).map((o) => o.customerName).join(', ') + (newOrders.length > 3 ? '…' : ''),
        path: '/owner/orders',
      })
    }

    // Unread "Contact Us" messages from customers.
    const newMessages = (inquiries || []).filter((i) => i.status === 'new')
    if (newMessages.length > 0) {
      notes.push({
        id: 'new-messages',
        severity: 'info',
        title: t('notifications.newMessagesTitle', { count: newMessages.length }),
        description: newMessages.slice(0, 3).map((i) => i.name).join(', ') + (newMessages.length > 3 ? '…' : ''),
        path: '/owner/orders',
      })
    }

    // Manager-submitted expenses the owner still has to approve.
    const pendingExpenses = (expenses || []).filter((e) => e.status === 'pending')
    if (pendingExpenses.length > 0) {
      notes.push({
        id: 'pending-expenses',
        severity: 'warning',
        title: t('notifications.pendingExpensesTitle', { count: pendingExpenses.length }),
        description: pendingExpenses.slice(0, 3).map((e) => e.description).join(', ') + (pendingExpenses.length > 3 ? '…' : ''),
        path: '/finance',
      })
    }
  }

  if (isCashier && branchId) {
    // Nothing left to sell at this branch.
    const inStock = (branchStock || []).filter((s) => s.qty > 0)
    if (inStock.length === 0) {
      notes.push({
        id: 'branch-empty',
        severity: 'danger',
        title: t('notifications.branchEmptyTitle'),
        description: t('notifications.branchEmptyDesc'),
        path: '/pos',
      })
    }

    // Sold today but haven't closed the day yet.
    const today = new Date().toISOString().split('T')[0]
    const todaySales = filterSalesByRange(sales, today, today)
      .filter((s) => s.branchId === branchId && s.status !== 'voided')
    const closedToday = (closes || []).some((c) => c.branchId === branchId && c.date === today)
    if (todaySales.length > 0 && !closedToday) {
      notes.push({
        id: 'day-not-closed',
        severity: 'info',
        title: t('notifications.dayNotClosedTitle'),
        description: t('notifications.dayNotClosedDesc', { count: todaySales.length }),
        path: '/cash-close',
      })
    }
  }

  return notes
}
