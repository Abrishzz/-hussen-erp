import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSales, useUsers } from '@/hooks/useData'
import { filterSalesByRange, staffPerformance } from '@/lib/analytics'
import { exportStaffReportPDF } from '@/lib/reports'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StaffPerformanceView } from '@/features/reports/StaffPerformanceView'
import { formatCurrency } from '@/lib/utils'
import { Download, Users as UsersIcon, Trophy } from 'lucide-react'

export default function StaffReport() {
  return <ErrorBoundary><StaffReportContent /></ErrorBoundary>
}

function StaffReportContent() {
  const { t, i18n } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const { data: sales, isLoading } = useSales()
  const { data: users } = useUsers()

  const filtered = filterSalesByRange(sales, from, to)
  const rows = staffPerformance(filtered, users)

  const totalRevenue = filtered.reduce((s, x) => s + x.total, 0)
  const totalOrders = filtered.length
  const topPerformer = rows[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UsersIcon className="h-6 w-6 text-primary" /> {t('staffReport.title')}
          </h1>
          <p className="text-muted-foreground">{t('staffReport.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
          <span className="text-muted-foreground">{t('reports.to')}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
          <Button size="sm" variant="outline" disabled={rows.length === 0}
            onClick={() => exportStaffReportPDF(rows, from, to, i18n.language)}>
            <Download className="mr-1 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('finance.revenue')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('pos.orderCount')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalOrders}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-1 text-sm font-medium text-muted-foreground"><Trophy className="h-4 w-4 text-amber-500" /> {t('staffReport.topPerformer')}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{topPerformer ? topPerformer.name : '—'}</div>
            {topPerformer && <p className="text-xs text-muted-foreground">{formatCurrency(topPerformer.revenue)} · {topPerformer.orders} {t('pos.orderCount')}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('staffReport.performance')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading
            ? <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
            : <StaffPerformanceView sales={filtered} users={users} />}
        </CardContent>
      </Card>
    </div>
  )
}
