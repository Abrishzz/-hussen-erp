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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  exportSalesReportPDF, exportInventoryReportPDF,
  exportExpenseReportPDF, exportProfitLossPDF,
} from '@/lib/reports'


const COLORS = ['#c0392b', '#f39c12', '#27ae60', '#2980b9', '#8e44ad', '#e67e22', '#1abc9c']

export default function Reports() {
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
    const d = e.date?.toDate?.() || new Date((e.date as unknown as {seconds: number}).seconds * 1000)
    return d >= new Date(from) && d <= new Date(to + 'T23:59:59')
  }) || []

  const revenue = filteredSales.reduce((s, x) => s + x.total, 0)
  const totalExp = filteredExpenses.reduce((s, x) => s + x.amount, 0)
  const grossProfit = revenue
  const netProfit = grossProfit - totalExp

  // Sales chart data (by day)
  const salesByDay: Record<string, number> = {}
  filteredSales.forEach((s) => {
    const d = formatDate(s.timestamp)
    salesByDay[d] = (salesByDay[d] || 0) + s.total
  })
  const salesChartData = Object.entries(salesByDay).map(([date, total]) => ({ date, total: total / 100 }))

  // Best sellers
  const productCounts: Record<string, { name: string; qty: number }> = {}
  filteredSales.forEach((s) => s.items.forEach((i) => {
    if (!productCounts[i.productId]) productCounts[i.productId] = { name: i.name_en, qty: 0 }
    productCounts[i.productId].qty += i.quantity
  }))
  const topSellers = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 7)
  const bestSellerData = topSellers.map((item) => ({ name: item.name, value: item.qty }))

  // Expense breakdown
  const byCategory: Record<string, number> = {}
  filteredExpenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })
  const expenseChartData = Object.entries(byCategory).map(([cat, amt]) => ({
    name: t(`finance.categories.${cat}`) || cat,
    value: amt / 100,
  }))

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
            <span className="text-muted-foreground">{t('reports.to')}</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          </div>
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="flex-wrap">
            <TabsTrigger value="sales">{t('reports.salesReport')}</TabsTrigger>
            <TabsTrigger value="inventory">{t('reports.inventoryReport')}</TabsTrigger>
            <TabsTrigger value="production">{t('reports.productionReport')}</TabsTrigger>
            <TabsTrigger value="expenses">{t('reports.expenseReport')}</TabsTrigger>
            <TabsTrigger value="profit">{t('reports.profitLoss')}</TabsTrigger>
            <TabsTrigger value="bestsellers">{t('reports.bestSellers')}</TabsTrigger>
            <TabsTrigger value="staff">{t('staffReport.title')}</TabsTrigger>
          </TabsList>

          {/* ─── Sales Report ─── */}
          <TabsContent value="sales">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('reports.salesReport')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportSalesReportPDF(filteredSales, from, to, i18n.language)}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                    <p className="text-xl font-bold">{formatCurrency(revenue)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('pos.orderCount')}</p>
                    <p className="text-xl font-bold">{filteredSales.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('common.average')}</p>
                    <p className="text-xl font-bold">
                      {filteredSales.length ? formatCurrency(Math.round(revenue / filteredSales.length)) : 'ETB 0'}
                    </p>
                  </div>
                </div>
                {salesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesChartData}>
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
                      <Bar dataKey="total" fill="#c0392b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Inventory Report ─── */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('reports.inventoryReport')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportInventoryReportPDF(materials || [], i18n.language)}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                    <p className="text-xl font-bold">{materials?.length || 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('inventory.stockValue')}</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(materials?.reduce((s, m) => s + m.currentQty * m.avgCost, 0) || 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('inventory.lowStockAlert')}</p>
                    <p className="text-xl font-bold text-destructive">
                      {materials?.filter((m) => m.currentQty <= m.reorderLevel).length || 0}
                    </p>
                  </div>
                </div>
                {materials && materials.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={materials.map((m) => ({ name: m.name_en, stock: m.currentQty, reorder: m.reorderLevel }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="stock" fill="#27ae60" name="Current Stock" />
                      <Bar dataKey="reorder" fill="#e74c3c" name="Reorder Level" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Production Report ─── */}
          <TabsContent value="production">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.productionReport')}</CardTitle>
              </CardHeader>
              <CardContent>
                {batches && batches.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3 mb-4">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                        <p className="text-xl font-bold">{batches.length}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">{t('production.plannedQty')}</p>
                        <p className="text-xl font-bold">{batches.reduce((s, b) => s + b.plannedQty, 0)}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">{t('production.actualQty')}</p>
                        <p className="text-xl font-bold">{batches.reduce((s, b) => s + b.actualQty, 0)}</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={batches.slice(0, 20).map((b) => ({
                        name: b.productName_en.substring(0, 15),
                        planned: b.plannedQty,
                        actual: b.actualQty,
                      }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="planned" fill="#f39c12" name="Planned" />
                        <Bar dataKey="actual" fill="#27ae60" name="Actual" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Expense Report ─── */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('reports.expenseReport')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportExpenseReportPDF(filteredExpenses, from, to, i18n.language)}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 mb-6">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('common.total')}</p>
                    <p className="text-xl font-bold">{formatCurrency(totalExp)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">{t('common.count')}</p>
                    <p className="text-xl font-bold">{filteredExpenses.length}</p>
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {expenseChartData.length > 0 ? (
                    <>
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t('common.breakdown')}</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <RePieChart>
                            <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                              {expenseChartData.map((_, idx) => (
                                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Pie>
                          <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
                        </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {expenseChartData.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              {item.name}
                            </span>
                            <span className="font-medium">ETB {item.value.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="py-12 text-center text-muted-foreground col-span-2">{t('reports.noData')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Profit & Loss ─── */}
          <TabsContent value="profit">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('reports.profitLoss')}</CardTitle>
                <Button size="sm" variant="outline"
                  onClick={() => exportProfitLossPDF(revenue, 0, totalExp, from, to, i18n.language)}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
              </CardHeader>
              <CardContent>
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex justify-between text-sm pb-2 border-b">
                    <span className="text-muted-foreground">{t('finance.revenue')}</span>
                    <span className="font-medium">{formatCurrency(revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm pb-2 border-b">
                    <span className="text-muted-foreground">{t('finance.costOfGoodsSold')}</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm pb-2 border-b">
                    <span className="font-medium">{t('finance.grossProfit')}</span>
                    <span className="font-medium text-green-600">{formatCurrency(grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm pb-2 border-b">
                    <span className="text-muted-foreground">{t('finance.operatingExpenses')}</span>
                    <span className="font-medium text-destructive">{formatCurrency(totalExp)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>{t('finance.netProfit')}</span>
                    <span className={netProfit >= 0 ? 'text-green-600' : 'text-destructive'}>
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
                {salesChartData.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-medium mb-3">{t('dashboard.todaySales')} {t('common.trend')}</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={salesChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
                        <Line type="monotone" dataKey="total" stroke="#c0392b" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Best Sellers ─── */}
          <TabsContent value="bestsellers">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.bestSellers')}</CardTitle>
              </CardHeader>
              <CardContent>
                {bestSellerData.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={bestSellerData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#c0392b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie data={bestSellerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {bestSellerData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Staff Performance ─── */}
          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle>{t('staffReport.performance')}</CardTitle>
              </CardHeader>
              <CardContent>
                <StaffPerformanceView sales={filteredSales} users={users} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
