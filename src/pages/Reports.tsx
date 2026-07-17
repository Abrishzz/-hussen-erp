import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSales, useRawMaterials, useProductionBatches,
  useExpenses, useUsers,
} from '@/hooks/useData'
import { StaffPerformanceView } from '@/features/reports/StaffPerformanceView'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { staffPerformance } from '@/lib/analytics'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  exportSalesReportPDF, exportInventoryReportPDF,
  exportExpenseReportPDF, exportProfitLossPDF, exportStaffReportPDF,
} from '@/lib/reports'

const COLORS = ['#6366f1', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#e67e22', '#1abc9c']

/** A stat tile — the small number blocks at the top of each report. */
function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'good' }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className={
        'text-lg font-bold sm:text-xl ' +
        (tone === 'danger' ? 'text-destructive' : tone === 'good' ? 'text-green-600' : '')
      }>
        {value}
      </p>
    </div>
  )
}

/**
 * One report block. Every report lives on the same scrollable page (rather than
 * behind its own tab), so `id` + scroll-margin lets the jump chips land cleanly
 * below the sticky header.
 */
function Section({
  id, title, action, children,
}: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-36">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PdfButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={onClick}>
      <Download className="mr-1 h-4 w-4" /> PDF
    </Button>
  )
}

export default function Reports() {
  return <ErrorBoundary><ReportsContent /></ErrorBoundary>
}

