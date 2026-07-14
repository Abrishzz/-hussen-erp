import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, Factory, Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { RecipeDialog } from '@/features/production/RecipeDialog'
import { BatchDialog } from '@/features/production/BatchDialog'
import { ConfirmBatchDialog } from '@/features/production/ConfirmBatchDialog'
import { useCollection, useDeleteDocument, orderBy } from '@/hooks/useFirestore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import type { Recipe, ProductionBatch, RawMaterial, FinishedGood } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return new Date((ts as { seconds: number }).seconds * 1000)
  return new Date()
}

export default function Production() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const { data: recipes } = useCollection<Recipe>('recipes', [orderBy('productName_en')])
  const { data: batches } = useCollection<ProductionBatch>('productionBatches', [orderBy('date', 'desc')])
  const { data: materials } = useCollection<RawMaterial>('rawMaterials')
  const { data: finishedGoods } = useCollection<FinishedGood>('finishedGoods')
  const deleteRecipe = useDeleteDocument('recipes')

  const [recipeDialog, setRecipeDialog] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [batchDialog, setBatchDialog] = useState(false)
  const [confirmBatch, setConfirmBatch] = useState<ProductionBatch | null>(null)
  const [delRecipe, setDelRecipe] = useState<Recipe | null>(null)

  const statusBadge = (s: ProductionBatch['status']) =>
    s === 'completed' ? 'success' : s === 'cancelled' ? 'destructive' : s === 'in_progress' ? 'warning' : 'secondary'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('production.title')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingRecipe(null); setRecipeDialog(true) }}>
            <FlaskConical className="mr-2 h-4 w-4" />
            {t('production.addRecipe')}
          </Button>
          <Button variant="outline" onClick={() => setBatchDialog(true)} disabled={(recipes ?? []).length === 0}>
            <Factory className="mr-2 h-4 w-4" />
            {t('production.newBatch')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">{t('production.productionBatches')}</TabsTrigger>
          <TabsTrigger value="recipes">{t('production.recipes')}</TabsTrigger>
          <TabsTrigger value="finished">{t('production.finishedGoods')}</TabsTrigger>
        </TabsList>

        {/* Batches */}
        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              {(batches ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead className="text-right">{t('production.plannedQty')}</TableHead>
                        <TableHead className="text-right">{t('production.actualQty')}</TableHead>
                        <TableHead className="text-right">{t('production.batchCost')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(batches ?? []).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {b.date ? formatDate(tsToDate(b.date)) : '—'}
                          </TableCell>
                          <TableCell className="font-medium">{isAm ? b.productName_am : b.productName_en}</TableCell>
                          <TableCell className="text-right">{b.plannedQty}</TableCell>
                          <TableCell className="text-right">{b.actualQty || '—'}</TableCell>
                          <TableCell className="text-right">{b.cost ? formatCurrency(b.cost) : '—'}</TableCell>
                          <TableCell><Badge variant={statusBadge(b.status)}>{t(`production.status.${b.status}`)}</Badge></TableCell>
                          <TableCell className="text-right">
                            {b.status === 'planned' || b.status === 'in_progress' ? (
                              <Button size="sm" variant="outline" onClick={() => setConfirmBatch(b)}>
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                {t('production.confirmBatch')}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipes */}
        <TabsContent value="recipes">
          <Card>
            <CardContent className="p-0">
              {(recipes ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead className="text-right">{t('production.batchYield')}</TableHead>
                        <TableHead>{t('production.ingredients')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(recipes ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{isAm ? r.productName_am : r.productName_en}</TableCell>
                          <TableCell className="text-right">{r.batchYield}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.ingredients.map((i) => (isAm ? i.materialName_am : i.materialName_en)).filter(Boolean).join(', ')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingRecipe(r); setRecipeDialog(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDelRecipe(r)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finished goods */}
        <TabsContent value="finished">
          <Card>
            <CardContent className="p-0">
              {(finishedGoods ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead className="text-right">{t('inventory.currentStock')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(finishedGoods ?? []).map((g) => (
                        <TableRow key={g.productId}>
                          <TableCell className="font-medium">{isAm ? g.productName_am : g.productName_en}</TableCell>
                          <TableCell className="text-right">{g.currentStock} {g.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecipeDialog open={recipeDialog} onOpenChange={setRecipeDialog} recipe={editingRecipe} materials={materials ?? []} />
      <BatchDialog open={batchDialog} onOpenChange={setBatchDialog} recipes={recipes ?? []} materials={materials ?? []} />
      <ConfirmBatchDialog open={!!confirmBatch} onOpenChange={(o) => !o && setConfirmBatch(null)} batch={confirmBatch} recipes={recipes ?? []} materials={materials ?? []} />
      <ConfirmDialog
        open={!!delRecipe}
        onOpenChange={(o) => !o && setDelRecipe(null)}
        title={t('production.editRecipe')}
        description={delRecipe ? (isAm ? delRecipe.productName_am : delRecipe.productName_en) : ''}
        confirmLabel={t('common.delete')}
        loading={deleteRecipe.isPending}
        onConfirm={async () => {
          if (!delRecipe) return
          try { await deleteRecipe.mutateAsync(delRecipe.id); toast({ title: t('common.success'), variant: 'success' }) }
          catch { toast({ title: t('common.error'), variant: 'destructive' }) }
          finally { setDelRecipe(null) }
        }}
      />
    </div>
  )
}
