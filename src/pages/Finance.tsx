import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { dateToTimestamp } from '@/lib/timestamp'
import {
  useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense,
  useReviewExpense, useTodaySales,
} from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'
import { approvedExpensesOn, toDate } from '@/lib/analytics'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus, Pencil, Trash2, TrendingUp, TrendingDown, DollarSign,
  Check, X, Clock, Wallet,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Expense } from '@/types'

const CATEGORIES = ['utilities', 'rent', 'maintenance', 'miscellaneous', 'salary', 'rawMaterials']

const statusVariant: Record<Expense['status'], 'default' | 'secondary' | 'destructive'> = {
  approved: 'default', pending: 'secondary', rejected: 'destructive',
}

const emptyForm = {
  category: '', amount: '', description: '',
  date: new Date().toISOString().split('T')[0],
}

export default function Finance() {
  return <ErrorBoundary><FinanceContent /></ErrorBoundary>
}

function FinanceContent() {
  const { t } = useTranslation()
  const { role, user } = useAuthStore()
  const { show } = useToast()
  const isOwner = role === 'owner'

  const { data: expenses, isLoading } = useExpenses()
  const { data: sales } = useTodaySales()
  const add = useAddExpense()
  const update = useUpdateExpense()
  const remove = useDeleteExpense()
  const review = useReviewExpense()

  const [formOpen, setFormOpen] = useState(false)
  const [editExp, setEditExp] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // A manager only ever sees/handles their own submissions.
  const visible = useMemo(
    () => (expenses || []).filter((e) => isOwner || e.recordedBy === user?.uid),
    [expenses, isOwner, user?.uid],
  )
  const pending = useMemo(() => (expenses || []).filter((e) => e.status === 'pending'), [expenses])

  // Today's takings, and what approved expenses take back out of them.
  const grossToday = sales?.reduce((s, x) => s + x.total, 0) || 0
  const deductedToday = approvedExpensesOn(expenses, today)
  const netToday = grossToday - deductedToday

  const openAdd = () => { setEditExp(null); setForm(emptyForm); setFormOpen(true) }

  const openEdit = (e: Expense) => {
    setEditExp(e)
    setForm({
      category: e.category,
      amount: (e.amount / 100).toString(),
      description: e.description,
      date: toDate(e.date).toISOString().split('T')[0],
    })
    setFormOpen(true)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
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
        show(t('common.success'), 'success')
      } else {
        await add.mutateAsync(data)
        show(isOwner ? t('common.success') : t('finance.submittedForApproval'), 'success')
      }
      setFormOpen(false)
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const decide = (e: Expense, status: 'approved' | 'rejected') => {
    review.mutate({ id: e.id, status }, {
      onSuccess: () => show(
        status === 'approved' ? t('finance.expenseApproved') : t('finance.expenseRejected'),
        status === 'approved' ? 'success' : 'default',
      ),
      onError: () => show(t('common.error'), 'destructive'),
    })
  }

  const statusBadge = (e: Expense) => {
    // Legacy rows have no status — they were owner-created, so show as approved.
    const s = e.status || 'approved'
    return (
      <Badge variant={statusVariant[s]} className="gap-1">
        {s === 'approved' ? <Check className="h-3 w-3" />
          : s === 'rejected' ? <X className="h-3 w-3" />
          : <Clock className="h-3 w-3" />}
        {t(`finance.${s}`)}
      </Badge>
    )
  }

  const columns = [
    { key: 'date', header: t('common.date'), cell: (e: Expense) => formatDate(e.date) },
    { key: 'category', header: t('common.category'), cell: (e: Expense) => (
      <Badge variant="secondary">{t(`finance.categories.${e.category}`, e.category)}</Badge>
    )},
    { key: 'description', header: t('common.description'), cell: (e: Expense) => e.description },
    { key: 'amount', header: t('common.amount'), cell: (e: Expense) => formatCurrency(e.amount) },
    { key: 'status', header: t('common.status'), cell: statusBadge },
    ...(isOwner ? [{
      key: 'by', header: t('finance.submittedBy'),
      cell: (e: Expense) => <span className="text-xs text-muted-foreground">{e.submittedByName || '—'}</span>,
    }] : []),
    { key: 'actions', header: t('common.actions'), cell: (e: Expense) => {
      // A manager can only touch their own submission while it's still pending.
      const editable = isOwner || (e.status === 'pending' && e.recordedBy === user?.uid)
      if (!editable) return <span className="text-xs text-muted-foreground">—</span>
      return (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }},
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('finance.title')}</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> {t('finance.addExpense')}
        </Button>
      </div>

      {/* Today: gross → deduction → net */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> {t('finance.grossSales')}
          </div>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(grossToday)}</p>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-rose-500" /> {t('finance.deductedToday')}
          </div>
          <p className="mt-1 text-2xl font-bold text-rose-600">−{formatCurrency(deductedToday)}</p>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 text-blue-500" /> {t('finance.netSales')}
          </div>
          <p className={`mt-1 text-2xl font-bold ${netToday >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
            {formatCurrency(netToday)}
          </p>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-amber-500" /> {t('finance.pendingApproval')}
          </div>
          <p className="mt-1 text-2xl font-bold">{isOwner ? pending.length : visible.filter((e) => e.status === 'pending').length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue={isOwner && pending.length > 0 ? 'pending' : 'expenses'}>
        <TabsList>
          <TabsTrigger value="expenses">{isOwner ? t('finance.allExpenses') : t('finance.myExpenses')}</TabsTrigger>
          {isOwner && (
            <TabsTrigger value="pending" className="gap-1.5">
              {t('finance.pendingApproval')}
              {pending.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="expenses" className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{t('finance.approvedOnly')}</p>
          <DataTable columns={columns} data={visible} loading={isLoading} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.length === 0 ? (
              <Card><CardContent className="py-14 text-center">
                <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('finance.noPending')}</p>
              </CardContent></Card>
            ) : pending.map((e) => (
              <Card key={e.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{t(`finance.categories.${e.category}`, e.category)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(e.date)}</span>
                      </div>
                      <p className="font-medium">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('finance.submittedBy')}: {e.submittedByName || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold">{formatCurrency(e.amount)}</p>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={review.isPending} onClick={() => decide(e, 'approved')}>
                          <Check className="mr-1 h-4 w-4" /> {t('finance.approve')}
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive"
                          disabled={review.isPending} onClick={() => setRejectTarget(e)}>
                          <X className="mr-1 h-4 w-4" /> {t('finance.reject')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>

      {/* Add / edit expense */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editExp ? t('common.edit') : t('finance.addExpense')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.category')}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{t(`finance.categories.${cat}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.amount')} (ETB)</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common.description')}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.date')}</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              <p className="text-xs text-muted-foreground">
                {isOwner ? t('finance.approvedOnly') : t('finance.submittedForApproval')}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving || !form.category}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t('common.delete')}
        description={t('products.confirmDelete', { name: '' })}
        variant="destructive"
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null) }}
      />

      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={() => setRejectTarget(null)}
        title={t('finance.reject')}
        description={t('finance.confirmReject')}
        variant="destructive"
        confirmLabel={t('finance.reject')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { if (rejectTarget) decide(rejectTarget, 'rejected'); setRejectTarget(null) }}
      />
    </div>
  )
}
