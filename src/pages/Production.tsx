import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRecipes, useProductionBatches, useFinishedGoods } from '@/hooks/useData'
import { RecipeForm } from '@/features/production/RecipeForm'
import { BatchForm } from '@/features/production/BatchForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlaskConical, Factory, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDeleteRecipe } from '@/hooks/useData'
import type { Recipe, ProductionBatch, FinishedGood } from '@/types'

export default function Production() {
  const { t, i18n } = useTranslation()
  const { data: recipes, isLoading: recLoading } = useRecipes()
  const { data: batches, isLoading: batchLoading } = useProductionBatches()
  const { data: finishedGoods, isLoading: fgLoading } = useFinishedGoods()
  const deleteRecipe = useDeleteRecipe()

  const [recipeFormOpen, setRecipeFormOpen] = useState(false)
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null)
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null)
  const [batchFormOpen, setBatchFormOpen] = useState(false)
  const [editBatch, setEditBatch] = useState<ProductionBatch | null>(null)

  const statusBadge = (s: string) => {
    const variant = s === 'completed' ? 'success' as const : s === 'cancelled' ? 'destructive' as const : s === 'planned' ? 'warning' as const : 'secondary' as const
    return <Badge variant={variant}>{t(`production.status.${s}`)}</Badge>
  }

  const recipeColumns = [
    { key: 'name', header: t('common.name'), cell: (r: Recipe) => (
      <div><p>{i18n.language === 'am' ? r.productName_am : r.productName_en}</p></div>
    )},
    { key: 'yield', header: t('production.batchYield'), cell: (r: Recipe) => `${r.batchYield} pcs` },
    { key: 'ingredients', header: t('production.ingredients'), cell: (r: Recipe) => r.ingredients.length.toString() },
    { key: 'actions', header: t('common.actions'), cell: (r: Recipe) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRecipe(r); setRecipeFormOpen(true) }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteRecipeId(r.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ]

  const batchColumns = [
    { key: 'product', header: t('common.name'), cell: (b: ProductionBatch) => i18n.language === 'am' ? b.productName_am : b.productName_en },
    { key: 'planned', header: t('production.plannedQty'), cell: (b: ProductionBatch) => b.plannedQty },
    { key: 'actual', header: t('production.actualQty'), cell: (b: ProductionBatch) => b.actualQty },
    { key: 'cost', header: t('production.batchCost'), cell: (b: ProductionBatch) => formatCurrency(b.cost) },
    { key: 'date', header: t('common.date'), cell: (b: ProductionBatch) => formatDate(b.date) },
    { key: 'status', header: t('common.status'), cell: (b: ProductionBatch) => statusBadge(b.status) },
    { key: 'actions', header: t('common.actions'), cell: (b: ProductionBatch) => (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditBatch(b); setBatchFormOpen(true) }}>
        <Pencil className="h-4 w-4" />
      </Button>
    )},
  ]

  const fgColumns = [
    { key: 'name', header: t('common.name'), cell: (f: FinishedGood) => i18n.language === 'am' ? f.productName_am : f.productName_en },
    { key: 'stock', header: t('inventory.currentStock'), cell: (f: FinishedGood) => `${f.currentStock} ${f.unit}` },
    { key: 'id', header: '', cell: () => '' },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('production.title')}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBatchFormOpen(true)}>
              <Factory className="mr-1 h-4 w-4" /> {t('production.newBatch')}
            </Button>
            <Button onClick={() => { setEditRecipe(null); setRecipeFormOpen(true) }}>
              <FlaskConical className="mr-2 h-4 w-4" /> {t('production.addRecipe')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="batches">
          <TabsList>
            <TabsTrigger value="batches">{t('production.productionBatches')}</TabsTrigger>
            <TabsTrigger value="recipes">{t('production.recipes')}</TabsTrigger>
            <TabsTrigger value="finished">{t('production.finishedGoods')}</TabsTrigger>
          </TabsList>
          <TabsContent value="batches">
            <DataTable columns={batchColumns} data={batches || []} loading={batchLoading} />
          </TabsContent>
          <TabsContent value="recipes">
            <DataTable columns={recipeColumns} data={recipes || []} loading={recLoading} />
          </TabsContent>
          <TabsContent value="finished">
            <DataTable columns={fgColumns} data={finishedGoods || []} loading={fgLoading} />
          </TabsContent>
        </Tabs>

        <RecipeForm open={recipeFormOpen} onOpenChange={setRecipeFormOpen} recipe={editRecipe} />
        <BatchForm open={batchFormOpen} onOpenChange={setBatchFormOpen} batch={editBatch} />
        <ConfirmDialog
          open={!!deleteRecipeId}
          onOpenChange={() => setDeleteRecipeId(null)}
          title={t('common.delete')}
          description="Are you sure you want to delete this recipe?"
          variant="destructive"
          onConfirm={() => deleteRecipeId && deleteRecipe.mutate(deleteRecipeId)}
        />
      </div>
    </ErrorBoundary>
  )
}
