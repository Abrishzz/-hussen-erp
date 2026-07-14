import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpenseDialog } from '@/features/finance/ExpenseDialog'
import { useCollection, useDeleteDocument, orderBy } from '@/hooks/useFirestore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import type { Sale, Expense, StockMovement } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return new Date((ts as { seconds: number }).seconds * 1000)
  return new Date()
}
const thisMonth = (d: Date) => {
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function Finance() {
  const { t } = useTranslation()
  const { data: sales } = useCollection<Sale>('sales', [orderBy('timestamp', 'desc')])
  const { data: expenses } = useCollection<Expense>('expenses', [orderBy('date', 'desc')])
  const { data: movements } = useCollection<StockMovement>('stockMovements')
  const deleteExpense = useDeleteDocument('expenses')

  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [toDelete, setToDelete] = useState<Expense | null>(null)

  const stats = useMemo(() => {
    const revenue = (sales ?? [])
      .filter((s) => s.status === 'completed' && thisMonth(tsToDate(s.timestamp)))
      .reduce((sum, s) => sum + (s.total || 0), 0)
    const expenseTotal = (expenses ?? [])
      .filter((e) => thisMonth(tsToDate(e.date)))
      .reduce((sum, e) => sum + (e.amount || 0), 0)
    // Cost of goods sold ~ raw materials issued/wasted this month, valued at unit cost.
    const cogs = (movements ?? [])
      .filter((m) => (m.type === 'OUT' || m.type === 'WASTE') && thisMonth(tsToDate(m.timestamp)))
      .reduce((sum, m) => sum + Math.round(m.qty * (m.unitCost || 0)), 0)
    const grossProfit = revenue - cogs
    const netProfit = grossProfit - expenseTotal
    return { revenue, expenseTotal, cogs, grossProfit, netProfit }
  }, [sales, expenses, movements])

  const cards = [
    { title: t('finance.revenue'), value: stats.revenue, icon: TrendingUp, tone: 'text-green-600' },
    { title: t('finance.grossProfit'), value: stats.grossProfit, icon: DollarSign, tone: 'text-blue-600' },
    { title: t('finance.expenses'), value: stats.expenseTotal, icon: TrendingDown, tone: 'text-destructive' },
    { title: t('finance.netProfit'), value: stats.netProfit, icon: Wallet, tone: stats.netProfit >= 0 ? 'text-green-600' : 'text-destructive' },
  ]

  const monthExpenses = (expenses ?? []).filter((e) => thisMonth(tsToDate(e.date)))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('finance.title')}</h1>
          <p className="text-muted-foreground">{t('common.thisMonth')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialog(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('finance.addExpense')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.tone}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${c.tone}`}>{formatCurrency(c.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('finance.expenses')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {monthExpenses.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.date')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(tsToDate(e.date))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t(`finance.categories.${e.category}`, e.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.description || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setDialog(true) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseDialog open={dialog} onOpenChange={setDialog} expense={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('finance.editExpense')}
        description={toDelete?.description || ''}
        confirmLabel={t('common.delete')}
        loading={deleteExpense.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try { await deleteExpense.mutateAsync(toDelete.id); toast({ title: t('common.success'), variant: 'success' }) }
          catch { toast({ title: t('common.error'), variant: 'destructive' }) }
          finally { setToDelete(null) }
        }}
      />
    </div>
  )
}
