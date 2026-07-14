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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { toast } from '@/store/toastStore'
import type { RawMaterial } from '@/types'

const schema = z.object({
  name_en: z.string().min(1),
  name_am: z.string().min(1),
  unit: z.enum(['kg', 'liter', 'pcs', 'sack']),
  currentQty: z.number().min(0),
  reorderLevel: z.number().min(0),
  avgCost: z.number().min(0),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: RawMaterial | null
}

export function MaterialDialog({ open, onOpenChange, material }: Props) {
  const { t } = useTranslation()
  const add = useAddDocument('rawMaterials')
  const update = useUpdateDocument('rawMaterials')
  const isEdit = !!material

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name_en: '', name_am: '', unit: 'kg', currentQty: 0, reorderLevel: 0, avgCost: 0 },
  })

  useEffect(() => {
    if (open) {
      reset(
        material
          ? {
              name_en: material.name_en,
              name_am: material.name_am,
              unit: material.unit,
              currentQty: material.currentQty,
              reorderLevel: material.reorderLevel,
              avgCost: material.avgCost / 100,
            }
          : { name_en: '', name_am: '', unit: 'kg', currentQty: 0, reorderLevel: 0, avgCost: 0 }
      )
    }
  }, [open, material, reset])

  const onSubmit = async (v: FormValues) => {
    const payload = {
      name_en: v.name_en.trim(),
      name_am: v.name_am.trim(),
      unit: v.unit,
      currentQty: v.currentQty,
      reorderLevel: v.reorderLevel,
      avgCost: Math.round(v.avgCost * 100),
      isActive: true,
    }
    try {
      if (isEdit && material) await update.mutateAsync({ id: material.id, data: payload })
      else await add.mutateAsync(payload)
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const unit = watch('unit')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('inventory.editMaterial') : t('inventory.addMaterial')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('products.nameEn')}</Label>
              <Input {...register('name_en')} />
            </div>
            <div className="space-y-2">
              <Label>{t('products.nameAm')}</Label>
              <Input className="font-ethiopic" {...register('name_am')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.unit')}</Label>
              <Select value={unit} onValueChange={(v) => setValue('unit', v as FormValues['unit'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['kg', 'liter', 'pcs', 'sack'] as const).map((u) => (
                    <SelectItem key={u} value={u}>
                      {t(`inventory.unit.${u}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.avgCost')} (ETB)</Label>
              <Input type="number" step="0.01" min="0" {...register('avgCost', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.currentStock')}</Label>
              <Input type="number" step="0.01" min="0" {...register('currentQty', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.reorderLevel')}</Label>
              <Input type="number" step="0.01" min="0" {...register('reorderLevel', { valueAsNumber: true })} />
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
