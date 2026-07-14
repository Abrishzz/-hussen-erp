import { useEffect, useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddDocument } from '@/hooks/useFirestore'
import { useAuthStore } from '@/store/authStore'
import { toast } from '@/store/toastStore'
import { formatCurrency } from '@/lib/utils'
import type { Recipe, RawMaterial } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipes: Recipe[]
  materials: RawMaterial[]
}

export function BatchDialog({ open, onOpenChange, recipes, materials }: Props) {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const user = useAuthStore((s) => s.user)
  const add = useAddDocument('productionBatches')

  const [recipeId, setRecipeId] = useState('')
  const [plannedQty, setPlannedQty] = useState('1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setRecipeId(recipes[0]?.id ?? '')
      setPlannedQty('1')
    }
  }, [open, recipes])

  const recipe = recipes.find((r) => r.id === recipeId)
  const qty = parseFloat(plannedQty) || 0
  const multiplier = recipe && recipe.batchYield > 0 ? qty / recipe.batchYield : 0

  // Estimated cost + material sufficiency check.
  let estCost = 0
  let insufficient = false
  if (recipe) {
    for (const ing of recipe.ingredients) {
      const mat = materials.find((m) => m.id === ing.materialId)
      const need = ing.qtyPerBatch * multiplier
      estCost += Math.round(need * (mat?.avgCost ?? 0))
      if (mat && mat.currentQty < need) insufficient = true
    }
  }

  const submit = async () => {
    if (!recipe || qty <= 0) return
    setSaving(true)
    try {
      await add.mutateAsync({
        recipeId: recipe.id,
        productName_en: recipe.productName_en,
        productName_am: recipe.productName_am,
        plannedQty: qty,
        actualQty: 0,
        status: 'planned',
        staffId: user?.uid ?? 'unknown',
        date: serverTimestamp(),
        cost: 0,
        notes: '',
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
          <DialogTitle>{t('production.newBatch')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('production.recipes')}</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {isAm ? r.productName_am : r.productName_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('production.plannedQty')}</Label>
            <Input type="number" min="1" value={plannedQty} onChange={(e) => setPlannedQty(e.target.value)} />
          </div>
          {recipe && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('production.batchCost')}</span>
                <span className="font-medium">{formatCurrency(estCost)}</span>
              </div>
              {insufficient && (
                <p className="mt-2 text-xs text-destructive">{t('production.insufficientMaterials')}</p>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving || !recipe || qty <= 0}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
