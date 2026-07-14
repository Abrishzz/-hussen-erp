import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSuppliers, useAddSupplier, useUpdateSupplier } from '@/hooks/useData'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'
import { useDeleteSupplier } from '@/hooks/useData'
import type { Supplier } from '@/types'

export function SupplierManager() {
  const { t } = useTranslation()
  const { data: suppliers, isLoading } = useSuppliers()
  const add = useAddSupplier()
  const update = useUpdateSupplier()
  const remove = useDeleteSupplier()
  const [formOpen, setFormOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form, productsSupplied: [], isActive: true }
      if (editSupplier) {
        await update.mutateAsync({ id: editSupplier.id, data })
      } else {
        await add.mutateAsync(data)
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'name', header: t('common.name'), cell: (s: Supplier) => s.name },
    { key: 'phone', header: t('common.phone'), cell: (s: Supplier) => s.phone },
    { key: 'address', header: t('common.address'), cell: (s: Supplier) => s.address },
    {
      key: 'status', header: t('common.status'),
      cell: (s: Supplier) => <Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? t('common.active') : t('common.inactive')}</Badge>,
    },
    {
      key: 'actions', header: t('common.actions'),
      cell: (s: Supplier) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditSupplier(s); setForm(s); setFormOpen(true) }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Truck className="h-5 w-5" /> {t('inventory.suppliers')}
        </h3>
        <Button size="sm" onClick={() => { setEditSupplier(null); setForm({ name: '', phone: '', address: '' }); setFormOpen(true) }}>
          <Plus className="mr-1 h-4 w-4" /> {t('inventory.addSupplier')}
        </Button>
      </div>

      <DataTable columns={columns} data={suppliers || []} loading={isLoading} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSupplier ? t('common.edit') : t('common.create')} {t('inventory.suppliers')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('common.address')}</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t('common.delete')}
        description="Are you sure you want to deactivate this supplier?"
        variant="destructive"
        confirmLabel={t('common.delete')}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  )
}
