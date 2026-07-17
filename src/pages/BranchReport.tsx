import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useActiveBranches, useDistributions, useSales, useBranchStock, useCashCloses,
} from '@/hooks/useData'
import { filterSalesByRange, toDate } from '@/lib/analytics'
import { downloadSpreadsheet } from '@/lib/excel'
import { formatCurrency } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Building2, Download } from 'lucide-react'

export default function BranchReport() {
  return <ErrorBoundary><BranchReportContent /></ErrorBoundary>
}

function BranchReportContent() {
  const { t } = useTranslation()
  const today = new Date().toISOString().split('T')[0]
  const [day, setDay] = useState(today)
  const [branchId, setBranchId] = useState<string>('')

  const { data: branches } = useActiveBranches()
  const { data: distributions } = useDistributions()
  const { data: sales } = useSales()
  const { data: branchStock } = useBranchStock()
  const { data: closes } = useCashCloses()

  const selected = branchId || branches?.[0]?.id || ''
  const branch = branches?.find((b) => b.id === selected)

  // What the manager handed this branch on the chosen day.
  const received: Record<string, { name: string; qty: number }> = {}
  ;(distributions || []).forEach((d) => {
    if (toDate(d.createdAt).toISOString().split('T')[0] !== day) return
    d.lines.filter((l) => l.branchId === selected).forEach((l) => {
      if (!received[l.productId]) received[l.productId] = { name: l.name_en, qty: 0 }
      received[l.productId].qty += l.qty
    })
  })

  // What it sold that day.
  const daySales = filterSalesByRange(sales, day, day)
    .filter((s) => s.branchId === selected && s.status !== 'voided')
  const sold: Record<string, { name: string; qty: number; revenue: number }> = {}
  daySales.forEach((s) => s.items.forEach((i) => {
    if (!sold[i.productId]) sold[i.productId] = { name: i.name_en, qty: 0, revenue: 0 }
    sold[i.productId].qty += i.quantity
    sold[i.productId].revenue += i.total
  }))

  const onHand = (productId: string) =>
    (branchStock || []).find((s) => s.branchId === selected && s.productId === productId)?.qty ?? 0

  // One row per product touched that day, whether received, sold, or both.
  const productIds = [...new Set([...Object.keys(received), ...Object.keys(sold)])]
  const rows = productIds.map((pid) => {
    const r = received[pid]?.qty ?? 0
    const s = sold[pid]?.qty ?? 0
    return {
      pid,
      name: received[pid]?.name || sold[pid]?.name || pid,
      received: r,
      sold: s,
      remaining: onHand(pid),
      revenue: sold[pid]?.revenue ?? 0,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = daySales.reduce((s, x) => s + x.total, 0)
  const close = (closes || []).find((c) => c.branchId === selected && c.date === day)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Building2 className="h-6 w-6 text-primary" /> {t('branchReport.title')}
          </h1>
          <p className="text-muted-foreground">{t('branchReport.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onValueChange={setBranchId}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder={t('branches.selectBranch')} /></SelectTrigger>
            <SelectContent>
              {(branches || []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className="h-9 w-40" />
          <Button size="sm" variant="outline" disabled={rows.length === 0}
            onClick={() => downloadSpreadsheet(
              `${branch?.name || 'branch'}-${day}`,
              [t('production.product'), t('branchReport.received'), t('branchReport.sold'), t('branchReport.remaining'), t('finance.revenue')],
              rows.map((r) => [r.name, r.received, r.sold, r.remaining, (r.revenue / 100).toFixed(2)])
            )}>
            <Download className="mr-1 h-4 w-4" /> {t('reports.excel')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('branchReport.totalReceived')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.reduce((n, r) => n + r.received, 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('branchReport.totalSold')}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.reduce((n, r) => n + r.sold, 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('finance.revenue')}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            {close && (
              <Badge variant={close.status === 'confirmed' ? 'success' : 'secondary'} className="mt-1">
                {t(`cashClose.status.${close.status}`)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {branch?.name} · {day}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[8rem]">{t('production.product')}</TableHead>
                    <TableHead className="text-right">{t('branchReport.received')}</TableHead>
                    <TableHead className="text-right">{t('branchReport.sold')}</TableHead>
                    <TableHead className="text-right">{t('branchReport.remaining')}</TableHead>
                    <TableHead className="text-right">{t('finance.revenue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.pid}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.received}</TableCell>
                      <TableCell className="text-right">{r.sold}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.remaining}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40">
                    <TableCell className="font-bold">{t('common.total')}</TableCell>
                    <TableCell className="text-right font-bold">{rows.reduce((n, r) => n + r.received, 0)}</TableCell>
                    <TableCell className="text-right font-bold">{rows.reduce((n, r) => n + r.sold, 0)}</TableCell>
                    <TableCell className="text-right font-bold">{rows.reduce((n, r) => n + r.remaining, 0)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalRevenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
