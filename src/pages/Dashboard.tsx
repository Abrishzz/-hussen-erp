import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useNavigate } from 'react-router-dom'
import { useTodaySales, useRawMaterials, useProductionBatches } from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign, ShoppingCart, AlertTriangle, Factory, TrendingUp, ArrowRight, Package,
} from 'lucide-react'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: sales, isLoading: salesLoading } = useTodaySales()
  const { data: materials } = useRawMaterials()
  const { data: batches } = useProductionBatches()

  const todaySalesTotal = sales?.reduce((s, x) => s + x.total, 0) || 0
  const todaySalesCount = sales?.length || 0

  const lowStockCount = materials?.filter((m) => m.currentQty <= m.reorderLevel).length || 0
  const todayBatches = batches?.filter((b) => {
    const d = b.date?.toDate?.() || new Date(b.date as unknown as string)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }) || []

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('app.tagline')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.todaySales')}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesLoading ? '...' : formatCurrency(todaySalesTotal)}</div>
              <p className="text-xs text-muted-foreground">{todaySalesCount} {t('pos.orderCount')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.todayOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySalesCount}</div>
              <p className="text-xs text-muted-foreground">{t('pos.orderCount')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.lowStockAlerts')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
              <p className="text-xs text-muted-foreground">{t('inventory.lowStockAlert')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.productionToday')}</CardTitle>
              <Factory className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayBatches.length}</div>
              <p className="text-xs text-muted-foreground">{t('production.productionBatches')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.topSelling')}</CardTitle>
            </CardHeader>
            <CardContent>
              {sales && sales.length > 0 ? (
                <div className="space-y-2">
                  {(() => {
                    const counts: Record<string, { name: string; qty: number }> = {}
                    sales.forEach((s) => s.items.forEach((i) => {
                      if (!counts[i.productId]) counts[i.productId] = { name: i.name_en, qty: 0 }
                      counts[i.productId].qty += i.quantity
                    }))
                    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="flex-1 text-sm">{item.name}</span>
                        <span className="text-sm font-medium">{item.qty}</span>
                      </div>
                    ))
                  })()}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  {t('reports.noData')}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.productionToday')}</CardTitle>
            </CardHeader>
            <CardContent>
              {todayBatches.length > 0 ? (
                <div className="space-y-2">
                  {todayBatches.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span>{b.productName_en}</span>
                      <span className="text-muted-foreground">{b.actualQty}/{b.plannedQty}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  {t('reports.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              <Package className="mr-2 h-4 w-4" />
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
    </ErrorBoundary>
  )
}
