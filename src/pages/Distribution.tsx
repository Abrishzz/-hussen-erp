import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useProductionBatches, useRecipes, useConfirmBatch,
  useWarehouseStock, useActiveBranches, useDistribute, useDistributions,
  useBranchStock, useProducts,
} from '@/hooks/useData'
import { downloadSpreadsheet } from '@/lib/excel'
import { Download } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import { toDate } from '@/lib/analytics'
import { formatDate } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Warehouse, CheckCircle2, Truck, PackageCheck } from 'lucide-react'
import type { DistributionLine, WarehouseStockItem } from '@/types'

export default function Distribution() {
  return <ErrorBoundary><DistributionContent /></ErrorBoundary>
}

function DistributionContent() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Warehouse className="h-6 w-6 text-primary" /> {t('distribution.title')}
        </h1>
        <p className="text-muted-foreground">{t('distribution.subtitle')}</p>
      </div>

      <Tabs defaultValue="confirm">
        <TabsList>
          <TabsTrigger value="confirm">{t('distribution.confirmProduction')}</TabsTrigger>
          <TabsTrigger value="distribute">{t('distribution.warehouseDistribute')}</TabsTrigger>
          <TabsTrigger value="byBranch">{t('distribution.byBranch')}</TabsTrigger>
          <TabsTrigger value="history">{t('distribution.history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="confirm"><ConfirmTab /></TabsContent>
        <TabsContent value="distribute"><DistributeTab /></TabsContent>
        <TabsContent value="byBranch"><ByBranchTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Confirm produced batches into the warehouse ───
function ConfirmTab() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { data: batches } = useProductionBatches()
  const { data: recipes } = useRecipes()
  const { data: products } = useProducts()
  const confirmBatch = useConfirmBatch()
  const [busy, setBusy] = useState<string | null>(null)
  // Manual product choice for orphaned batches (recipe deleted / no product link).
  const [pick, setPick] = useState<Record<string, string>>({})

  const pending = (batches || []).filter((b) => b.status === 'completed' && !b.confirmed)

  /**
   * Resolve the product a batch's output belongs to, most-reliable first:
   * the batch's own productId → its recipe's productId → a product whose name
   * matches → the owner's manual pick. Returns '' when nothing resolves.
   */
  const resolveProduct = (b: typeof pending[number]) => {
    const recipe = recipes?.find((x) => x.id === b.recipeId)
    const byName = products?.find(
      (p) => p.name_en.trim().toLowerCase() === (b.productName_en || '').trim().toLowerCase(),
    )
    const productId = b.productId || recipe?.productId || byName?.id || pick[b.id] || ''
    const chosen = products?.find((p) => p.id === productId)
    return {
      productId,
      name_en: chosen?.name_en || recipe?.productName_en || b.productName_en || '',
      name_am: chosen?.name_am || recipe?.productName_am || b.productName_am || '',
      auto: !!(b.productId || recipe?.productId || byName?.id), // resolved without a manual pick
    }
  }

  const handleConfirm = async (b: typeof pending[number]) => {
    const p = resolveProduct(b)
    if (!p.productId) {
      show(t('distribution.noProductLink'), 'destructive')
      return
    }
    setBusy(b.id)
    try {
      await confirmBatch.mutateAsync({
        batchId: b.id,
        productId: p.productId,
        name_en: p.name_en,
        name_am: p.name_am,
        qty: b.actualQty,
      })
      show(t('distribution.confirmedToast'), 'success')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('distribution.pendingConfirmation')}</CardTitle></CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t('distribution.noPending')}</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('production.product')}</TableHead>
                  <TableHead className="text-right">{t('production.actualQty')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((b) => {
                  const resolved = resolveProduct(b)
                  return (
                    <TableRow key={b.id}>
                      <TableCell>{formatDate(toDate(b.date))}</TableCell>
                      <TableCell className="font-medium">
                        {b.productName_en}
                        {!resolved.auto && (
                          <span className="mt-0.5 block text-xs font-normal text-amber-600 dark:text-amber-500">
                            {t('distribution.pickProductHint')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{b.actualQty}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {/* Orphaned batch: let the owner pick which product it goes into. */}
                          {!resolved.auto && (
                            <Select value={pick[b.id] || ''} onValueChange={(v) => setPick((prev) => ({ ...prev, [b.id]: v }))}>
                              <SelectTrigger className="h-8 w-40"><SelectValue placeholder={t('distribution.selectProduct')} /></SelectTrigger>
                              <SelectContent>
                                {(products || []).map((p) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name_en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button size="sm" disabled={busy === b.id || b.actualQty <= 0 || !resolved.productId}
                            onClick={() => handleConfirm(b)}>
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {busy === b.id ? t('common.saving') : t('distribution.confirm')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Warehouse stock + distribute to branches ───
function DistributeTab() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { data: warehouse } = useWarehouseStock()
  const { data: branches } = useActiveBranches()
  const distribute = useDistribute()

  const available = (warehouse || []).filter((w) => w.qty > 0)
  const [productId, setProductId] = useState('')
  const [qtys, setQtys] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const selected: WarehouseStockItem | undefined = available.find((w) => w.productId === productId)
  const totalToDistribute = Object.values(qtys).reduce((s, v) => s + (parseInt(v) || 0), 0)
  const remaining = (selected?.qty || 0) - totalToDistribute

  const handleDistribute = async () => {
    if (!selected) return
    if (remaining < 0) { show(t('distribution.exceedsWarehouse'), 'destructive'); return }
    const lines: DistributionLine[] = (branches || [])
      .map((b) => ({ branch: b, qty: parseInt(qtys[b.id] || '0') || 0 }))
      .filter((x) => x.qty > 0)
      .map((x) => ({
        branchId: x.branch.id,
        branchName: x.branch.name,
        productId: selected.productId,
        name_en: selected.name_en,
        name_am: selected.name_am,
        qty: x.qty,
      }))
    if (lines.length === 0) { show(t('distribution.enterQty'), 'destructive'); return }
    setSaving(true)
    try {
      await distribute.mutateAsync(lines)
      show(t('distribution.distributedToast'), 'success')
      setQtys({}); setProductId('')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" /> {t('distribution.warehouseStock')}</CardTitle></CardHeader>
        <CardContent>
          {(warehouse || []).length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('production.product')}</TableHead>
                    <TableHead className="text-right">{t('distribution.available')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(warehouse || []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name_en}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={w.qty > 0 ? 'success' : 'secondary'}>{w.qty}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> {t('distribution.distribute')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('production.product')}</label>
            <Select value={productId} onValueChange={(v) => { setProductId(v); setQtys({}) }}>
              <SelectTrigger><SelectValue placeholder={t('distribution.selectProduct')} /></SelectTrigger>
              <SelectContent>
                {available.map((w) => (
                  <SelectItem key={w.productId} value={w.productId}>{w.name_en} ({w.qty})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <>
              <div className="space-y-2">
                {(branches || []).map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm">{b.name}</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-24 text-right"
                      value={qtys[b.id] || ''}
                      onChange={(e) => setQtys({ ...qtys, [b.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">{t('distribution.remainingInWarehouse')}</span>
                <span className={remaining < 0 ? 'font-bold text-destructive' : 'font-bold'}>{remaining}</span>
              </div>
              <Button className="w-full" disabled={saving || remaining < 0 || totalToDistribute === 0} onClick={handleDistribute}>
                <Truck className="mr-2 h-4 w-4" />
                {saving ? t('common.saving') : t('distribution.distribute')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Distribution history ───
function HistoryTab() {
  const { t } = useTranslation()
  const { data: distributions } = useDistributions()

  return (
    <Card>
      <CardHeader><CardTitle>{t('distribution.history')}</CardTitle></CardHeader>
      <CardContent>
        {(distributions || []).length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t('reports.noData')}</p>
        ) : (
          <div className="space-y-4">
            {(distributions || []).map((d) => (
              <div key={d.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{formatDate(toDate(d.createdAt))}</span>
                  <span className="text-xs text-muted-foreground">{d.createdByName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.lines.map((l, i) => (
                    <Badge key={i} variant="secondary">{l.name_en} → {l.branchName}: {l.qty}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * What each branch is currently holding, as a product × branch matrix. This is
 * the "who has what" view — the History tab answers "what was sent when".
 */
function ByBranchTab() {
  const { t } = useTranslation()
  const { data: branches } = useActiveBranches()
  const { data: branchStock } = useBranchStock()
  const { data: warehouse } = useWarehouseStock()

  const activeBranches = branches || []
  // Every product that exists anywhere (warehouse or a branch), by name.
  const products = new Map<string, string>()
  ;(warehouse || []).forEach((w) => products.set(w.productId, w.name_en))
  ;(branchStock || []).forEach((s) => products.set(s.productId, s.name_en))

  const qtyFor = (branchId: string, productId: string) =>
    (branchStock || []).find((s) => s.branchId === branchId && s.productId === productId)?.qty ?? 0

  const rows = [...products.entries()].sort((a, b) => a[1].localeCompare(b[1]))

  const exportRows = rows.map(([pid, name]) => [
    name,
    warehouse?.find((w) => w.productId === pid)?.qty ?? 0,
    ...activeBranches.map((b) => qtyFor(b.id, pid)),
    activeBranches.reduce((n, b) => n + qtyFor(b.id, pid), 0),
  ])

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">{t('reports.noData')}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base sm:text-lg">{t('distribution.byBranch')}</CardTitle>
        <Button size="sm" variant="outline" className="w-full sm:w-auto"
          onClick={() => downloadSpreadsheet(
            `branch-stock-${new Date().toISOString().split('T')[0]}`,
            [t('production.product'), t('distribution.warehouseStock'), ...activeBranches.map((b) => b.name), t('common.total')],
            exportRows
          )}>
          <Download className="mr-1 h-4 w-4" /> {t('reports.excel')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[9rem]">{t('production.product')}</TableHead>
                <TableHead className="text-right">{t('distribution.warehouseStock')}</TableHead>
                {activeBranches.map((b) => (
                  <TableHead key={b.id} className="whitespace-nowrap text-right">{b.name}</TableHead>
                ))}
                <TableHead className="text-right">{t('common.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(([pid, name]) => {
                const atBranches = activeBranches.reduce((n, b) => n + qtyFor(b.id, pid), 0)
                return (
                  <TableRow key={pid}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {warehouse?.find((w) => w.productId === pid)?.qty ?? 0}
                    </TableCell>
                    {activeBranches.map((b) => {
                      const q = qtyFor(b.id, pid)
                      return (
                        <TableCell key={b.id} className={'text-right ' + (q === 0 ? 'text-muted-foreground/50' : 'font-medium')}>
                          {q}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right font-bold">{atBranches}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
