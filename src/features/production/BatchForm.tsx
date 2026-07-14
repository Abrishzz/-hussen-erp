import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now } from '@/lib/timestamp'
import { useRecipes, useRawMaterials, useAddBatch, useUpdateBatch, useUpdateMaterial, useAddMovement } from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { showToast } from '@/components/ui/toaster'
import { AlertTriangle } from 'lucide-react'
import type { ProductionBatch } from '@/types'

interface BatchFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch?: ProductionBatch | null
}

export function BatchForm({ open, onOpenChange, batch }: BatchFormProps) {
  const { t } = useTranslation()
  const { data: recipes } = useRecipes()
  const { data: materials } = useRawMaterials()
  const add = useAddBatch()
  const update = useUpdateBatch()
  const updateMaterial = useUpdateMaterial()
  const addMovement = useAddMovement()
  const { user } = useAuthStore()

  const [recipeId, setRecipeId] = useState(batch?.recipeId || '')
  const [plannedQty, setPlannedQty] = useState(batch?.plannedQty?.toString() || '')
  const [actualQty, setActualQty] = useState(batch?.actualQty?.toString() || batch?.plannedQty?.toString() || '')
  const [notes, setNotes] = useState(batch?.notes || '')
  const [saving, setSaving] = useState(false)

  const selectedRecipe = recipes?.find((r) => r.id === recipeId)

  // Check if materials are sufficient
  const insufficientMaterials = selectedRecipe
    ? selectedRecipe.ingredients.filter((ing) => {
        const mat = materials?.find((m) => m.id === ing.materialId)
        const qtyNeeded = ing.qtyPerBatch * (parseInt(plannedQty) || 0) / selectedRecipe.batchYield
        return !mat || mat.currentQty < qtyNeeded
      })
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipeId || !plannedQty) return
    setSaving(true)
    try {
      const batchData = {
        recipeId,
        productName_en: selectedRecipe?.productName_en || '',
        productName_am: selectedRecipe?.productName_am || '',
        plannedQty: parseInt(plannedQty) || 0,
        actualQty: parseInt(actualQty) || parseInt(plannedQty) || 0,
        status: 'completed' as const,
        staffId: user?.uid || '',
        date: now(),
        cost: 0,
        notes,
      }

      if (batch) {
        await update.mutateAsync({ id: batch.id, data: batchData })
      } else {
        await add.mutateAsync(batchData)

        // Auto-deduct raw materials
        if (selectedRecipe) {
          const multiplier = batchData.actualQty / selectedRecipe.batchYield
          for (const ing of selectedRecipe.ingredients) {
            const qtyNeeded = ing.qtyPerBatch * multiplier
            const mat = materials?.find((m) => m.id === ing.materialId)
            if (mat) {
              await updateMaterial.mutateAsync({
                id: ing.materialId,
                data: { currentQty: Math.max(0, mat.currentQty - qtyNeeded) },
              })
              await addMovement.mutateAsync({
                materialId: ing.materialId,
                type: 'OUT',
                qty: -qtyNeeded,
                note: `Auto-deducted for production: ${selectedRecipe.productName_en}`,
                timestamp: now(),
              })
            }
          }
        }
      }

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
          <DialogTitle>{batch ? t('common.edit') : t('production.newBatch')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('production.recipes')}</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger><SelectValue placeholder="Select recipe" /></SelectTrigger>
              <SelectContent>
                {recipes?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.productName_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('production.plannedQty')}</Label>
              <Input type="number" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('production.actualQty')}</Label>
              <Input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value)} />
            </div>
          </div>

          {insufficientMaterials.length > 0 && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {t('production.insufficientMaterials')}
              </div>
              <ul className="mt-1 text-xs text-destructive/80">
                {insufficientMaterials.map((ing) => (
                  <li key={ing.materialId}>{ing.materialName_en}: need {ing.qtyPerBatch * (parseInt(plannedQty) || 0) / selectedRecipe!.batchYield} {ing.unit}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common.loading') : batch ? t('common.update') : t('production.confirmBatch')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
