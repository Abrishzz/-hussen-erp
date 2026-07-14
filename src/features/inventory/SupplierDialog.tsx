import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
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
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { toast } from '@/store/toastStore'
import type { Supplier } from '@/types'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  productsSupplied: z.string(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier?: Supplier | null
}

export function SupplierDialog({ open, onOpenChange, supplier }: Props) {
  const { t } = useTranslation()
  const add = useAddDocument('suppliers')
  const update = useUpdateDocument('suppliers')
  const isEdit = !!supplier

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '', productsSupplied: '' },
  })

  useEffect(() => {
    if (open) {
      reset(
        supplier
          ? {
              name: supplier.name,
              phone: supplier.phone,
              address: supplier.address,
              productsSupplied: (supplier.productsSupplied ?? []).join(', '),
            }
          : { name: '', phone: '', address: '', productsSupplied: '' }
      )
    }
  }, [open, supplier, reset])

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name: v.name.trim(),
      phone: v.phone.trim(),
      address: v.address.trim(),
      productsSupplied: v.productsSupplied
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      isActive: true,
    }
    try {
      if (isEdit && supplier) await update.mutateAsync({ id: supplier.id, data: payload })
      else await add.mutateAsync(payload)
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('inventory.editSupplier') : t('inventory.addSupplier')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('common.name')}</Label>
            <Input {...register('name')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.address')}</Label>
              <Input {...register('address')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('inventory.title')}</Label>
            <Input placeholder="Flour, Sugar, ..." {...register('productsSupplied')} />
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
