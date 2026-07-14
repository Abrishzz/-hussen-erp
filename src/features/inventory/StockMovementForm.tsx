import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now } from '@/lib/timestamp'
import { useRawMaterials, useAddMovement, useUpdateMaterial } from '@/hooks/useData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { showToast } from '@/components/ui/toaster'

interface StockMovementFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: 'IN' | 'OUT' | 'WASTE'
}

export function StockMovementForm({ open, onOpenChange, defaultType = 'IN' }: StockMovementFormProps) {
  const { t } = useTranslation()
  const { data: materials } = useRawMaterials()
  const addMovement = useAddMovement()
  const updateMaterial = useUpdateMaterial()
  const [materialId, setMaterialId] = useState('')
  const [type, setType] = useState(defaultType)
  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedMaterial = materials?.find((m) => m.id === materialId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialId || !qty) return
    setSaving(true)
    try {
      const qtyNum = parseFloat(qty)
      const costNum = parseFloat(unitCost || '0') * 100

      await addMovement.mutateAsync({
        materialId,
        type,
        qty: type === 'IN' ? qtyNum : -qtyNum,
        unitCost: type === 'IN' ? costNum : undefined,
        note,
        timestamp: now(),
      })

      // Update material stock
      const newQty = type === 'IN'
        ? (selectedMaterial?.currentQty || 0) + qtyNum
        : (selectedMaterial?.currentQty || 0) - qtyNum

      const updateData: Record<string, unknown> = { currentQty: Math.max(0, newQty) }
      if (type === 'IN' && selectedMaterial) {
        const totalCost = (selectedMaterial.avgCost * (selectedMaterial.currentQty || 0)) + (costNum * qtyNum)
        const totalQty = (selectedMaterial.currentQty || 0) + qtyNum
        updateData.avgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : costNum
      }
      await updateMaterial.mutateAsync({ id: materialId, data: updateData })

      showToast(t('common.success'), 'success')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === 'IN' ? t('inventory.receiveStock') : type === 'WASTE' ? t('inventory.recordWastage') : t('inventory.issueStock')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('inventory.title')}</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger><SelectValue placeholder={t('common.select')} /></SelectTrigger>
              <SelectContent>
                {materials?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name_en} ({m.currentQty} {m.unit})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('inventory.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as 'IN' | 'OUT' | 'WASTE')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">{t('inventory.type.IN')}</SelectItem>
                <SelectItem value="OUT">{t('inventory.type.OUT')}</SelectItem>
                <SelectItem value="WASTE">{t('inventory.type.WASTE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.quantity')}</Label>
              <Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} required />
            </div>
            {type === 'IN' && (
              <div className="space-y-2">
                <Label>{t('inventory.avgCost')} (ETB)</Label>
                <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
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
