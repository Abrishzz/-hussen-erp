import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
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
import type { Recipe, RawMaterial } from '@/types'

interface FormValues {
  productName_en: string
  productName_am: string
  batchYield: number
  ingredients: { materialId: string; qtyPerBatch: number }[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: Recipe | null
  materials: RawMaterial[]
}

export function RecipeDialog({ open, onOpenChange, recipe, materials }: Props) {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const add = useAddDocument('recipes')
  const update = useUpdateDocument('recipes')
  const isEdit = !!recipe

  const { register, handleSubmit, control, reset, setValue, watch, formState: { isSubmitting } } =
    useForm<FormValues>({
      defaultValues: { productName_en: '', productName_am: '', batchYield: 1, ingredients: [] },
    })
  const { fields, append, remove } = useFieldArray({ control, name: 'ingredients' })

  useEffect(() => {
    if (open) {
      reset(
        recipe
          ? {
              productName_en: recipe.productName_en,
              productName_am: recipe.productName_am,
              batchYield: recipe.batchYield,
              ingredients: recipe.ingredients.map((i) => ({ materialId: i.materialId, qtyPerBatch: i.qtyPerBatch })),
            }
          : { productName_en: '', productName_am: '', batchYield: 1, ingredients: [] }
      )
    }
  }, [open, recipe, reset])

  const onSubmit = async (v: FormValues) => {
    const ingredients = v.ingredients
      .filter((i) => i.materialId && i.qtyPerBatch > 0)
      .map((i) => {
        const mat = materials.find((m) => m.id === i.materialId)
        return {
          materialId: i.materialId,
          materialName_en: mat?.name_en ?? '',
          materialName_am: mat?.name_am ?? '',
          qtyPerBatch: Number(i.qtyPerBatch),
          unit: mat?.unit ?? 'pcs',
        }
      })
    if (ingredients.length === 0) {
      toast({ title: t('production.ingredients'), variant: 'destructive' })
      return
    }
    const payload = {
      productName_en: v.productName_en.trim(),
      productName_am: v.productName_am.trim(),
      productId: recipe?.productId ?? '',
      batchYield: Number(v.batchYield),
      ingredients,
    }
    try {
      if (isEdit && recipe) await update.mutateAsync({ id: recipe.id, data: payload })
      else await add.mutateAsync(payload)
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('production.editRecipe') : t('production.addRecipe')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('products.nameEn')}</Label>
              <Input {...register('productName_en', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('products.nameAm')}</Label>
              <Input className="font-ethiopic" {...register('productName_am')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('production.batchYield')}</Label>
            <Input type="number" min="1" {...register('batchYield', { valueAsNumber: true })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('production.ingredients')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: materials[0]?.id ?? '', qtyPerBatch: 1 })}>
                <Plus className="mr-1 h-4 w-4" />
                {t('common.create')}
              </Button>
            </div>
            {fields.length === 0 && <p className="text-xs text-muted-foreground">{t('production.ingredients')}…</p>}
            <div className="space-y-2">
              {fields.map((f, idx) => {
                const matId = watch(`ingredients.${idx}.materialId`)
                const mat = materials.find((m) => m.id === matId)
                return (
                  <div key={f.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Select value={matId} onValueChange={(v) => setValue(`ingredients.${idx}.materialId`, v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {isAm ? m.name_am : m.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-1">
                      <Input type="number" step="0.01" min="0" placeholder={mat ? t(`inventory.unit.${mat.unit}`) : ''}
                        {...register(`ingredients.${idx}.qtyPerBatch`, { valueAsNumber: true })} className="h-9" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
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
