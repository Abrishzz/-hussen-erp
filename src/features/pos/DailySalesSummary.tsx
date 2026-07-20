import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTodaySales } from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'

export function DailySalesSummary() {
  const { t } = useTranslation()
  const { role, branchId } = useAuthStore()
  const { data: allSales, isLoading } = useTodaySales()

  // A cashier only ever sees their own branch's numbers here — never the
  // company-wide total. Owner/manager (unscoped) still see everything.
  const sales = useMemo(() => {
    if (role !== 'cashier') return allSales
    if (!branchId) return []
    return (allSales || []).filter((s) => s.branchId === branchId)
  }, [allSales, role, branchId])

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  const totalSales = sales?.reduce((s, x) => s + x.total, 0) || 0
  const orderCount = sales?.length || 0

  // Top selling
  const productCounts: Record<string, { name: string; qty: number }> = {}
  sales?.forEach((s) => {
    s.items.forEach((item) => {
      if (!productCounts[item.productId]) {
        productCounts[item.productId] = { name: item.name_en, qty: 0 }
      }
      productCounts[item.productId].qty += item.quantity
    })
  })
  const topItems = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-500" />
              {t('pos.totalSales')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              {t('pos.orderCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orderCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              {t('pos.topSelling')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="truncate">{item.name}</span>
                  <span className="font-medium">{item.qty}</span>
                </div>
              ))}
              {topItems.length === 0 && (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
