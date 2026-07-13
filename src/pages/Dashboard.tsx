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
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCollection, orderBy } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/utils'
import type { Sale, RawMaterial, ProductionBatch, Expense } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate: unknown }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate()
  }
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000)
  }
  return new Date()
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const navigate = useNavigate()

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>('sales', [
    orderBy('timestamp', 'desc'),
  ])
  const { data: materials } = useCollection<RawMaterial>('rawMaterials')
  const { data: batches } = useCollection<ProductionBatch>('productionBatches')
  const { data: expenses } = useCollection<Expense>('expenses')

  const now = new Date()

  const stats = useMemo(() => {
    const completed = (sales ?? []).filter((s) => s.status === 'completed')
    const todaySales = completed.filter((s) => isSameDay(tsToDate(s.timestamp), now))
    const todayTotal = todaySales.reduce((sum, s) => sum + (s.total || 0), 0)

    const lowStock = (materials ?? []).filter((m) => m.currentQty <= m.reorderLevel)

    const todayBatches = (batches ?? []).filter((b) => isSameDay(tsToDate(b.date), now))
    const completedBatches = todayBatches.filter((b) => b.status === 'completed')

    return {
      todayTotal,
      todayOrders: todaySales.length,
      lowStockCount: lowStock.length,
      batchesPlanned: todayBatches.length,
      batchesDone: completedBatches.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, materials, batches])

  // Top 5 selling products this month (by quantity).
  const topSelling = useMemo(() => {
    const counts = new Map<string, { name: string; qty: number }>()
    for (const s of sales ?? []) {
      if (s.status !== 'completed') continue
      const d = tsToDate(s.timestamp)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
      for (const item of s.items || []) {
        const name = isAm ? item.name_am || item.name_en : item.name_en
        const entry = counts.get(item.productId) ?? { name, qty: 0 }
        entry.qty += item.quantity
        counts.set(item.productId, entry)
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, isAm])

  // Daily net revenue trend this month (revenue - expenses).
  const trend = useMemo(() => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const arr = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      value: 0,
    }))
    for (const s of sales ?? []) {
      if (s.status !== 'completed') continue
      const d = tsToDate(s.timestamp)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
      arr[d.getDate() - 1].value += (s.total || 0) / 100
    }
    for (const e of expenses ?? []) {
      const d = tsToDate(e.date)
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) continue
      arr[d.getDate() - 1].value -= (e.amount || 0) / 100
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, expenses])

  const monthNet = trend.reduce((s, d) => s + d.value, 0)

  const kpis = [
    {
      title: t('dashboard.todaySales'),
      value: formatCurrency(stats.todayTotal),
      sub: `${stats.todayOrders} ${t('pos.orderCount')}`,
      icon: DollarSign,
    },
    {
      title: t('dashboard.todayOrders'),
      value: String(stats.todayOrders),
      sub: t('pos.orderCount'),
      icon: ShoppingCart,
    },
    {
      title: t('dashboard.lowStockAlerts'),
      value: String(stats.lowStockCount),
      sub: t('inventory.lowStockAlert'),
      icon: AlertTriangle,
      danger: stats.lowStockCount > 0,
    },
    {
      title: t('dashboard.productionToday'),
      value: `${stats.batchesDone}/${stats.batchesPlanned}`,
      sub: t('production.productionBatches'),
      icon: Factory,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('app.tagline')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{k.title}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className={`text-2xl font-bold ${k.danger ? 'text-destructive' : ''}`}>
                  {k.value}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.topSelling')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {topSelling.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Croissant className="mr-2 h-6 w-6" />
                {t('reports.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSelling} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 12 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)' }}
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Bar dataKey="qty" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.netProfit')}</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <div className="mb-1 text-sm text-muted-foreground">
              {t('common.thisMonth')}: <span className="font-semibold text-foreground">{formatCurrency(Math.round(monthNet * 100))}</span>
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={trend} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--popover-foreground)',
                  }}
                  formatter={(value) => [`ETB ${Number(value).toFixed(2)}`, t('finance.revenue')]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
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
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t('dashboard.addStock')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/production')}>
            <Factory className="mr-2 h-4 w-4" />
            {t('dashboard.newBatch')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/finance')}>
            <DollarSign className="mr-2 h-4 w-4" />
            {t('dashboard.addExpense')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
