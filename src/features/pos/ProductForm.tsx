import { useState, useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { now } from '@/lib/timestamp'
import { compressToProof } from '@/lib/image'
import { useToast } from '@/hooks/useToast'
import {
  useAddProduct, useUpdateProduct, useProducts, useWarehouseStock, useSetWarehouseQty,
} from '@/hooks/useData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ImagePlus, Loader2, X } from 'lucide-react'
import type { Product } from '@/types'

interface ProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

const EMPTY = { name_en: '', name_am: '', price: '', category: '', imageUrl: '', qty: '' }

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const { t } = useTranslation()
  const add = useAddProduct()
  const update = useUpdateProduct()
  const setWarehouseQty = useSetWarehouseQty()
  const { data: products } = useProducts()
  const { data: warehouse } = useWarehouseStock()
  const { show } = useToast()
  const listId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  // The dialog stays mounted and only `open` toggles, so useState's initial value
  // is captured once (while product was still null) — that's what made "Edit"
  // open a blank "add new" form. Re-seed the fields whenever it opens.
  useEffect(() => {
    if (!open) return
    if (product) {
      const stocked = warehouse?.find((w) => w.productId === product.id)
      setForm({
        name_en: product.name_en,
        name_am: product.name_am,
        price: (product.price / 100).toString(),
        category: product.category || '',
        imageUrl: product.imageUrl || '',
        qty: (stocked?.qty ?? 0).toString(),
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, product, warehouse])

  // Offer the categories already in use, but the field stays free text so a new
  // one can just be typed in.
  const categories = [...new Set((products || []).map((p) => p.category).filter(Boolean))]

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    try {
      const dataUrl = await compressToProof(file)
      setForm((f) => ({ ...f, imageUrl: dataUrl }))
    } catch {
      show(t('products.photoTooLarge'), 'destructive')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const base = {
        name_en: form.name_en,
        name_am: form.name_am,
        price: Math.round(parseFloat(form.price) * 100),
        category: form.category.trim(),
        imageUrl: form.imageUrl,
      }
      const qty = parseInt(form.qty) || 0

      if (product) {
        await update.mutateAsync({ id: product.id, data: base })
        await setWarehouseQty.mutateAsync({
          productId: product.id, name_en: base.name_en, name_am: base.name_am, qty,
        })
      } else {
        const ref = await add.mutateAsync({ ...base, isActive: true, createdAt: now() })
        if (qty > 0) {
          await setWarehouseQty.mutateAsync({
            productId: ref.id, name_en: base.name_en, name_am: base.name_am, qty,
          })
        }
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-3 text-left sm:px-6 sm:pt-5">
          <DialogTitle>
            {product ? t('common.edit') : t('common.create')} {t('nav.products')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-2 sm:px-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('common.name')} (EN)</Label>
                <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('common.name')} (AM)</Label>
                <Input value={form.name_am} onChange={(e) => setForm({ ...form, name_am: e.target.value })} required className="font-ethiopic" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('common.price')} (ETB)</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('products.warehouseQty')}</Label>
                <Input type="number" inputMode="numeric" min="0" value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="0" />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">{t('products.warehouseQtyHint')}</p>

            <div className="space-y-2">
              <Label>{t('pos.category')}</Label>
              {/* A datalist keeps this a plain text field (type anything new) while
                  still suggesting the categories already in use. */}
              <Input
                list={listId}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t('products.categoryPlaceholder')}
              />
              <datalist id={listId}>
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>{t('common.image')}</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
              {form.imageUrl ? (
                <div className="flex items-center gap-3">
                  <img src={form.imageUrl} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                      {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('storefront.changeProof')}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setForm({ ...form, imageUrl: '' })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                  className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {photoBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  <span className="text-sm font-medium">{t('products.imageUpload')}</span>
                </button>
              )}
              <Input
                value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder={`${t('products.orUploadPhoto')} — https://...`}
                disabled={form.imageUrl.startsWith('data:')}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background p-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
