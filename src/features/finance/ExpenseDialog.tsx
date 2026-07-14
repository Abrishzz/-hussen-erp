import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Timestamp } from 'firebase/firestore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import type { Expense } from '@/types'

const CATEGORIES = ['utilities', 'rent', 'maintenance', 'salary', 'rawMaterials', 'miscellaneous'] as const

const schema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string(),
  date: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

function tsToInputDate(ts: unknown): string {
  const d =
    ts && typeof ts === 'object' && 'seconds' in ts
      ? new Date((ts as { seconds: number }).seconds * 1000)
      : new Date()
  return d.toISOString().slice(0, 10)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
}

export function ExpenseDialog({ open, onOpenChange, expense }: Props) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const add = useAddDocument('expenses')
  const update = useUpdateDocument('expenses')
  const isEdit = !!expense

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'utilities', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) },
  })

  useEffect(() => {
    if (open) {
      reset(
        expense
          ? {
              category: expense.category,
              amount: expense.amount / 100,
              description: expense.description,
              date: tsToInputDate(expense.date),
            }
          : { category: 'utilities', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }
      )
    }
  }, [open, expense, reset])

  const onSubmit = async (v: FormValues) => {
    const payload = {
      category: v.category,
      amount: Math.round(v.amount * 100),
      description: v.description.trim(),
      date: Timestamp.fromDate(new Date(v.date)),
      recordedBy: user?.uid ?? 'unknown',
    }
    try {
      if (isEdit && expense) await update.mutateAsync({ id: expense.id, data: payload })
      else await add.mutateAsync(payload)
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const category = watch('category')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('finance.editExpense') : t('finance.addExpense')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.category')}</Label>
              <Select value={category} onValueChange={(v) => setValue('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`finance.categories.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.amount')} (ETB)</Label>
              <Input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('common.date')}</Label>
            <Input type="date" {...register('date')} />
          </div>
          <div className="space-y-2">
            <Label>{t('common.description')}</Label>
            <Textarea rows={2} {...register('description')} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
