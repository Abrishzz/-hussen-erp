import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { serverTimestamp } from 'firebase/firestore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/utils'
import type { RawMaterial, StockMovement } from '@/types'

type MovementType = StockMovement['type']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: RawMaterial | null
  type: MovementType
}

export function StockMovementDialog({ open, onOpenChange, material, type }: Props) {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const user = useAuthStore((s) => s.user)
  const addMovement = useAddDocument('stockMovements')
  const updateMaterial = useUpdateDocument('rawMaterials')

  const [qty, setQty] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setQty('')
      setUnitCost(material ? String(material.avgCost / 100) : '')
      setNote('')
    }
  }, [open, material])

  if (!material) return null

  const qtyNum = parseFloat(qty) || 0
  const unitCostCents = Math.round((parseFloat(unitCost) || 0) * 100)

  const title =
    type === 'IN' ? t('inventory.receiveStock') : type === 'OUT' ? t('inventory.issueStock') : t('inventory.recordWastage')

  const submit = async () => {
    if (qtyNum <= 0) return
    setSaving(true)
    try {
      // Update material quantity and (on receive) the weighted-average cost.
      let newQty = material.currentQty
      let newAvg = material.avgCost
      if (type === 'IN') {
        newQty = material.currentQty + qtyNum
        newAvg =
          newQty > 0
            ? Math.round((material.currentQty * material.avgCost + qtyNum * unitCostCents) / newQty)
            : unitCostCents
      } else {
        newQty = Math.max(0, material.currentQty - qtyNum)
      }

      await updateMaterial.mutateAsync({ id: material.id, data: { currentQty: newQty, avgCost: newAvg } })
      await addMovement.mutateAsync({
        materialId: material.id,
        materialName_en: material.name_en,
        materialName_am: material.name_am,
        type,
        qty: qtyNum,
        unitCost: type === 'IN' ? unitCostCents : material.avgCost,
        staffId: user?.uid ?? 'unknown',
        note: note.trim(),
        timestamp: serverTimestamp(),
      })
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isAm ? material.name_am : material.name_en} · {t('inventory.currentStock')}:{' '}
            {material.currentQty} {t(`inventory.unit.${material.unit}`)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {t('common.quantity')} ({t(`inventory.unit.${material.unit}`)})
            </Label>
            <Input type="number" step="0.01" min="0" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </div>
          {type === 'IN' && (
            <div className="space-y-2">
              <Label>{t('inventory.avgCost')} (ETB / {t(`inventory.unit.${material.unit}`)})</Label>
              <Input type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {t('common.total')}: {formatCurrency(Math.round(qtyNum * unitCostCents))}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving || qtyNum <= 0}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
