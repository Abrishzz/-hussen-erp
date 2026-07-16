import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now } from '@/lib/timestamp'
import { useBranches, useAddBranch, useUpdateBranch } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Store, Plus, Pencil, Ban, RotateCcw } from 'lucide-react'
import type { Branch } from '@/types'

export default function Branches() {
  return <ErrorBoundary><BranchesContent /></ErrorBoundary>
}

function BranchesContent() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { data: branches, isLoading } = useBranches()
  const add = useAddBranch()
  const update = useUpdateBranch()

  const [formOpen, setFormOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [toggle, setToggle] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', name_am: '', location: '', phone: '' })

  const openCreate = () => { setEditBranch(null); setForm({ name: '', name_am: '', location: '', phone: '' }); setFormOpen(true) }
  const openEdit = (b: Branch) => {
    setEditBranch(b)
    setForm({ name: b.name, name_am: b.name_am || '', location: b.location || '', phone: b.phone || '' })
    setFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editBranch) {
        await update.mutateAsync({ id: editBranch.id, data: { ...form } })
      } else {
        await add.mutateAsync({ ...form, isActive: true, createdAt: now() })
      }
      show(t('common.success'), 'success')
      setFormOpen(false)
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const confirmToggle = async () => {
    if (!toggle) return
    await update.mutateAsync({ id: toggle.id, data: { isActive: !toggle.isActive } })
    setToggle(null)
  }

  const columns = [
    { key: 'name', header: t('common.name'), cell: (b: Branch) => (
      <div className="flex flex-col">
        <span className="font-medium">{b.name}</span>
        {b.name_am && <span className="text-xs text-muted-foreground">{b.name_am}</span>}
      </div>
    )},
    { key: 'location', header: t('branches.location'), cell: (b: Branch) => b.location || '—' },
    { key: 'phone', header: t('common.phone'), cell: (b: Branch) => b.phone || '—' },
    { key: 'status', header: t('common.status'), cell: (b: Branch) => (
      <Badge variant={b.isActive ? 'success' : 'secondary'}>{b.isActive ? t('common.active') : t('common.inactive')}</Badge>
    )},
    { key: 'actions', header: t('common.actions'), cell: (b: Branch) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className={b.isActive ? 'text-destructive' : ''} onClick={() => setToggle(b)}>
          {b.isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Store className="h-6 w-6 text-primary" /> {t('branches.title')}
          </h1>
          <p className="text-muted-foreground">{t('branches.subtitle')}</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> {t('branches.addBranch')}</Button>
      </div>

      <DataTable columns={columns} data={branches || []} loading={isLoading} />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editBranch ? t('common.edit') : t('branches.addBranch')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('branches.nameEn')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('branches.nameAm')}</Label>
                <Input value={form.name_am} onChange={(e) => setForm({ ...form, name_am: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('branches.location')}</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggle}
        onOpenChange={() => setToggle(null)}
        title={toggle?.isActive ? t('branches.deactivate') : t('branches.activate')}
        description={toggle?.isActive ? t('branches.deactivateConfirm') : t('branches.activateConfirm')}
        variant={toggle?.isActive ? 'destructive' : 'default'}
        onConfirm={confirmToggle}
      />
    </div>
  )
}
