import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  useTodaySales, useRawMaterials, useProductionBatches, useSales, useUsers, useActiveBranches,
  useExpenses, useOrders, useInquiries,
} from '@/hooks/useData'
import { cn, formatCurrency } from '@/lib/utils'
import {
  filterSalesByRange, salesByDay, paymentBreakdown, branchPerformance, toDate,
  approvedExpensesOn,
} from '@/lib/analytics'
import { StaffPerformanceView } from '@/features/reports/StaffPerformanceView'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart as RePieChart, Pie,
} from 'recharts'
import {
  DollarSign, ShoppingCart, AlertTriangle, Factory, TrendingUp, TrendingDown,
  Package, BarChart3, Trophy, Building2, ClipboardList, MessageSquare,
} from 'lucide-react'

const PAY_COLORS: Record<string, string> = {
  cash: '#22c55e', telebirr: '#0ea5e9', bank: '#8b5cf6',
}

type Chip = 'emerald' | 'blue' | 'amber' | 'violet'
const CHIP: Record<Chip, string> = {
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
}

function StatCard({
  chip, icon: Icon, label, value, sub, trend,
}: {
  chip: Chip
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  trend?: { up: boolean; text: string }
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', CHIP[chip])}>
          <Icon className="h-5 w-5" />
        </span>
        {trend && (
          <span className={cn(
            'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
            trend.up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
          )}>
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.text}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.7rem]">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  return <ErrorBoundary><DashboardContent /></ErrorBoundary>
}

function DashboardContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: sales } = useTodaySales()
  const { data: materials } = useRawMaterials()
  const { data: batches } = useProductionBatches()
  const { data: allSales } = useSales()
  const { data: users } = useUsers()
  const { data: branches } = useActiveBranches()
  const { data: expenses } = useExpenses()
  const { data: orders } = useOrders()
  const { data: inquiries } = useInquiries()

  // Newest first already; just take the head for the dashboard cards.
  const recentOrders = (orders || []).slice(0, 5)
  const recentInquiries = (inquiries || []).slice(0, 5)

  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(sevenDaysAgo)
  const [to, setTo] = useState(today)

  const todaySalesTotal = sales?.reduce((s, x) => s + x.total, 0) || 0
  const todaySalesCount = sales?.length || 0
  // Approved expenses come straight off the day's takings.
  const deductedToday = approvedExpensesOn(expenses, today)
  const todayNetSales = todaySalesTotal - deductedToday
  const lowStockCount = materials?.filter((m) => m.currentQty <= m.reorderLevel).length || 0
  const todayBatches = batches?.filter((b) => toDate(b.date).toDateString() === new Date().toDateString()) || []

  // ─── This month vs last month (drives the gradient hero) ───
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const sumBetween = (a: Date, b: Date) =>
    (allSales || []).filter((s) => { const d = toDate(s.timestamp); return d >= a && d <= b })
      .reduce((sum, s) => sum + s.total, 0)
  const monthRevenue = sumBetween(monthStart, now)
  const lastMonthRevenue = sumBetween(lastStart, lastEnd)
  const target = lastMonthRevenue > 0 ? lastMonthRevenue : 10_000_000 // ETB 100k default
  const targetPct = Math.min(100, Math.round((monthRevenue / target) * 100))
  const momDelta = lastMonthRevenue > 0
    ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null

  // ─── Ranged sales analysis ───
  const rangedSales = filterSalesByRange(allSales, from, to)
  const rangeRevenue = rangedSales.reduce((s, x) => s + x.total, 0)
  const rangeOrders = rangedSales.length
  const rangeAvg = rangeOrders ? Math.round(rangeRevenue / rangeOrders) : 0
  const dayData = salesByDay(rangedSales).map((d) => ({ date: d.date.slice(5), total: d.total / 100 }))
  const payData = paymentBreakdown(rangedSales).map((p) => ({ name: p.method, value: p.total / 100 }))

  const todayByBranch = branchPerformance(sales || [], branches, t('branches.unassigned'))

  const topSelling = (() => {
    const counts: Record<string, { name: string; qty: number }> = {}
      ; (sales || []).forEach((s) => s.items.forEach((i) => {
        if (!counts[i.productId]) counts[i.productId] = { name: i.name_en, qty: 0 }
        counts[i.productId].qty += i.quantity
      }))
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5)
  })()

  const hour = now.getHours()
  const greet = hour < 12 ? t('dashboard.morning') : hour < 18 ? t('dashboard.afternoon') : t('dashboard.evening')
  const firstName = (user?.displayName || '').split(' ')[0] || ''

  const actions = [
    { label: t('dashboard.newSale'), icon: ShoppingCart, to: '/pos', primary: true },
    { label: t('dashboard.addStock'), icon: Package, to: '/inventory' },
    { label: t('dashboard.newBatch'), icon: Factory, to: '/production' },
    { label: t('staffReport.title'), icon: BarChart3, to: '/staff-report' },
  ]

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greet}{firstName ? `, ${firstName}` : ''} <span className="align-middle">👋</span>
          </h1>
          <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-card">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[8.5rem] border-0 shadow-none" />
          <span className="text-sm text-muted-foreground">{t('reports.to')}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[8.5rem] border-0 shadow-none" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard chip="emerald" icon={DollarSign} label={t('dashboard.todaySales')}
          value={formatCurrency(todayNetSales)}
          sub={deductedToday > 0
            ? `${formatCurrency(todaySalesTotal)} − ${formatCurrency(deductedToday)} ${t('finance.expenses').toLowerCase()}`
            : `${todaySalesCount} ${t('pos.orderCount')}`} />
        <StatCard chip="blue" icon={ShoppingCart} label={t('dashboard.todayOrders')}
          value={todaySalesCount} sub={t('pos.orderCount')} />
        <StatCard chip="amber" icon={AlertTriangle} label={t('dashboard.lowStockAlerts')}
          value={lowStockCount} sub={t('inventory.lowStockAlert')} />
        <StatCard chip="violet" icon={Factory} label={t('dashboard.productionToday')}
          value={todayBatches.length} sub={t('production.productionBatches')} />
      </div>

      {/* Revenue overview + monthly target */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue overview (range) with capsule bar chart */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.revenueOverview')}</CardTitle>
              <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{formatCurrency(rangeRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                {rangeOrders} {t('pos.orderCount')} · {t('common.average')} {formatCurrency(rangeAvg)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button
                  key={a.to}
                  onClick={() => navigate(a.to)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                    a.primary
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-muted text-foreground hover:bg-accent'
                  )}
                >
                  <a.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{a.label}</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {dayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dayData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a5b4fc" />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', radius: 10 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--card-foreground)', boxShadow: 'var(--shadow-card)' }}
                    formatter={(v: unknown) => [`ETB ${Number(v).toFixed(2)}`, t('finance.revenue')]}
                  />
                  <Bar dataKey="total" fill="url(#barGrad)" radius={[10, 10, 10, 10]} maxBarSize={44} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-muted-foreground">{t('reports.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly target — gradient hero */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-6 text-white shadow-card">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-fuchsia-400/20 blur-3xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Trophy className="h-5 w-5" />
              </span>
              {momDelta !== null && (
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  {momDelta >= 0 ? '+' : ''}{momDelta}% {t('dashboard.vsLastMonth')}
                </span>
              )}
            </div>
            <p className="mt-5 text-sm text-white/70">{t('dashboard.monthlyTarget')}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">
              {formatCurrency(monthRevenue)}
              <span className="ml-1 text-base font-medium text-white/60">/ {formatCurrency(target)}</span>
            </p>
          </div>

          <div className="relative mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
              <span>{targetPct}%</span>
              <span className="text-white/60">{100 - targetPct}% {t('dashboard.toGo')}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-lime-300 transition-all" style={{ width: `${targetPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Payment breakdown + top selling */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.paymentBreakdown')}</CardTitle></CardHeader>
          <CardContent>
            {payData.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <RePieChart>
                    <Pie data={payData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                      {payData.map((p) => <Cell key={p.name} fill={PAY_COLORS[p.name] || '#94a3b8'} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--card-foreground)' }}
                      formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`}
                    />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground">{t('common.total')}</span>
                  <span className="text-lg font-bold">{formatCurrency(rangeRevenue)}</span>
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
            )}
            <div className="mt-3 space-y-1.5">
              {payData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 capitalize">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PAY_COLORS[p.name] || '#94a3b8' }} />
                    {t(`pos.${p.name === 'bank' ? 'bankTransfer' : p.name}`)}
                  </span>
                  <span className="font-medium tabular-nums">ETB {p.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">{t('dashboard.topSelling')}</CardTitle></CardHeader>
          <CardContent>
            {topSelling.length > 0 ? (
              <div className="space-y-1">
                {topSelling.map((item, idx) => {
                  const pct = topSelling[0].qty > 0 ? (item.qty / topSelling[0].qty) * 100 : 0
                  return (
                    <div key={idx} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/50">
                      <span className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                        idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                      )}>{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium">{item.name}</span>
                          <span className="ml-2 shrink-0 text-sm font-semibold tabular-nums">{item.qty}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="h-6 w-6" />
                {t('reports.noData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales by branch */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" /> {t('dashboard.salesByBranch')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayByBranch.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="space-y-2">
              {todayByBranch.map((b) => {
                const pct = todaySalesTotal > 0 ? (b.revenue / todaySalesTotal) * 100 : 0
                return (
                  <div key={b.branchId} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium">{b.name}</span>
                        <span className="ml-2 shrink-0 text-sm font-bold tabular-nums">{formatCurrency(b.revenue)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-lime-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {b.orders} {t('pos.orderCount')} · {b.itemsSold} {t('staffReport.itemsSold')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent online orders + customer messages */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" /> {t('dashboard.recentOrders')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/owner/orders')}>
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t('orders.noOrdersYet')}</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate('/owner/orders')}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ClipboardList className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{o.customerName}</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums">{formatCurrency(o.total)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant={o.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                          {t(`orders.status.${o.status}`)}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {o.items?.length ?? 0} × {t('pos.items')}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> {t('orders.inquiries')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/owner/orders')}>
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent>
            {recentInquiries.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t('orders.noInquiries')}</p>
            ) : (
              <div className="space-y-2">
                {recentInquiries.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => navigate('/owner/orders')}
                    className="flex w-full items-start gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{i.name}</span>
                        {i.status === 'new' && <Badge>{t('orders.inquiryNew')}</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.message}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff performance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t('staffReport.performance')}</CardTitle></CardHeader>
        <CardContent>
          <StaffPerformanceView sales={rangedSales} users={users} compact />
        </CardContent>
      </Card>
    </div>
  )
}
