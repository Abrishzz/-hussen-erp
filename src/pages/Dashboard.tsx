import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Factory,
  ArrowRight,
  Croissant,
  TrendingUp,
  TrendingDown,
  Plus,
  PackagePlus,
  Receipt,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCollection, orderBy } from '@/hooks/useFirestore'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import type { Sale, RawMaterial, ProductionBatch } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: unknown }).toDate === 'function')
    return (ts as { toDate: () => Date }).toDate()
  if (ts && typeof ts === 'object' && 'seconds' in ts) return new Date((ts as { seconds: number }).seconds * 1000)
  return new Date()
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PAY_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-5)']

function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  danger,
}: {
  label: string
  value: string
  sub: string
  delta?: number
  icon: React.ElementType
  danger?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${
            danger ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <div className="flex items-center gap-1 text-xs">
            {delta !== undefined ? (
              <span className={`flex items-center gap-0.5 font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            ) : null}
            <span className="truncate text-muted-foreground">{sub}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const name = user?.displayName || user?.email?.split('@')[0] || 'there'

  const { data: sales } = useCollection<Sale>('sales', [orderBy('timestamp', 'desc')])
  const { data: materials } = useCollection<RawMaterial>('rawMaterials')
  const { data: batches } = useCollection<ProductionBatch>('productionBatches')

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const stats = useMemo(() => {
    const completed = (sales ?? []).filter((s) => s.status === 'completed')
    const today = completed.filter((s) => sameDay(tsToDate(s.timestamp), now))
    const yday = completed.filter((s) => sameDay(tsToDate(s.timestamp), yesterday))
    const todayTotal = today.reduce((s, x) => s + (x.total || 0), 0)
    const ydayTotal = yday.reduce((s, x) => s + (x.total || 0), 0)
    const salesDelta = ydayTotal > 0 ? ((todayTotal - ydayTotal) / ydayTotal) * 100 : undefined
    const ordersDelta = yday.length > 0 ? ((today.length - yday.length) / yday.length) * 100 : undefined
    const lowStock = (materials ?? []).filter((m) => m.currentQty <= m.reorderLevel)
    const todayBatches = (batches ?? []).filter((b) => sameDay(tsToDate(b.date), now))
    return {
      todayTotal,
      todayOrders: today.length,
      salesDelta,
      ordersDelta,
      lowStock,
      batchesPlanned: todayBatches.length,
      batchesDone: todayBatches.filter((b) => b.status === 'completed').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, materials, batches])

  // Revenue by month (current year) for the bar chart.
  const monthly = useMemo(() => {
    const arr = MONTHS.map((m) => ({ month: m, revenue: 0 }))
    for (const s of sales ?? []) {
      if (s.status !== 'completed') continue
      const d = tsToDate(s.timestamp)
      if (d.getFullYear() !== now.getFullYear()) continue
      arr[d.getMonth()].revenue += (s.total || 0) / 100
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales])

  // Payment method split (this month) for the donut.
  const payment = useMemo(() => {
    const map: Record<string, number> = { cash: 0, telebirr: 0, bank: 0 }
    for (const s of sales ?? []) {
      if (s.status !== 'completed') continue
      const d = tsToDate(s.timestamp)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
      map[s.paymentMethod] = (map[s.paymentMethod] || 0) + (s.total || 0) / 100
    }
    const data = [
      { name: t('pos.cash'), value: map.cash },
      { name: t('pos.telebirr'), value: map.telebirr },
      { name: t('pos.bankTransfer'), value: map.bank },
    ].filter((d) => d.value > 0)
    const total = data.reduce((s, d) => s + d.value, 0)
    return { data, total }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, i18n.language])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const s of sales ?? []) {
      if (s.status !== 'completed') continue
      for (const it of s.items || []) {
        const nm = isAm ? it.name_am || it.name_en : it.name_en
        const e = map.get(it.productId) ?? { name: nm, qty: 0, revenue: 0 }
        e.qty += it.quantity
        e.revenue += it.total
        map.set(it.productId, e)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, isAm])

  const tooltipStyle = {
    background: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    color: 'var(--popover-foreground)',
    fontSize: 12,
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard.title')} · <span className="text-primary">{name}</span>
        </h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t('dashboard.todaySales')} value={formatCurrency(stats.todayTotal)} sub={t('common.today')} delta={stats.salesDelta} icon={DollarSign} />
        <KpiCard label={t('dashboard.todayOrders')} value={String(stats.todayOrders)} sub={t('pos.orderCount')} delta={stats.ordersDelta} icon={ShoppingCart} />
        <KpiCard label={t('dashboard.lowStockAlerts')} value={String(stats.lowStock.length)} sub={t('inventory.lowStockAlert')} icon={AlertTriangle} danger={stats.lowStock.length > 0} />
        <KpiCard label={t('dashboard.productionToday')} value={`${stats.batchesDone}/${stats.batchesPlanned}`} sub={t('production.productionBatches')} icon={Factory} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('finance.revenue')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('common.thisYear')}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              {formatCurrency(monthly.reduce((s, m) => s + m.revenue, 0) * 100)}
            </span>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" />
                    <stop offset="100%" stopColor="var(--chart-2)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'var(--accent)' }} contentStyle={tooltipStyle} formatter={(value) => [`ETB ${Number(value).toFixed(2)}`, t('finance.revenue')]} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('pos.payment')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('common.thisMonth')}</p>
          </CardHeader>
          <CardContent className="h-72">
            {payment.data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Croissant className="mr-2 h-6 w-6" />
                {t('reports.noData')}
              </div>
            ) : (
              <div className="relative h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={payment.data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">
                      {payment.data.map((_, i) => (
                        <Cell key={i} fill={PAY_COLORS[i % PAY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => `ETB ${Number(value).toFixed(2)}`} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
                  <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                  <p className="text-lg font-bold">{formatCurrency(payment.total * 100)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top products */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.topSelling')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t('reports.noData')}</p>
            ) : (
              topProducts.map((p, i) => {
                const max = topProducts[0].revenue || 1
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        <span className="shrink-0 text-sm text-muted-foreground">{formatCurrency(p.revenue)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(p.revenue / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Today panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('common.today')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStock.length === 0 && stats.batchesPlanned === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('reports.noData')}</p>
            ) : (
              <>
                {stats.lowStock.slice(0, 4).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/30">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{isAm ? m.name_am : m.name_en}</p>
                      <p className="text-xs text-muted-foreground">{m.currentQty} {t(`inventory.unit.${m.unit}`)}</p>
                    </div>
                  </div>
                ))}
                {stats.batchesPlanned > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border bg-secondary/50 p-3">
                    <Factory className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm">{stats.batchesDone}/{stats.batchesPlanned} {t('production.productionBatches')}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/pos')}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {t('dashboard.newSale')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => navigate('/inventory')}>
            <PackagePlus className="mr-2 h-4 w-4" />
            {t('dashboard.addStock')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/production')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newBatch')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/finance')}>
            <Receipt className="mr-2 h-4 w-4" />
            {t('dashboard.addExpense')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
