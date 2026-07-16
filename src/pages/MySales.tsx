import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSales } from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { filterSalesByRange, toDate, paymentBreakdown } from '@/lib/analytics'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Receipt } from 'lucide-react'

export default function MySales() {
  return <ErrorBoundary><MySalesContent /></ErrorBoundary>
}

function MySalesContent() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const today = new Date().toISOString().split('T')[0]
  const [day, setDay] = useState(today)

  const { data: sales, isLoading } = useSales()

  // My completed sales for the selected day, newest first.
  const mine = filterSalesByRange(sales, day, day)
    .filter((s) => s.cashierId === user?.uid && s.status !== 'voided')
    .sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())

  const total = mine.reduce((s, x) => s + x.total, 0)
  const count = mine.length
  const avg = count ? Math.round(total / count) : 0
  const itemsSold = mine.reduce((s, x) => s + x.items.reduce((n, it) => n + it.quantity, 0), 0)
  const byPayment = paymentBreakdown(mine)

  const payLabel = (m: string) =>
    m === 'cash' ? t('pos.cash') : m === 'telebirr' ? t('pos.telebirr') : t('pos.bankTransfer')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Receipt className="h-6 w-6 text-primary" /> {t('mySales.title')}
          </h1>
          <p className="text-muted-foreground">{t('mySales.subtitle')}</p>
        </div>
        <Input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className="w-40" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('mySales.mySalesTotal')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(total)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('pos.orderCount')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('common.average')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(avg)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('staffReport.itemsSold')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{itemsSold}</div></CardContent>
        </Card>
      </div>

      {byPayment.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byPayment.map((p) => (
            <span key={p.method} className="rounded-full border px-3 py-1 text-sm">
              {payLabel(p.method)}: <span className="font-semibold">{formatCurrency(p.total)}</span>
            </span>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{t('mySales.transactions')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : mine.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.time')}</TableHead>
                    <TableHead>{t('pos.customerName')}</TableHead>
                    <TableHead className="text-right">{t('common.quantity')}</TableHead>
                    <TableHead>{t('pos.payment')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mine.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{toDate(s.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{s.customerName || '—'}</TableCell>
                      <TableCell className="text-right">{s.items.reduce((n, it) => n + it.quantity, 0)}</TableCell>
                      <TableCell>{payLabel(s.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
