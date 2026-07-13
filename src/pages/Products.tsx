import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Search, Croissant } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProductDialog } from '@/features/products/ProductDialog'
import { useCollection, useDeleteDocument, orderBy } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import type { Product } from '@/types'

export default function Products() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const { data: products, isLoading } = useCollection<Product>('products', [orderBy('name_en')])
  const deleteProduct = useDeleteDocument('products')

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const categories = useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.category).filter(Boolean))).sort(),
    [products]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (products ?? []).filter((p) => {
      const matchesCat = category === 'all' || p.category === category
      const matchesSearch =
        !term ||
        p.name_en.toLowerCase().includes(term) ||
        p.name_am.toLowerCase().includes(term)
      return matchesCat && matchesSearch
    })
  }, [products, search, category])

  const openAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    try {
      await deleteProduct.mutateAsync(toDelete.id)
      toast({ title: t('common.success'), variant: 'success' })
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('products.title')}</h1>
          <p className="text-muted-foreground">{t('products.subtitle')}</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('products.addProduct')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('products.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pos.allCategories')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <Croissant className="h-10 w-10" />
              <p>{t('products.noProducts')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('products.category')}</TableHead>
                    <TableHead className="text-right">{t('common.price')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{isAm ? p.name_am : p.name_en}</div>
                        <div className="text-xs text-muted-foreground font-ethiopic">
                          {isAm ? p.name_en : p.name_am}
                        </div>
                      </TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.price)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? 'success' : 'secondary'}>
                          {p.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setToDelete(p)}
                          >
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

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('products.deleteProduct')}
        description={
          toDelete
            ? t('products.confirmDelete', { name: isAm ? toDelete.name_am : toDelete.name_en })
            : ''
        }
        confirmLabel={t('common.delete')}
        loading={deleteProduct.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
