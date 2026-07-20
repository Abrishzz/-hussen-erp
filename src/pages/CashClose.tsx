import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSales, useBranchStock, useCashCloses, useSubmitCashClose, useConfirmCashClose, useActiveBranches } from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'
import { filterSalesByRange } from '@/lib/analytics'
import { formatCurrency } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { downloadSpreadsheet } from '@/lib/excel'
import { Banknote, AlertTriangle, CheckCircle2, Lock, Download } from 'lucide-react'
import type { Sale } from '@/types'

const emptyPay = { cash: 0, telebirr: 0, bank: 0 }

function paymentSplit(sales: Sale[]) {
  const p = { ...emptyPay }
  sales.forEach((s) => { p[s.paymentMethod] += s.total })
  return p
}

export default function CashClose() {
  return <ErrorBoundary><CashCloseContent /></ErrorBoundary>
}

function CashCloseContent() {
  const { role } = useAuthStore()
  const isManagerView = role === 'owner' || role === 'manager'

  return (
    <div className="space-y-6">
      {role === 'cashier' && <CashierClose />}
      {isManagerView && <ManagerConfirm />}
    </div>
  )
}

// ─── Cashier: close the branch day ───
function CashierClose() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { user, branchId } = useAuthStore()
  const { data: branches } = useActiveBranches()
  const { data: sales } = useSales()
  const { data: branchStock } = useBranchStock(branchId || undefined)
  const { data: closes } = useCashCloses()
  const submit = useSubmitCashClose()
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const branchName = branches?.find((b) => b.id === branchId)?.name || ''

  const todayBranchSales = useMemo(
    () => filterSalesByRange(sales, today, today)
      .filter((s) => s.branchId === branchId && s.status !== 'voided'),
    [sales, today, branchId]
  )

  const total = todayBranchSales.reduce((s, x) => s + x.total, 0)
  const orderCount = todayBranchSales.length
  const byPayment = paymentSplit(todayBranchSales)
  const toReturn = (branchStock || []).filter((s) => s.qty > 0)

  const alreadyClosed = closes?.find((c) => c.branchId === branchId && c.date === today)

  if (!branchId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <h2 className="text-xl font-semibold">{t('pos.noBranchTitle')}</h2>
        <p className="max-w-md text-muted-foreground">{t('pos.noBranchDesc')}</p>
      </div>
    )
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await submit.mutateAsync({
        branchId,
        branchName,
        date: today,
        cashierId: user?.uid || '',
        cashierName: user?.displayName || '',
        totalSales: total,
        orderCount,
        byPayment,
      })
      show(t('cashClose.submittedToast'), 'success')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Banknote className="h-6 w-6 text-primary" /> {t('cashClose.title')}
        </h1>
        <p className="text-muted-foreground">{branchName} · {today}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('cashClose.todayTotal')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(total)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('pos.orderCount')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{orderCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t('cashClose.itemsToReturn')}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{toReturn.reduce((s, x) => s + x.qty, 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('cashClose.paymentBreakdown')}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{t('pos.cash')}: {formatCurrency(byPayment.cash)}</Badge>
          <Badge variant="secondary">{t('pos.telebirr')}: {formatCurrency(byPayment.telebirr)}</Badge>
          <Badge variant="secondary">{t('pos.bankTransfer')}: {formatCurrency(byPayment.bank)}</Badge>
        </CardContent>
      </Card>

      {toReturn.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t('cashClose.unsoldReturn')}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {toReturn.map((s) => (
              <Badge key={s.id} variant="secondary">{s.name_en}: {s.qty}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {alreadyClosed ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <span>
                {t('cashClose.alreadyClosed')} —{' '}
                <Badge variant={alreadyClosed.status === 'confirmed' ? 'success' : 'secondary'}>
                  {t(`cashClose.status.${alreadyClosed.status}`)}
                </Badge>
              </span>
            </div>
          ) : (
            <Button size="lg" className="w-full" disabled={saving || orderCount === 0} onClick={handleSubmit}>
              <Banknote className="mr-2 h-5 w-5" />
              {saving ? t('common.saving') : t('cashClose.closeDay')}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}

// ─── Manager/Owner: confirm branch cash ───
function ManagerConfirm() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { role } = useAuthStore()
  // Cash close is a same-day routine. A manager only ever sees today; days that
  // were left unclosed become the owner's problem to review.
  const isSuperAdmin = role === 'owner'
  const { data: closes, isLoading } = useCashCloses()
  const { data: branches } = useActiveBranches()
  const { data: sales } = useSales()
  const confirm = useConfirmCashClose()
  const [busy, setBusy] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]
  const [day, setDay] = useState(today)

  const submitted = (closes || [])
    .filter((c) => c.status === 'submitted')
    .filter((c) => isSuperAdmin || c.date === today)
  const confirmed = (closes || [])
    .filter((c) => c.status === 'confirmed')
    .filter((c) => isSuperAdmin || c.date === today)

  // Every branch's takings for the chosen day, computed from the sales
  // themselves — so a branch shows up here whether or not it has closed yet.
  const daySales = filterSalesByRange(sales, day, day).filter((s) => s.status !== 'voided')
  const perBranch = (branches || []).map((b) => {
    const mine = daySales.filter((s) => s.branchId === b.id)
    const close = (closes || []).find((c) => c.branchId === b.id && c.date === day)
    return {
      branch: b,
      orders: mine.length,
      revenue: mine.reduce((s, x) => s + x.total, 0),
      byPayment: paymentSplit(mine),
      close,
    }
  })
  const dayTotal = perBranch.reduce((s, r) => s + r.revenue, 0)

  const handleConfirm = async (id: string) => {
    setBusy(id)
    try {
      await confirm.mutateAsync(id)
      show(t('cashClose.confirmedToast'), 'success')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setBusy(null)
    }
  }

  const row = (c: typeof submitted[number], showAction: boolean) => (
    <TableRow key={c.id}>
      <TableCell>{c.date}</TableCell>
      <TableCell className="font-medium">{c.branchName}</TableCell>
      <TableCell>{c.cashierName}</TableCell>
      <TableCell className="text-right">{c.orderCount}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(c.totalSales)}</TableCell>
      {/* The unsold goods that came back with the cash — the manager checks
          these physically before confirming. */}
      <TableCell>
        {(c.returnedItems || []).length === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {(c.returnedItems || []).map((r) => (
              <Badge key={r.productId} variant="secondary" className="text-[11px]">
                {r.name_en}: {r.qty}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        {showAction ? (
          <Button size="sm" disabled={busy === c.id} onClick={() => handleConfirm(c.id)}>
            <CheckCircle2 className="mr-1 h-4 w-4" />
            {busy === c.id ? t('common.saving') : t('cashClose.confirmReceived')}
          </Button>
        ) : (
          <Badge variant="success">{c.confirmedByName || t('cashClose.status.confirmed')}</Badge>
        )}
      </TableCell>
    </TableRow>
  )

  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Banknote className="h-6 w-6 text-primary" /> {t('cashClose.managerTitle')}
        </h1>
        <p className="text-muted-foreground">{t('cashClose.managerSubtitle')}</p>
      </div>

      {/* Per-branch position for the day, generated from sales */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg">{t('cashClose.byBranch')}</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="date" value={day} max={today}
              min={isSuperAdmin ? undefined : today}
              disabled={!isSuperAdmin}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 w-40"
            />
            <Button size="sm" variant="outline" disabled={perBranch.length === 0}
              onClick={() => downloadSpreadsheet(
                `cash-close-${day}`,
                [t('branches.branch'), t('pos.orderCount'), t('pos.cash'), t('pos.telebirr'), t('pos.bankTransfer'), t('common.total'), t('common.status')],
                perBranch.map((r) => [
                  r.branch.name, r.orders,
                  (r.byPayment.cash / 100).toFixed(2),
                  (r.byPayment.telebirr / 100).toFixed(2),
                  (r.byPayment.bank / 100).toFixed(2),
                  (r.revenue / 100).toFixed(2),
                  r.close ? t(`cashClose.status.${r.close.status}`) : t('cashClose.notClosed'),
                ])
              )}>
              <Download className="mr-1 h-4 w-4" /> {t('reports.excel')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('branches.branch')}</TableHead>
                  <TableHead className="text-right">{t('pos.orderCount')}</TableHead>
                  <TableHead className="text-right">{t('common.total')}</TableHead>
                  <TableHead className="text-right">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perBranch.map((r) => (
                  <TableRow key={r.branch.id}>
                    <TableCell className="font-medium">{r.branch.name}</TableCell>
                    <TableCell className="text-right">{r.orders}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className="text-right">
                      {r.close ? (
                        <Badge variant={r.close.status === 'confirmed' ? 'success' : 'secondary'}>
                          {t(`cashClose.status.${r.close.status}`)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('cashClose.notClosed')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40">
                  <TableCell className="font-bold">{t('common.total')}</TableCell>
                  <TableCell className="text-right font-bold">{perBranch.reduce((n, r) => n + r.orders, 0)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(dayTotal)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('cashClose.awaitingConfirmation')} ({submitted.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : submitted.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('cashClose.noneAwaiting')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('branches.branch')}</TableHead>
                    <TableHead>{t('cashClose.cashier')}</TableHead>
                    <TableHead className="text-right">{t('pos.orderCount')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                    <TableHead>{t('cashClose.returned')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{submitted.map((c) => row(c, true))}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmed.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t('cashClose.confirmedHistory')}</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('branches.branch')}</TableHead>
                    <TableHead>{t('cashClose.cashier')}</TableHead>
                    <TableHead className="text-right">{t('pos.orderCount')}</TableHead>
                    <TableHead className="text-right">{t('common.total')}</TableHead>
                    <TableHead>{t('cashClose.returned')}</TableHead>
                    <TableHead className="text-right">{t('cashClose.confirmedBy')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{confirmed.map((c) => row(c, false))}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
