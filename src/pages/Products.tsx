import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProducts, useDeleteProduct } from '@/hooks/useData'
import { ProductForm } from '@/features/pos/ProductForm'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

export default function Products() {
  const { t } = useTranslation()
  const { data: products, isLoading } = useProducts()
  const deleteProduct = useDeleteProduct()
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const columns = [
    {
      key: 'image',
      header: '',
      cell: (p: Product) => p.imageUrl
        ? <img src={p.imageUrl} className="h-10 w-10 rounded object-cover" alt="" />
        : <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg">🥖</div>,
    },
    {
      key: 'name',
      header: t('common.name'),
      cell: (p: Product) => (
        <div>
          <p className="font-medium">{p.name_en}</p>
          <p className="text-xs text-muted-foreground font-ethiopic">{p.name_am}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('pos.category'),
      cell: (p: Product) => <Badge variant="secondary">{p.category}</Badge>,
    },
    {
      key: 'price',
      header: t('common.price'),
      cell: (p: Product) => formatCurrency(p.price),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (p: Product) => (
        <Badge variant={p.isActive ? 'success' : 'secondary'}>
          {p.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      cell: (p: Product) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditProduct(p); setFormOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('pos.title')} - {t('common.create')}</h1>
          <Button onClick={() => { setEditProduct(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            {t('common.create')}
          </Button>
        </div>

        <DataTable columns={columns} data={products || []} loading={isLoading} />

        <ProductForm
          open={formOpen}
          onOpenChange={(o) => { setFormOpen(o); if (!o) setEditProduct(null) }}
          product={editProduct}
        />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title={t('common.delete')}
          description="Are you sure you want to deactivate this product?"
          variant="destructive"
          confirmLabel={t('common.delete')}
          onConfirm={() => deleteId && deleteProduct.mutate(deleteId)}
        />
      </div>
    </ErrorBoundary>
  )
}
