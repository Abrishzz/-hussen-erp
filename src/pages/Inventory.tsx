import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Truck, MoreVertical, ArrowDownToLine, ArrowUpFromLine, Trash, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { MaterialDialog } from '@/features/inventory/MaterialDialog'
import { StockMovementDialog } from '@/features/inventory/StockMovementDialog'
import { SupplierDialog } from '@/features/inventory/SupplierDialog'
import { useCollection, useDeleteDocument, orderBy } from '@/hooks/useFirestore'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import type { RawMaterial, StockMovement, Supplier } from '@/types'

type MovementType = StockMovement['type']

export default function Inventory() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'

  const { data: materials, isLoading } = useCollection<RawMaterial>('rawMaterials', [orderBy('name_en')])
  const { data: movements } = useCollection<StockMovement>('stockMovements', [orderBy('timestamp', 'desc')])
  const { data: suppliers } = useCollection<Supplier>('suppliers')
  const deleteMaterial = useDeleteDocument('rawMaterials')
  const deleteSupplier = useDeleteDocument('suppliers')

  const [matDialog, setMatDialog] = useState(false)
  const [editingMat, setEditingMat] = useState<RawMaterial | null>(null)
  const [moveDialog, setMoveDialog] = useState(false)
  const [moveType, setMoveType] = useState<MovementType>('IN')
  const [moveMat, setMoveMat] = useState<RawMaterial | null>(null)
  const [supDialog, setSupDialog] = useState(false)
  const [editingSup, setEditingSup] = useState<Supplier | null>(null)
  const [delMat, setDelMat] = useState<RawMaterial | null>(null)
  const [delSup, setDelSup] = useState<Supplier | null>(null)

  const totalValue = useMemo(
    () => (materials ?? []).reduce((s, m) => s + m.currentQty * m.avgCost, 0),
    [materials]
  )
  const lowCount = useMemo(
    () => (materials ?? []).filter((m) => m.currentQty <= m.reorderLevel).length,
    [materials]
  )

  const openMove = (m: RawMaterial, type: MovementType) => {
    setMoveMat(m)
    setMoveType(type)
    setMoveDialog(true)
  }

  const typeBadge = (type: MovementType) =>
    type === 'IN' ? 'success' : type === 'OUT' ? 'secondary' : 'destructive'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">
            {t('inventory.stockValue')}: <span className="font-medium text-foreground">{formatCurrency(totalValue)}</span>
            {lowCount > 0 && <span className="ml-2 text-destructive">· {lowCount} {t('inventory.lowStockAlert')}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingMat(null); setMatDialog(true) }}>
            <Package className="mr-2 h-4 w-4" />
            {t('inventory.addMaterial')}
          </Button>
          <Button variant="outline" onClick={() => { setEditingSup(null); setSupDialog(true) }}>
            <Truck className="mr-2 h-4 w-4" />
            {t('inventory.addSupplier')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="materials">
        <TabsList>
          <TabsTrigger value="materials">{t('inventory.currentStock')}</TabsTrigger>
          <TabsTrigger value="movements">{t('inventory.movementHistory')}</TabsTrigger>
          <TabsTrigger value="suppliers">{t('inventory.suppliers')}</TabsTrigger>
        </TabsList>

        {/* Materials */}
        <TabsContent value="materials">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (materials ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead className="text-right">{t('inventory.currentStock')}</TableHead>
                        <TableHead className="text-right">{t('inventory.avgCost')}</TableHead>
                        <TableHead className="text-right">{t('inventory.stockValue')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(materials ?? []).map((m) => {
                        const low = m.currentQty <= m.reorderLevel
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{isAm ? m.name_am : m.name_en}</TableCell>
                            <TableCell className="text-right">
                              {m.currentQty} {t(`inventory.unit.${m.unit}`)}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(m.avgCost)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(m.currentQty * m.avgCost)}</TableCell>
                            <TableCell>
                              <Badge variant={low ? 'destructive' : 'success'}>
                                {low ? t('inventory.lowStockAlert') : t('common.active')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openMove(m, 'IN')}>
                                    <ArrowDownToLine className="mr-2 h-4 w-4" />{t('inventory.receiveStock')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openMove(m, 'OUT')}>
                                    <ArrowUpFromLine className="mr-2 h-4 w-4" />{t('inventory.issueStock')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openMove(m, 'WASTE')}>
                                    <Trash className="mr-2 h-4 w-4" />{t('inventory.recordWastage')}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => { setEditingMat(m); setMatDialog(true) }}>
                                    <Pencil className="mr-2 h-4 w-4" />{t('common.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDelMat(m)}>
                                    <Trash2 className="mr-2 h-4 w-4" />{t('common.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </TabsContent>

        {/* Movements */}
        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              {(movements ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('inventory.type.IN')}</TableHead>
                        <TableHead className="text-right">{t('common.quantity')}</TableHead>
                        <TableHead>{t('common.notes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(movements ?? []).map((mv) => (
                        <TableRow key={mv.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {mv.timestamp ? formatDateTime(mv.timestamp as unknown as { seconds: number; nanoseconds: number }) : '—'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {isAm ? (mv as { materialName_am?: string }).materialName_am ?? mv.materialId : (mv as { materialName_en?: string }).materialName_en ?? mv.materialId}
                          </TableCell>
                          <TableCell><Badge variant={typeBadge(mv.type)}>{t(`inventory.type.${mv.type}`)}</Badge></TableCell>
                          <TableCell className="text-right">{mv.qty}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{mv.note || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers */}
        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-0">
              {(suppliers ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('common.phone')}</TableHead>
                        <TableHead>{t('common.address')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(suppliers ?? []).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.phone}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{s.address}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditingSup(s); setSupDialog(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDelSup(s)}>
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
      </Tabs>

      <MaterialDialog open={matDialog} onOpenChange={setMatDialog} material={editingMat} />
      <StockMovementDialog open={moveDialog} onOpenChange={setMoveDialog} material={moveMat} type={moveType} />
      <SupplierDialog open={supDialog} onOpenChange={setSupDialog} supplier={editingSup} />

      <ConfirmDialog
        open={!!delMat}
        onOpenChange={(o) => !o && setDelMat(null)}
        title={t('inventory.editMaterial')}
        description={delMat ? (isAm ? delMat.name_am : delMat.name_en) : ''}
        confirmLabel={t('common.delete')}
        loading={deleteMaterial.isPending}
        onConfirm={async () => {
          if (!delMat) return
          try { await deleteMaterial.mutateAsync(delMat.id); toast({ title: t('common.success'), variant: 'success' }) }
          catch { toast({ title: t('common.error'), variant: 'destructive' }) }
          finally { setDelMat(null) }
        }}
      />
      <ConfirmDialog
        open={!!delSup}
        onOpenChange={(o) => !o && setDelSup(null)}
        title={t('inventory.editSupplier')}
        description={delSup?.name ?? ''}
        confirmLabel={t('common.delete')}
        loading={deleteSupplier.isPending}
        onConfirm={async () => {
          if (!delSup) return
          try { await deleteSupplier.mutateAsync(delSup.id); toast({ title: t('common.success'), variant: 'success' }) }
          catch { toast({ title: t('common.error'), variant: 'destructive' }) }
          finally { setDelSup(null) }
        }}
      />
    </div>
  )
}
