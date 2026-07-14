import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRawMaterials, useStockMovements } from '@/hooks/useData'
import { RawMaterialForm } from '@/features/inventory/RawMaterialForm'
import { StockMovementForm } from '@/features/inventory/StockMovementForm'
import { SupplierManager } from '@/features/inventory/SupplierManager'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus, Pencil, Trash2, ArrowDownUp, AlertTriangle, Package,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useDeleteMaterial } from '@/hooks/useData'
import type { RawMaterial, StockMovement } from '@/types'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: materials, isLoading: matLoading } = useRawMaterials()
  const { data: movements, isLoading: movLoading } = useStockMovements()
  const deleteMaterial = useDeleteMaterial()

  const [formOpen, setFormOpen] = useState(false)
  const [editMaterial, setEditMaterial] = useState<RawMaterial | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [movementOpen, setMovementOpen] = useState(false)
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'WASTE'>('IN')

  const matColumns = [
    { key: 'name', header: t('common.name'), cell: (m: RawMaterial) => (
      <div><p className="font-medium">{m.name_en}</p><p className="text-xs text-muted-foreground font-ethiopic">{m.name_am}</p></div>
    )},
    { key: 'stock', header: t('inventory.currentStock'), cell: (m: RawMaterial) => (
      <span className={m.currentQty <= m.reorderLevel ? 'text-destructive font-bold' : ''}>
        {m.currentQty} {m.unit}
      </span>
    )},
    { key: 'reorder', header: t('inventory.reorderLevel'), cell: (m: RawMaterial) => `${m.reorderLevel} ${m.unit}` },
    { key: 'value', header: t('inventory.stockValue'), cell: (m: RawMaterial) => formatCurrency(m.currentQty * m.avgCost) },
    { key: 'status', header: t('common.status'), cell: (m: RawMaterial) => m.currentQty <= m.reorderLevel
      ? <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />{t('inventory.lowStockAlert')}</Badge>
      : <Badge variant="success">{t('common.active')}</Badge>
    },
    { key: 'actions', header: t('common.actions'), cell: (m: RawMaterial) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMaterial(m); setFormOpen(true) }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(m.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ]

  const movColumns = [
    { key: 'date', header: t('common.date'), cell: (m: StockMovement) => formatDateTime(m.timestamp) },
    { key: 'type', header: t('inventory.type'), cell: (m: StockMovement) => (
      <Badge variant={m.type === 'IN' ? 'success' : m.type === 'WASTE' ? 'destructive' : 'warning'}>
        {t(`inventory.type.${m.type}`)}
      </Badge>
    )},
    { key: 'qty', header: t('common.quantity'), cell: (m: StockMovement) => `${m.qty > 0 ? '+' : ''}${m.qty}` },
    { key: 'note', header: t('common.notes'), cell: (m: StockMovement) => m.note || '-' },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('inventory.title')}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setMovementType('OUT'); setMovementOpen(true) }}>
              <ArrowDownUp className="mr-1 h-4 w-4" /> {t('inventory.issueStock')}
            </Button>
            <Button variant="outline" onClick={() => { setMovementType('WASTE'); setMovementOpen(true) }}>
              <AlertTriangle className="mr-1 h-4 w-4" /> {t('inventory.recordWastage')}
            </Button>
            <Button variant="outline" onClick={() => { setMovementType('IN'); setMovementOpen(true) }}>
              <Package className="mr-1 h-4 w-4" /> {t('inventory.receiveStock')}
            </Button>
            <Button onClick={() => { setEditMaterial(null); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> {t('inventory.addMaterial')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="materials">
          <TabsList>
            <TabsTrigger value="materials">{t('inventory.title')}</TabsTrigger>
            <TabsTrigger value="movements">{t('inventory.movementHistory')}</TabsTrigger>
            <TabsTrigger value="suppliers">{t('inventory.suppliers')}</TabsTrigger>
          </TabsList>
          <TabsContent value="materials">
            <DataTable columns={matColumns} data={materials || []} loading={matLoading} />
          </TabsContent>
          <TabsContent value="movements">
            <DataTable columns={movColumns} data={movements || []} loading={movLoading} pageSize={20} />
          </TabsContent>
          <TabsContent value="suppliers">
            <SupplierManager />
          </TabsContent>
        </Tabs>

        <RawMaterialForm open={formOpen} onOpenChange={setFormOpen} material={editMaterial} />
        <StockMovementForm open={movementOpen} onOpenChange={setMovementOpen} defaultType={movementType} />
        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title={t('common.delete')}
          description="Are you sure you want to deactivate this material?"
          variant="destructive"
          onConfirm={() => deleteId && deleteMaterial.mutate(deleteId)}
        />
      </div>
    </ErrorBoundary>
  )
}
