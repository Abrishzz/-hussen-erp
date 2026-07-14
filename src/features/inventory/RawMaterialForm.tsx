import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddMaterial, useUpdateMaterial } from '@/hooks/useData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { RawMaterial } from '@/types'

interface RawMaterialFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material?: RawMaterial | null
}

export function RawMaterialForm({ open, onOpenChange, material }: RawMaterialFormProps) {
  const { t } = useTranslation()
  const add = useAddMaterial()
  const update = useUpdateMaterial()
  const [form, setForm] = useState<{
    name_en: string; name_am: string; unit: string;
    currentQty: string; reorderLevel: string; avgCost: string;
  }>({
    name_en: material?.name_en || '',
    name_am: material?.name_am || '',
    unit: material?.unit || 'kg',
    currentQty: material?.currentQty?.toString() || '0',
    reorderLevel: material?.reorderLevel?.toString() || '10',
    avgCost: material ? (material.avgCost / 100).toString() : '0',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name_en: form.name_en,
        name_am: form.name_am,
        unit: form.unit as 'kg' | 'liter' | 'pcs' | 'sack',
        currentQty: parseFloat(form.currentQty),
        reorderLevel: parseFloat(form.reorderLevel),
        avgCost: Math.round(parseFloat(form.avgCost) * 100),
        isActive: true,
      }
      if (material) {
        await update.mutateAsync({ id: material.id, data })
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
          <DialogTitle>{material ? t('common.edit') : t('common.create')} {t('inventory.title')}</DialogTitle>
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
              <Label>{t('common.unit')}</Label>
              <Select value={form.unit} onValueChange={(v: string) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">{t('inventory.unit.kg')}</SelectItem>
                  <SelectItem value="liter">{t('inventory.unit.liter')}</SelectItem>
                  <SelectItem value="pcs">{t('inventory.unit.pcs')}</SelectItem>
                  <SelectItem value="sack">{t('inventory.unit.sack')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.reorderLevel')}</Label>
              <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('inventory.currentStock')}</Label>
              <Input type="number" step="0.01" value={form.currentQty} onChange={(e) => setForm({ ...form, currentQty: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.avgCost')} (ETB)</Label>
              <Input type="number" step="0.01" value={form.avgCost} onChange={(e) => setForm({ ...form, avgCost: e.target.value })} />
            </div>
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
