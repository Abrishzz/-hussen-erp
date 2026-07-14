import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { dateToTimestamp } from '@/lib/timestamp'
import {
  useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense,
  useTodaySales,
} from '@/hooks/useData'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Expense } from '@/types'

export default function Finance() {
  const { t } = useTranslation()
  const { data: expenses, isLoading } = useExpenses()
  const add = useAddExpense()
  const update = useUpdateExpense()
  const remove = useDeleteExpense()
  const { data: sales } = useTodaySales()

  const [formOpen, setFormOpen] = useState(false)
  const [editExp, setEditExp] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const revenue = sales?.reduce((s, x) => s + x.total, 0) || 0
  const totalExpenses = expenses?.reduce((s, x) => s + x.amount, 0) || 0
  const netProfit = revenue - totalExpenses

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        category: form.category,
        amount: Math.round(parseFloat(form.amount) * 100),
        description: form.description,
        date: dateToTimestamp(new Date(form.date)),
      }
      if (editExp) {
        await update.mutateAsync({ id: editExp.id, data })
      } else {
        await add.mutateAsync(data)
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'date', header: t('common.date'), cell: (e: Expense) => formatDate(e.date) },
    { key: 'category', header: t('common.category'), cell: (e: Expense) => (
      <Badge variant="secondary">{t(`finance.categories.${e.category}`) || e.category}</Badge>
    )},
    { key: 'description', header: t('common.description'), cell: (e: Expense) => e.description },
    { key: 'amount', header: t('common.amount'), cell: (e: Expense) => formatCurrency(e.amount) },
    { key: 'actions', header: t('common.actions'), cell: (e: Expense) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditExp(e); setForm({ category: e.category, amount: (e.amount / 100).toString(), description: e.description, date: formatDate(e.date) }); setFormOpen(true) }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('finance.title')}</h1>
          <Button onClick={() => { setEditExp(null); setForm({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> {t('finance.addExpense')}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 shadow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {t('finance.revenue')}
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(revenue)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-500" />
              {t('finance.expenses')}
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-blue-500" />
              {t('finance.grossProfit')}
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(revenue)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              {t('finance.netProfit')}
            </div>
            <p className={`mt-1 text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>

        <Tabs defaultValue="expenses">
          <TabsList>
            <TabsTrigger value="expenses">{t('finance.expenses')}</TabsTrigger>
            <TabsTrigger value="summary">{t('finance.summary')}</TabsTrigger>
          </TabsList>
          <TabsContent value="expenses">
            <DataTable columns={columns} data={expenses || []} loading={isLoading} />
          </TabsContent>
          <TabsContent value="summary">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">{t('finance.summary')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('finance.revenue')}</span>
                  <span className="font-medium">{formatCurrency(revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('finance.costOfGoodsSold')}</span>
                  <span className="font-medium">{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('finance.grossProfit')}</span>
                  <span className="font-medium">{formatCurrency(revenue)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('finance.operatingExpenses')}</span>
                  <span className="font-medium">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>{t('finance.netProfit')}</span>
                  <span className={netProfit >= 0 ? 'text-green-600' : 'text-destructive'}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editExp ? t('common.edit') : t('common.create')} {t('finance.expenses')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.category')}</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['utilities', 'rent', 'maintenance', 'miscellaneous', 'salary', 'rawMaterials'].map((cat) => (
                        <SelectItem key={cat} value={cat}>{t(`finance.categories.${cat}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.amount')} (ETB)</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('common.description')}</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('common.date')}</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title={t('common.delete')}
          description="Are you sure you want to delete this expense?"
          variant="destructive"
          onConfirm={() => deleteId && remove.mutate(deleteId)}
        />
      </div>
    </ErrorBoundary>
  )
}
