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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { toast } from '@/store/toastStore'
import type { Employee } from '@/types'

const schema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string(),
  salary: z.number().min(0),
  salaryType: z.enum(['daily', 'monthly']),
  hireDate: z.string().min(1),
})
type FormValues = z.infer<typeof schema>

function tsToInputDate(ts: unknown): string {
  const d = ts && typeof ts === 'object' && 'seconds' in ts ? new Date((ts as { seconds: number }).seconds * 1000) : new Date()
  return d.toISOString().slice(0, 10)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
}

export function EmployeeDialog({ open, onOpenChange, employee }: Props) {
  const { t } = useTranslation()
  const add = useAddDocument('employees')
  const update = useUpdateDocument('employees')
  const isEdit = !!employee

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', role: '', phone: '', salary: 0, salaryType: 'monthly', hireDate: new Date().toISOString().slice(0, 10) },
  })

  useEffect(() => {
    if (open) {
      reset(
        employee
          ? {
              name: employee.name,
              role: employee.role,
              phone: employee.phone,
              salary: employee.salary / 100,
              salaryType: employee.salaryType,
              hireDate: tsToInputDate(employee.hireDate),
            }
          : { name: '', role: '', phone: '', salary: 0, salaryType: 'monthly', hireDate: new Date().toISOString().slice(0, 10) }
      )
    }
  }, [open, employee, reset])

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name.trim(),
      role: v.role.trim(),
      phone: v.phone.trim(),
      salary: Math.round(v.salary * 100),
      salaryType: v.salaryType,
      hireDate: Timestamp.fromDate(new Date(v.hireDate)),
      isActive: true,
    }
    try {
      if (isEdit && employee) await update.mutateAsync({ id: employee.id, data: payload })
      else await add.mutateAsync(payload)
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const salaryType = watch('salaryType')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('hr.editEmployee') : t('hr.addEmployee')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Input placeholder="Baker, Cashier..." {...register('role')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>{t('hr.hireDate')}</Label>
              <Input type="date" {...register('hireDate')} />
            </div>
            <div className="space-y-2">
              <Label>{t('hr.salaryType.monthly')}</Label>
              <Select value={salaryType} onValueChange={(v) => setValue('salaryType', v as FormValues['salaryType'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t('hr.salaryType.monthly')}</SelectItem>
                  <SelectItem value="daily">{t('hr.salaryType.daily')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('hr.baseSalary')} (ETB)</Label>
              <Input type="number" step="0.01" min="0" {...register('salary', { valueAsNumber: true })} />
            </div>
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
