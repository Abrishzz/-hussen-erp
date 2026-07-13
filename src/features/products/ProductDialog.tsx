import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { serverTimestamp } from 'firebase/firestore'
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
import { Switch } from '@/components/ui/switch'
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { toast } from '@/store/toastStore'
import type { Product } from '@/types'

const schema = z.object({
  name_en: z.string().min(1),
  name_am: z.string().min(1),
  category: z.string().min(1),
  price: z.number().positive(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories: string[]
}

export function ProductDialog({ open, onOpenChange, product, categories }: ProductDialogProps) {
  const { t } = useTranslation()
  const addProduct = useAddDocument('products')
  const updateProduct = useUpdateDocument('products')
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name_en: '', name_am: '', category: '', price: 0, isActive: true },
  })

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              name_en: product.name_en,
              name_am: product.name_am,
              category: product.category,
              price: product.price / 100,
              isActive: product.isActive,
            }
          : { name_en: '', name_am: '', category: '', price: 0, isActive: true }
      )
    }
  }, [open, product, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name_en: values.name_en.trim(),
      name_am: values.name_am.trim(),
      category: values.category.trim(),
      price: Math.round(values.price * 100),
      isActive: values.isActive,
      imageUrl: product?.imageUrl ?? '',
    }
    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({ id: product.id, data: payload })
      } else {
        await addProduct.mutateAsync({ ...payload, createdAt: serverTimestamp() })
      }
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  const isActive = watch('isActive')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('products.editProduct') : t('products.addProduct')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name_en">{t('products.nameEn')}</Label>
              <Input id="name_en" {...register('name_en')} />
              {errors.name_en && <p className="text-xs text-destructive">{t('common.error')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_am">{t('products.nameAm')}</Label>
              <Input id="name_am" className="font-ethiopic" {...register('name_am')} />
              {errors.name_am && <p className="text-xs text-destructive">{t('common.error')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('products.category')}</Label>
              <Input id="category" list="product-categories" {...register('category')} />
              <datalist id="product-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.category && <p className="text-xs text-destructive">{t('common.error')}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{t('products.price')}</Label>
              <Input id="price" type="number" step="0.01" min="0" {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-xs text-destructive">{t('common.error')}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="isActive">{t('common.active')}</Label>
              <p className="text-xs text-muted-foreground">{t('products.activeHint')}</p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(v) => setValue('isActive', v)}
            />
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
