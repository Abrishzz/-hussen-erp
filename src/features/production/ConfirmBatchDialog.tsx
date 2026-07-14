import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  writeBatch,
  doc,
  collection,
  increment,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
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
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/utils'
import type { ProductionBatch, Recipe, RawMaterial } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: ProductionBatch | null
  recipes: Recipe[]
  materials: RawMaterial[]
}

export function ConfirmBatchDialog({ open, onOpenChange, batch, recipes, materials }: Props) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [actualQty, setActualQty] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && batch) setActualQty(String(batch.plannedQty))
  }, [open, batch])

  if (!batch) return null
  const recipe = recipes.find((r) => r.id === batch.recipeId)
  const qty = parseFloat(actualQty) || 0
  const multiplier = recipe && recipe.batchYield > 0 ? qty / recipe.batchYield : 0

  let cost = 0
  let insufficient = false
  const needs: { mat: RawMaterial; need: number }[] = []
  if (recipe) {
    for (const ing of recipe.ingredients) {
      const mat = materials.find((m) => m.id === ing.materialId)
      if (!mat) continue
      const need = ing.qtyPerBatch * multiplier
      needs.push({ mat, need })
      cost += Math.round(need * mat.avgCost)
      if (mat.currentQty < need) insufficient = true
    }
  }

  const confirm = async () => {
    if (!recipe || qty <= 0) return
    setSaving(true)
    try {
      const wb = writeBatch(db)
      for (const { mat, need } of needs) {
        wb.update(doc(db, 'rawMaterials', mat.id), { currentQty: increment(-need) })
        wb.set(doc(collection(db, 'stockMovements')), {
          materialId: mat.id,
          materialName_en: mat.name_en,
          materialName_am: mat.name_am,
          type: 'OUT',
          qty: need,
          unitCost: mat.avgCost,
          referenceId: batch.id,
          staffId: user?.uid ?? 'unknown',
          note: `Production: ${recipe.productName_en}`,
          timestamp: serverTimestamp(),
        })
      }
      // Upsert finished goods (keyed by recipe id).
      wb.set(
        doc(db, 'finishedGoods', recipe.id),
        {
          productId: recipe.id,
          productName_en: recipe.productName_en,
          productName_am: recipe.productName_am,
          currentStock: increment(qty),
          unit: 'pcs',
        },
        { merge: true }
      )
      wb.update(doc(db, 'productionBatches', batch.id), { status: 'completed', actualQty: qty, cost })
      await wb.commit()

      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
      queryClient.invalidateQueries({ queryKey: ['productionBatches'] })
      queryClient.invalidateQueries({ queryKey: ['finishedGoods'] })
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
          <DialogTitle>{t('production.confirmBatch')}</DialogTitle>
          <DialogDescription>{batch.productName_en}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('production.actualQty')}</Label>
            <Input type="number" min="0" value={actualQty} onChange={(e) => setActualQty(e.target.value)} autoFocus />
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('production.batchCost')}</span>
              <span className="font-medium">{formatCurrency(cost)}</span>
            </div>
            {insufficient && <p className="mt-2 text-xs text-destructive">{t('production.insufficientMaterials')}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={confirm} disabled={saving || qty <= 0 || insufficient}>
            {saving ? t('common.saving') : t('production.confirmBatch')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
