import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now } from '@/lib/timestamp'
import { useAddProduct, useUpdateProduct } from '@/hooks/useData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { Product } from '@/types'

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const { t } = useTranslation()
  const add = useAddProduct()
  const update = useUpdateProduct()
  const [form, setForm] = useState({
    name_en: product?.name_en || '',
    name_am: product?.name_am || '',
    price: product ? (product.price / 100).toString() : '',
    category: product?.category || '',
    imageUrl: product?.imageUrl || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name_en: form.name_en,
        name_am: form.name_am,
        price: Math.round(parseFloat(form.price) * 100),
        category: form.category,
        imageUrl: form.imageUrl,
        isActive: true,
        createdAt: now(),
      }
      if (product) {
        await update.mutateAsync({ id: product.id, data })
      } else {
        await add.mutateAsync(data)
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? t('common.edit') : t('common.create')} {t('pos.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.name')} (EN)</Label>
              <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.name')} (AM)</Label>
              <Input value={form.name_am} onChange={(e) => setForm({ ...form, name_am: e.target.value })} required className="font-ethiopic" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.price')} (ETB)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('pos.category')}</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Bread, Cake, Pastry..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('common.image')} URL</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
