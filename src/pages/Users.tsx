import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUsers, useUpdateUser, useRemoveUser, useActiveBranches } from '@/hooks/useData'
import { createUserAccount, updateUserPassword } from '@/lib/userAdmin'
import { useToast } from '@/hooks/useToast'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { UserPlus, ShieldCheck, Ban, RotateCcw, Pencil, Trash2 } from 'lucide-react'
import type { SystemUser, UserRole } from '@/types'

const ROLES: UserRole[] = ['owner', 'manager', 'cashier', 'staff']

export default function Users() {
  return <ErrorBoundary><UsersContent /></ErrorBoundary>
}

function UsersContent() {
  const { t } = useTranslation()
  const { show } = useToast()
  const { data: users, isLoading } = useUsers()
  const { data: branches } = useActiveBranches()
  const updateUser = useUpdateUser()
  const removeUser = useRemoveUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggleUser, setToggleUser] = useState<SystemUser | null>(null)
  const [deleteUser, setDeleteUser] = useState<SystemUser | null>(null)
  const [editUser, setEditUser] = useState<SystemUser | null>(null)
  const [form, setForm] = useState({
    email: '', password: '', displayName: '', phone: '',
    role: 'cashier' as UserRole, branchId: '',
  })

  const branchName = (id?: string) => branches?.find((b) => b.id === id)?.name || '—'

  const resetForm = () =>
    setForm({ email: '', password: '', displayName: '', phone: '', role: 'cashier', branchId: '' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) {
      show(t('users.passwordTooShort'), 'destructive')
      return
    }
    setSaving(true)
    try {
      await createUserAccount(form)
      show(t('users.createdToast', { name: form.displayName || form.email }), 'success')
      setCreateOpen(false)
      resetForm()
    } catch (err) {
      const code = (err as { code?: string })?.code || ''
      const msg = code === 'auth/email-already-in-use'
        ? t('users.emailInUse')
        : (err as Error)?.message || t('users.createFailed')
      show(msg, 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (u: SystemUser, role: UserRole) => {
    if (role === u.role) return
    try {
      await updateUser.mutateAsync({ id: u.id, data: { role } })
      show(t('users.roleUpdated'), 'success')
    } catch {
      show(t('users.updateFailed'), 'destructive')
    }
  }

  const changeBranch = async (u: SystemUser, branchId: string) => {
    try {
      await updateUser.mutateAsync({ id: u.id, data: { branchId } })
      show(t('common.success'), 'success')
    } catch {
      show(t('users.updateFailed'), 'destructive')
    }
  }

  const confirmToggle = async () => {
    if (!toggleUser) return
    try {
      await updateUser.mutateAsync({ id: toggleUser.id, data: { isActive: !toggleUser.isActive } })
      show(t('common.success'), 'success')
    } catch {
      show(t('users.updateFailed'), 'destructive')
    } finally {
      setToggleUser(null)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    if (form.password && form.password.length < 6) {
      show(t('users.passwordTooShort'), 'destructive')
      return
    }
    setSaving(true)
    try {
      await updateUser.mutateAsync({ 
        id: editUser.id, 
        data: { displayName: form.displayName, phone: form.phone } 
      })
      if (form.password) {
        await updateUserPassword(editUser.id, form.password)
      }
      show(t('common.success'), 'success')
      setEditOpen(false)
      setEditUser(null)
    } catch {
      show(t('users.updateFailed'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteUser) return
    try {
      await removeUser.mutateAsync(deleteUser.id)
      show(t('common.deleted'), 'success')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setDeleteUser(null)
    }
  }

  const roleVariant = (role: UserRole) =>
    role === 'owner' ? 'default' : role === 'cashier' ? 'secondary' : 'secondary'

  const columns = [
    { key: 'name', header: t('common.name'), cell: (u: SystemUser) => (
      <div className="flex flex-col">
        <span className="font-medium">{u.displayName || '—'}</span>
        <span className="text-xs text-muted-foreground">{u.email}</span>
      </div>
    )},
    { key: 'phone', header: t('common.phone'), cell: (u: SystemUser) => u.phone || '—' },
    { key: 'role', header: t('users.role'), cell: (u: SystemUser) => (
      <div className="flex items-center gap-2">
        <Badge variant={roleVariant(u.role)} className="capitalize">{t(`users.roles.${u.role}`)}</Badge>
        <Select value={u.role} onValueChange={(v) => changeRole(u, v as UserRole)}>
          <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )},
    { key: 'branch', header: t('branches.branch'), cell: (u: SystemUser) => (
      u.role === 'cashier' ? (
        <Select value={u.branchId || 'none'} onValueChange={(v) => changeBranch(u, v === 'none' ? '' : v)}>
          <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('branches.unassigned')}</SelectItem>
            {branches?.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground">{u.branchId ? branchName(u.branchId) : '—'}</span>
      )
    )},
    { key: 'status', header: t('common.status'), cell: (u: SystemUser) => (
      <Badge variant={u.isActive ? 'success' : 'secondary'}>
        {u.isActive ? t('common.active') : t('common.inactive')}
      </Badge>
    )},
    { key: 'actions', header: t('common.actions'), cell: (u: SystemUser) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
          setEditUser(u)
          setForm({ ...form, displayName: u.displayName || '', phone: u.phone || '', password: '' })
          setEditOpen(true)
        }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${u.isActive ? 'text-amber-500' : 'text-emerald-500'}`}
          onClick={() => setToggleUser(u)}
          title={u.isActive ? t('users.deactivate') : t('users.activate')}
        >
          {u.isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteUser(u)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldCheck className="h-6 w-6 text-primary" /> {t('users.title')}
          </h1>
          <p className="text-muted-foreground">{t('users.subtitle')}</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true) }}>
          <UserPlus className="mr-2 h-4 w-4" /> {t('users.createUser')}
        </Button>
      </div>

      <DataTable columns={columns} data={users || []} loading={isLoading} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.createUser')}</DialogTitle>
            <DialogDescription>{t('users.createHint')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{t('common.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.role === 'cashier' && (
              <div className="space-y-2">
                <Label>{t('branches.branch')}</Label>
                <Select value={form.branchId || 'none'} onValueChange={(v) => setForm({ ...form, branchId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder={t('branches.selectBranch')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('branches.unassigned')}</SelectItem>
                    {branches?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('users.createUser')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleUser}
        onOpenChange={() => setToggleUser(null)}
        title={toggleUser?.isActive ? t('users.deactivate') : t('users.activate')}
        description={toggleUser?.isActive ? t('users.deactivateConfirm') : t('users.activateConfirm')}
        variant={toggleUser?.isActive ? 'destructive' : 'default'}
        onConfirm={confirmToggle}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>New Password (Optional)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} placeholder="Leave blank to keep current" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={() => setDeleteUser(null)}
        title={t('common.delete')}
        description="Are you sure you want to permanently delete this user?"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
