import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useProductionBatches, useRecipes, useConfirmBatch,
  useWarehouseStock, useActiveBranches, useDistribute, useDistributions,
} from '@/hooks/useData'
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
          <TabsTrigger value="history">{t('distribution.history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="confirm"><ConfirmTab /></TabsContent>
        <TabsContent value="distribute"><DistributeTab /></TabsContent>
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
  const confirmBatch = useConfirmBatch()
  const [busy, setBusy] = useState<string | null>(null)

  const pending = (batches || []).filter((b) => b.status === 'completed' && !b.confirmed)

  const productForBatch = (recipeId: string, productIdOnBatch?: string) => {
    const r = recipes?.find((x) => x.id === recipeId)
    return {
      productId: productIdOnBatch || r?.productId || '',
      name_en: r?.productName_en || '',
      name_am: r?.productName_am || '',
    }
  }

  const handleConfirm = async (batchId: string, recipeId: string, qty: number, pid?: string, nameEn?: string, nameAm?: string) => {
    const p = productForBatch(recipeId, pid)
    const productId = p.productId
    if (!productId) {
      show(t('distribution.noProductLink'), 'destructive')
      return
    }
    setBusy(batchId)
    try {
      await confirmBatch.mutateAsync({
        batchId,
        productId,
        name_en: p.name_en || nameEn || '',
        name_am: p.name_am || nameAm || '',
        qty,
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
                {pending.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{formatDate(toDate(b.date))}</TableCell>
                    <TableCell className="font-medium">{b.productName_en}</TableCell>
                    <TableCell className="text-right">{b.actualQty}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={busy === b.id || b.actualQty <= 0}
                        onClick={() => handleConfirm(b.id, b.recipeId, b.actualQty, b.productId, b.productName_en, b.productName_am)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        {busy === b.id ? t('common.saving') : t('distribution.confirm')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
