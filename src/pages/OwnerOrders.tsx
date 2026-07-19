import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useOrders, useUpdateOrderStatus } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'
import { toDate } from '@/lib/timestamp'
import {
  Clock,
  CheckCircle2,
  Package,
  Filter,
  Search,
  Eye,
  X,
  Truck,
  DollarSign,
  ShoppingCart,
  Loader2,
  Receipt,
  Copy,
} from 'lucide-react'
import type { Order } from '@/types'

const STATUSES: Order['status'][] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']

const statusConfig: Record<Order['status'], { icon: React.ElementType; variant: 'secondary' | 'outline' | 'default' }> = {
  pending: { icon: Clock, variant: 'secondary' },
  confirmed: { icon: CheckCircle2, variant: 'outline' },
  preparing: { icon: Package, variant: 'secondary' },
  ready: { icon: CheckCircle2, variant: 'default' },
  delivered: { icon: Truck, variant: 'default' },
  cancelled: { icon: X, variant: 'outline' },
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardContent className="pt-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/15">
          <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.7rem]">{value}</p>
      </CardContent>
    </Card>
  )
}

function formatWhen(order: Order): string {
  const d = toDate(order.createdAt)
  if (!d) return ''
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OwnerOrders() {
  return <ErrorBoundary><OwnerOrdersContent /></ErrorBoundary>
}

function OwnerOrdersContent() {
  const { t, i18n } = useTranslation()
  const { data: orders, isLoading, error } = useOrders()
  const updateStatus = useUpdateOrderStatus()
  const { show } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Order['status'] | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isAm = i18n.language?.startsWith('am')
  const nameOf = (x: { name_en: string; name_am: string }) => (isAm ? x.name_am || x.name_en : x.name_en)
  const subNameOf = (x: { name_en: string; name_am: string }) => (isAm ? x.name_en : x.name_am)
  const statusLabel = (s: Order['status']) => t(`orders.status.${s}`)
  const methodLabel = (m: Order['paymentMethod']) =>
    m === 'telebirr' ? t('pos.telebirr') : m === 'bank' ? t('pos.bankTransfer') : t('pos.cash')

  // Resolve the selected order from live data so status changes reflect instantly.
  const selectedOrder = useMemo(
    () => (orders ?? []).find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  )

  const filteredOrders = useMemo(() => {
    return (orders ?? []).filter((order) => {
      const q = searchTerm.toLowerCase()
      const matchesSearch = !q
        || order.customerName.toLowerCase().includes(q)
        || (order.customerEmail ?? '').toLowerCase().includes(q)
        || order.customerPhone.includes(searchTerm)
        || (order.transactionRef ?? '').toLowerCase().includes(q)
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, filterStatus])

  const stats = useMemo(() => ({
    total: orders?.length ?? 0,
    pending: orders?.filter((o) => o.status === 'pending').length ?? 0,
    ready: orders?.filter((o) => o.status === 'ready').length ?? 0,
    revenue: orders?.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.total, 0) ?? 0,
  }), [orders])

  const setOrderStatus = (id: string, status: Order['status']) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => show(t('orders.statusUpdated', { status: statusLabel(status) }), 'success'),
      onError: () => show(t('orders.updateFailed'), 'destructive'),
    })
  }

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    show(t('orders.refCopied', { ref }), 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">{t('orders.title')}</h1>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingCart} label={t('orders.totalOrders')} value={stats.total} />
        <StatCard icon={Clock} label={t('orders.pending')} value={stats.pending} />
        <StatCard icon={CheckCircle2} label={t('orders.readyForDelivery')} value={stats.ready} />
        <StatCard icon={DollarSign} label={t('orders.deliveredRevenue')} value={formatCurrency(stats.revenue)} />
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('orders.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                {t('common.all')}
              </Button>
              {STATUSES.map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {statusLabel(status)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      <div className="space-y-3">
        {error ? (
          <Card><CardContent className="py-12 text-center text-destructive">{t('orders.loadFailed')}: {error.message}</CardContent></Card>
        ) : !isLoading && filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {orders?.length === 0 ? t('orders.noOrdersYet') : t('orders.noMatch')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon = statusConfig[order.status].icon
            return (
              <Card
                key={order.id}
                className="cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setSelectedId(order.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">#{order.id.slice(0, 6).toUpperCase()}</h3>
                        <Badge variant={statusConfig[order.status].variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusLabel(order.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatWhen(order)}</span>
                      </div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {order.items.slice(0, 3).map((item) => (
                          <span key={item.productId} className={`text-xs ${isAm ? 'font-ethiopic' : ''}`}>
                            {nameOf(item)} ×{item.quantity}
                          </span>
                        ))}
                        {order.items.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{order.items.length - 3}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t('orders.total')}</p>
                        <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {methodLabel(order.paymentMethod)}
                          {order.transactionRef && (
                            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono">{order.transactionRef}</span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(order.id) }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Details Dialog */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedId(null)}
        >
          <Card className="max-h-[92vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b px-6 py-5 sm:px-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold sm:text-2xl">#{selectedOrder.id.slice(0, 6).toUpperCase()}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedOrder.customerName} · {formatWhen(selectedOrder)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <CardContent className="space-y-6 py-6">
              {/* Payment verification — the key panel for telebirr/bank orders */}
              {selectedOrder.paymentMethod !== 'cash' ? (
                <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-semibold">{t('orders.paymentConfirmation')} — {methodLabel(selectedOrder.paymentMethod)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('orders.customerTxn')}</span>
                    {selectedOrder.transactionRef ? (
                      <>
                        <code className="rounded bg-background px-2 py-1 font-mono text-sm font-bold">{selectedOrder.transactionRef}</code>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyRef(selectedOrder.transactionRef!)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-destructive">{t('orders.notProvided')}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('orders.verifyHint', {
                      method: methodLabel(selectedOrder.paymentMethod),
                      amount: formatCurrency(selectedOrder.total),
                    })}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-semibold">💵 {t('orders.cashOnDelivery')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('orders.collectHint', { amount: formatCurrency(selectedOrder.total) })}</p>
                </div>
              )}

              {/* Customer Info */}
              <div>
                <p className="mb-3 text-sm font-semibold">{t('orders.customerInfo')}</p>
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.phone')}</p>
                    <p className="text-sm font-medium">{selectedOrder.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.email')}</p>
                    <p className="text-sm font-medium">{selectedOrder.customerEmail || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{t('orders.deliveryAddress')}</p>
                    <p className="text-sm font-medium">{selectedOrder.deliveryAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders.deliveryDate')}</p>
                    <p className="text-sm font-medium">{selectedOrder.deliveryDate || t('orders.asap')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orders.deliveryTime')}</p>
                    <p className="text-sm font-medium">{selectedOrder.deliveryTime || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="mb-3 text-sm font-semibold">{t('orders.orderItems')}</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                        <div>
                          <p className={`text-sm font-medium ${isAm ? 'font-ethiopic' : ''}`}>{nameOf(item)}</p>
                          <p className={`text-xs text-muted-foreground ${isAm ? '' : 'font-ethiopic'}`}>{subNameOf(item)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{item.quantity} × {formatCurrency(item.price)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('common.subtotal')}</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.discount')}</span>
                    <span className="font-medium">-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">{t('common.total')}</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{t('orders.specialInstructions')}</p>
                  <p className="mt-1 text-sm">{selectedOrder.notes}</p>
                </div>
              )}
            </CardContent>

            {/* Status Actions */}
            <div className="border-t px-6 py-5 sm:px-8">
              <p className="mb-3 text-xs text-muted-foreground">{t('orders.updateStatus')}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {STATUSES.map((status) => {
                  const Icon = statusConfig[status].icon
                  return (
                    <Button
                      key={status}
                      variant={selectedOrder.status === status ? 'default' : 'outline'}
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => setOrderStatus(selectedOrder.id, status)}
                      className="flex items-center gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {statusLabel(status)}
                    </Button>
                  )
                })}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
