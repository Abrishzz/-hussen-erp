import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProducts, useRawMaterials, useAddRecipe, useUpdateRecipe } from '@/hooks/useData'
import { showToast } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { Recipe, RecipeIngredient } from '@/types'

interface RecipeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe?: Recipe | null
}

export function RecipeForm({ open, onOpenChange, recipe }: RecipeFormProps) {
  const { t } = useTranslation()
  const { data: products } = useProducts()
  const { data: materials } = useRawMaterials()
  const add = useAddRecipe()
  const update = useUpdateRecipe()

  const [productId, setProductId] = useState(recipe?.productId || '')
  const [batchYield, setBatchYield] = useState(recipe?.batchYield?.toString() || '1')
  const [instructions, setInstructions] = useState(recipe?.instructions || '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  )
  const [saving, setSaving] = useState(false)

  // The dialog stays mounted and only `open` toggles, so the useState initial
  // values are captured once (while `recipe` was still null) — that's what made
  // "Edit" open a blank form and reopening keep the previous entry's values.
  // Re-seed the fields whenever it opens.
  useEffect(() => {
    if (!open) return
    setProductId(recipe?.productId || '')
    setBatchYield(recipe?.batchYield?.toString() || '1')
    setInstructions(recipe?.instructions || '')
    setIngredients(recipe?.ingredients ? [...recipe.ingredients] : [])
  }, [open, recipe])

  const selectedProduct = products?.find((p) => p.id === productId)

  const addIngredient = () => {
    setIngredients([...ingredients, { materialId: '', materialName_en: '', materialName_am: '', qtyPerBatch: 0, unit: '' }])
  }

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'materialId') {
      const mat = materials?.find((m) => m.id === value)
      if (mat) {
        updated[index].materialName_en = mat.name_en
        updated[index].materialName_am = mat.name_am
        updated[index].unit = mat.unit
      }
    }
    setIngredients(updated)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Tell the user why nothing saved instead of silently bailing.
    if (!productId) {
      showToast(t('production.selectProductFirst'), 'destructive')
      return
    }
    if (ingredients.length === 0 || ingredients.some((ing) => !ing.materialId)) {
      showToast(t('production.addIngredientFirst'), 'destructive')
      return
    }
    setSaving(true)
    try {
      const data = {
        productId,
        productName_en: selectedProduct?.name_en || '',
        productName_am: selectedProduct?.name_am || '',
        ingredients,
        batchYield: parseInt(batchYield) || 1,
        instructions,
      }
      if (recipe) {
        await update.mutateAsync({ id: recipe.id, data })
      } else {
        await add.mutateAsync(data)
      }
      showToast(t('common.success'), 'success')
      onOpenChange(false)
    } catch {
      showToast(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? t('common.edit') : t('common.create')} {t('production.recipes')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('production.product')}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder={t('production.selectProduct')} /></SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('production.batchYield')}</Label>
            <Input type="number" value={batchYield} onChange={(e) => setBatchYield(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('production.ingredients')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="mr-1 h-3 w-3" /> {t('common.add')}
              </Button>
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-end gap-2 rounded-lg border p-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{t('common.name')}</Label>
                  <Select value={ing.materialId} onValueChange={(v) => updateIngredient(i, 'materialId', v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {materials?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  <Label className="text-xs">{t('common.quantity')}</Label>
                  <Input type="number" step="0.01" className="h-8 text-xs" value={ing.qtyPerBatch || ''}
                    onChange={(e) => updateIngredient(i, 'qtyPerBatch', parseFloat(e.target.value) || 0)} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeIngredient(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} />
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