function ReportsContent() {
  const { t, i18n } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const { data: sales } = useSales()
  const { data: materials } = useRawMaterials()
  const { data: batches } = useProductionBatches()
  const { data: expenses } = useExpenses()
  const { data: users } = useUsers()

  const filteredSales = sales?.filter((s) => {
    const d = s.timestamp?.toDate?.() || new Date(s.timestamp as unknown as string)
    return d >= new Date(from) && d <= new Date(to + 'T23:59:59')
  }) || []

  const filteredExpenses = expenses?.filter((e) => {
    const d = e.date?.toDate?.() || new Date((e.date as unknown as { seconds: number }).seconds * 1000)
    return d >= new Date(from) && d <= new Date(to + 'T23:59:59')
  }) || []

  const revenue = filteredSales.reduce((s, x) => s + x.total, 0)
  const totalExp = filteredExpenses.reduce((s, x) => s + x.amount, 0)
  const grossProfit = revenue
  const netProfit = grossProfit - totalExp

  const salesByDay: Record<string, number> = {}
  filteredSales.forEach((s) => {
    const d = formatDate(s.timestamp)
    salesByDay[d] = (salesByDay[d] || 0) + s.total
  })
  const salesChartData = Object.entries(salesByDay).map(([date, total]) => ({ date, total: total / 100 }))

  const productCounts: Record<string, { name: string; qty: number }> = {}
  filteredSales.forEach((s) => s.items.forEach((i) => {
    if (!productCounts[i.productId]) productCounts[i.productId] = { name: i.name_en, qty: 0 }
    productCounts[i.productId].qty += i.quantity
  }))
  const bestSellerData = Object.values(productCounts)
    .sort((a, b) => b.qty - a.qty).slice(0, 7)
    .map((item) => ({ name: item.name, value: item.qty }))

  const byCategory: Record<string, number> = {}
  filteredExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount })
  const expenseChartData = Object.entries(byCategory).map(([cat, amt]) => ({
    name: t(`finance.categories.${cat}`) || cat,
    value: amt / 100,
  }))

  const staffRows = staffPerformance(filteredSales, users)
  const noData = <p className="py-10 text-center text-muted-foreground">{t('reports.noData')}</p>

  const sections = [
    { id: 'sales', label: t('reports.salesReport') },
    { id: 'staff', label: t('staffReport.performance') },
    { id: 'bestsellers', label: t('reports.bestSellers') },
    { id: 'inventory', label: t('reports.inventoryReport') },
    { id: 'production', label: t('reports.productionReport') },
    { id: 'expenses', label: t('reports.expenseReport') },
    { id: 'profit', label: t('reports.profitLoss') },
  ]

  return (
    <div className="space-y-5">
      {/* Sticky control bar: title, date range and jump-to chips stay reachable
          however far down the (long) page you are. */}
      <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold sm:text-2xl">{t('reports.title')}</h1>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 min-w-0 flex-1 sm:w-36 sm:flex-none" />
            <span className="shrink-0 text-sm text-muted-foreground">{t('reports.to')}</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 min-w-0 flex-1 sm:w-36 sm:flex-none" />
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      {/* ─── Sales ─── */}
      <Section id="sales" title={t('reports.salesReport')}
        action={<PdfButton onClick={() => exportSalesReportPDF(filteredSales, from, to, i18n.language)} />}>
        <div className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Stat label={t('common.total')} value={formatCurrency(revenue)} />
          <Stat label={t('pos.orderCount')} value={filteredSales.length} />
          <Stat label={t('common.average')} value={filteredSales.length ? formatCurrency(Math.round(revenue / filteredSales.length)) : 'ETB 0'} />
        </div>
        {salesChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
              <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : noData}
      </Section>

      {/* ─── Staff performance ─── */}
      <Section id="staff" title={t('staffReport.performance')}
        action={staffRows.length > 0
          ? <PdfButton onClick={() => exportStaffReportPDF(staffRows, from, to, i18n.language)} />
          : undefined}>
        <StaffPerformanceView sales={filteredSales} users={users} />
      </Section>

      {/* ─── Best sellers ─── */}
      <Section id="bestsellers" title={t('reports.bestSellers')}>
        {bestSellerData.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bestSellerData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={260}>
              <RePieChart>
                <Pie data={bestSellerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {bestSellerData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        ) : noData}
      </Section>

      {/* ─── Inventory ─── */}
      <Section id="inventory" title={t('reports.inventoryReport')}
        action={<PdfButton onClick={() => exportInventoryReportPDF(materials || [], i18n.language)} />}>
        <div className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3">
          <Stat label={t('common.total')} value={materials?.length || 0} />
          <Stat label={t('inventory.stockValue')} value={formatCurrency(materials?.reduce((s, m) => s + m.currentQty * m.avgCost, 0) || 0)} />
          <Stat label={t('inventory.lowStockAlert')} tone="danger" value={materials?.filter((m) => m.currentQty <= m.reorderLevel).length || 0} />
        </div>
        {materials && materials.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={materials.map((m) => ({ name: m.name_en, stock: m.currentQty, reorder: m.reorderLevel }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip />
              <Bar dataKey="stock" fill="#27ae60" name="Current Stock" radius={[3, 3, 0, 0]} />
              <Bar dataKey="reorder" fill="#e74c3c" name="Reorder Level" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : noData}
      </Section>

      {/* ─── Production ─── */}
      <Section id="production" title={t('reports.productionReport')}>
        {batches && batches.length > 0 ? (
          <>
            <div className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3">
              <Stat label={t('common.total')} value={batches.length} />
              <Stat label={t('production.plannedQty')} value={batches.reduce((s, b) => s + b.plannedQty, 0)} />
              <Stat label={t('production.actualQty')} value={batches.reduce((s, b) => s + b.actualQty, 0)} />
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={batches.slice(0, 20).map((b) => ({
                name: b.productName_en.substring(0, 12),
                planned: b.plannedQty,
                actual: b.actualQty,
              }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip />
                <Bar dataKey="planned" fill="#f39c12" name="Planned" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" fill="#27ae60" name="Actual" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : noData}
      </Section>

      {/* ─── Expenses ─── */}
      <Section id="expenses" title={t('reports.expenseReport')}
        action={<PdfButton onClick={() => exportExpenseReportPDF(filteredExpenses, from, to, i18n.language)} />}>
        <div className="mb-5 grid gap-3 grid-cols-2">
          <Stat label={t('common.total')} value={formatCurrency(totalExp)} />
          <Stat label={t('common.count')} value={filteredExpenses.length} />
        </div>
        {expenseChartData.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={240}>
              <RePieChart>
                <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {expenseChartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="space-y-2 self-center">
              {expenseChartData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-medium">ETB {item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : noData}
      </Section>

      {/* ─── Profit & loss ─── */}
      <Section id="profit" title={t('reports.profitLoss')}
        action={<PdfButton onClick={() => exportProfitLossPDF(revenue, 0, totalExp, from, to, i18n.language)} />}>
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted-foreground">{t('finance.revenue')}</span>
            <span className="font-medium">{formatCurrency(revenue)}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted-foreground">{t('finance.costOfGoodsSold')}</span>
            <span className="font-medium">{formatCurrency(0)}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-medium">{t('finance.grossProfit')}</span>
            <span className="font-medium text-green-600">{formatCurrency(grossProfit)}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="text-muted-foreground">{t('finance.operatingExpenses')}</span>
            <span className="font-medium text-destructive">{formatCurrency(totalExp)}</span>
          </div>
          <div className="flex justify-between pt-1 text-lg font-bold">
            <span>{t('finance.netProfit')}</span>
            <span className={netProfit >= 0 ? 'text-green-600' : 'text-destructive'}>{formatCurrency(netProfit)}</span>
          </div>
        </div>
        {salesChartData.length > 0 && (
          <div className="mt-8">
            <h4 className="mb-3 text-sm font-medium">{t('dashboard.todaySales')} {t('common.trend')}</h4>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
                <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>
    </div>
  )
}
