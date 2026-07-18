import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now, dateToTimestamp } from '@/lib/timestamp'
import {
  useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee,
  useAttendance, useAddAttendance, usePayroll, useAddPayroll,
  useLoans, useAddLoan, useUpdateLoan,
  useHrApprovals, useSubmitHrApproval, useReviewHrApproval,
} from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Pencil, Trash2, UserPlus, ClipboardCheck, Wallet, Download, Plus,
  CheckCircle, XCircle, Clock,
} from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { exportPayrollPDF } from '@/lib/reports'
import { toDate } from '@/lib/analytics'
import { now as tsNow } from '@/lib/timestamp'
import type { Employee, HrApproval } from '@/types'

export default function HR() {
  return <ErrorBoundary><HRContent /></ErrorBoundary>
}

function HRContent() {
  const { t } = useTranslation()
  const { role } = useAuthStore()
  const isOwner = role === 'owner'

  const { data: employees, isLoading } = useEmployees()
  const add = useAddEmployee()
  const update = useUpdateEmployee()
  const remove = useDeleteEmployee()
  const submitApproval = useSubmitHrApproval()
  const { show } = useToast()

  const { data: hrApprovals } = useHrApprovals()
  const pendingCount = hrApprovals?.filter((a) => a.status === 'pending').length ?? 0

  const [formOpen, setFormOpen] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', role: '', phone: '',
    salary: '', salaryType: 'monthly' as 'daily' | 'monthly',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: form.name,
        role: form.role,
        phone: form.phone,
        salary: Math.round(parseFloat(form.salary) * 100),
        salaryType: form.salaryType,
        hireDate: now(),
        isActive: true,
      }
      if (isOwner) {
        // Owner acts directly
        if (editEmp) {
          await update.mutateAsync({ id: editEmp.id, data })
        } else {
          await add.mutateAsync(data)
        }
        show(t('common.saved'), 'success')
      } else {
        // Manager submits for approval
        await submitApproval.mutateAsync({
          type: editEmp ? 'edit_employee' : 'add_employee',
          payload: editEmp ? { id: editEmp.id, data } : { data },
        })
        show('Request submitted for owner approval', 'success')
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    if (isOwner) {
      remove.mutate(deleteId)
      show(t('common.deleted'), 'success')
    } else {
      await submitApproval.mutateAsync({
        type: 'delete_employee',
        payload: { id: deleteId },
      })
      show('Delete request submitted for owner approval', 'success')
    }
    setDeleteId(null)
  }

  const columns = [
    { key: 'name', header: t('common.name'), cell: (e: Employee) => e.name },
    { key: 'role', header: 'Role', cell: (e: Employee) => e.role },
    { key: 'phone', header: t('common.phone'), cell: (e: Employee) => e.phone },
    { key: 'salary', header: t('hr.baseSalary'), cell: (e: Employee) => formatCurrency(e.salary) },
    { key: 'type', header: 'Type', cell: (e: Employee) => (
      <Badge variant="secondary">{t(`hr.salaryType.${e.salaryType}`)}</Badge>
    )},
    { key: 'status', header: t('common.status'), cell: (e: Employee) => (
      <Badge variant={e.isActive ? 'success' : 'secondary'}>{e.isActive ? t('common.active') : t('common.inactive')}</Badge>
    )},
    { key: 'actions', header: t('common.actions'), cell: (e: Employee) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditEmp(e); setForm({ name: e.name, role: e.role, phone: e.phone, salary: (e.salary / 100).toString(), salaryType: e.salaryType }); setFormOpen(true) }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('hr.title')}</h1>
        <Button onClick={() => { setEditEmp(null); setForm({ name: '', role: '', phone: '', salary: '', salaryType: 'monthly' }); setFormOpen(true) }}>
          <UserPlus className="mr-2 h-4 w-4" /> {t('hr.addEmployee')}
          {!isOwner && <span className="ml-1 text-xs opacity-70">(Needs Approval)</span>}
        </Button>
      </div>

      {!isOwner && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Clock className="h-4 w-4 shrink-0" />
          <span>You are viewing HR as a manager. All write actions require <strong>owner approval</strong> before taking effect.</span>
        </div>
      )}

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">{t('hr.employees')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('hr.attendance')}</TabsTrigger>
          <TabsTrigger value="loans">{t('hr.loans.title')}</TabsTrigger>
          <TabsTrigger value="payroll">{t('hr.payroll')}</TabsTrigger>
          {isOwner && (
            <TabsTrigger value="approvals" className="relative">
              Approvals
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="employees">
          <DataTable columns={columns} data={employees || []} loading={isLoading} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceView employees={employees} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="loans">
          <LoansView employees={employees} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollView employees={employees} isOwner={isOwner} />
        </TabsContent>
        {isOwner && (
          <TabsContent value="approvals">
            <ApprovalsView employees={employees} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editEmp ? t('common.edit') : t('common.create')} {t('hr.employees')}
              {!isOwner && <span className="ml-2 text-xs font-normal text-muted-foreground">(Pending Approval)</span>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('hr.baseSalary')} (ETB)</Label>
                <Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common.type')}</Label>
              <Select value={form.salaryType} onValueChange={(v) => setForm({ ...form, salaryType: v as 'daily' | 'monthly' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('hr.salaryType.daily')}</SelectItem>
                  <SelectItem value="monthly">{t('hr.salaryType.monthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.loading') : isOwner ? t('common.save') : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={isOwner ? t('common.delete') : 'Request Employee Removal'}
        description={
          isOwner
            ? 'Are you sure you want to deactivate this employee?'
            : 'This will submit a removal request to the owner for approval.'
        }
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

// ─── Attendance sub-component ───
function AttendanceView({ employees, isOwner }: { employees?: Employee[]; isOwner: boolean }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const addAttendance = useAddAttendance()
  const submitApproval = useSubmitHrApproval()
  const [selectedEmp, setSelectedEmp] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [status, setStatus] = useState<'present' | 'absent' | 'late' | 'half-day'>('present')
  const [saving, setSaving] = useState(false)

  const { data: records } = useAttendance(selectedEmp || undefined)
  const empName = (id: string) => employees?.find((e) => e.id === id)?.name || '—'

  const handleSave = async () => {
    if (!selectedEmp) {
      show(t('hr.selectEmployee'), 'destructive')
      return
    }
    setSaving(true)
    try {
      const payload = {
        empId: selectedEmp,
        date: dateToTimestamp(new Date(date)),
        checkIn,
        checkOut,
        status,
      }
      if (isOwner) {
        await addAttendance.mutateAsync(payload)
        show(t('hr.attendanceSaved'), 'success')
      } else {
        await submitApproval.mutateAsync({
          type: 'add_attendance',
          payload,
        })
        show('Attendance request submitted for owner approval', 'success')
      }
      setCheckIn(''); setCheckOut('')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const statusVariant = (s: string) =>
    s === 'present' ? 'success' : s === 'absent' ? 'destructive' : 'secondary'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Select value={selectedEmp} onValueChange={setSelectedEmp}>
          <SelectTrigger><SelectValue placeholder={t('common.name')} /></SelectTrigger>
          <SelectContent>
            {employees?.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} placeholder={t('hr.checkIn')} />
        <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} placeholder={t('hr.checkOut')} />
        <Select value={status} onValueChange={(v) => setStatus(v as 'present' | 'absent' | 'late' | 'half-day')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="present">{t('hr.attendanceStatus.present')}</SelectItem>
            <SelectItem value="absent">{t('hr.attendanceStatus.absent')}</SelectItem>
            <SelectItem value="late">{t('hr.attendanceStatus.late')}</SelectItem>
            <SelectItem value="half-day">{t('hr.attendanceStatus.half-day')}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSave} disabled={saving}>
          <ClipboardCheck className="mr-2 h-4 w-4" />
          {saving ? t('common.saving') : isOwner ? t('common.save') : 'Submit for Approval'}
        </Button>
      </div>

      {!selectedEmp ? (
        <p className="text-sm text-muted-foreground">{t('hr.attendanceHint')}</p>
      ) : records && records.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('hr.checkIn')}</TableHead>
                <TableHead>{t('hr.checkOut')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(toDate(r.date))}</TableCell>
                  <TableCell>{empName(r.empId)}</TableCell>
                  <TableCell>{r.checkIn || '—'}</TableCell>
                  <TableCell>{r.checkOut || '—'}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{t(`hr.attendanceStatus.${r.status}`)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('reports.noData')}</p>
      )}
    </div>
  )
}

// ─── Loans & advances sub-component ───
function LoansView({ employees, isOwner }: { employees?: Employee[]; isOwner: boolean }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const { data: loans, isLoading } = useLoans()
  const addLoan = useAddLoan()
  const updateLoan = useUpdateLoan()
  const submitApproval = useSubmitHrApproval()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settleId, setSettleId] = useState<string | null>(null)
  const [form, setForm] = useState({
    empId: '', type: 'loan' as 'loan' | 'advance', amount: '', installment: '', reason: '',
  })

  const reset = () => setForm({ empId: '', type: 'loan', amount: '', installment: '', reason: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const emp = employees?.find((x) => x.id === form.empId)
    const principal = Math.round(parseFloat(form.amount || '0') * 100)
    if (!emp || principal <= 0) {
      show(t('hr.loans.invalid'), 'destructive')
      return
    }
    const installment = form.type === 'advance'
      ? principal
      : Math.min(principal, Math.round(parseFloat(form.installment || '0') * 100) || principal)
    setSaving(true)
    try {
      const payload = {
        empId: emp.id,
        empName: emp.name,
        type: form.type,
        principal,
        installment,
        balance: principal,
        reason: form.reason,
        issuedAt: tsNow(),
        status: 'active' as const,
      }
      if (isOwner) {
        await addLoan.mutateAsync(payload)
        show(t('hr.loans.issuedToast', { name: emp.name }), 'success')
      } else {
        await submitApproval.mutateAsync({
          type: 'issue_loan',
          payload,
        })
        show('Loan request submitted for owner approval', 'success')
      }
      setOpen(false)
      reset()
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setSaving(false)
    }
  }

  const settle = async () => {
    if (!settleId) return
    if (isOwner) {
      await updateLoan.mutateAsync({ id: settleId, data: { balance: 0, status: 'settled' } })
    } else {
      await submitApproval.mutateAsync({
        type: 'settle_loan',
        payload: { id: settleId },
      })
      show('Settle request submitted for owner approval', 'success')
    }
    setSettleId(null)
  }

  const totalOutstanding = (loans || []).reduce((s, l) => s + (l.status === 'active' ? l.balance : 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {t('hr.loans.outstanding')}: <span className="font-bold text-foreground">{formatCurrency(totalOutstanding)}</span>
        </div>
        <Button onClick={() => { reset(); setOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> {t('hr.loans.issue')}
          {!isOwner && <span className="ml-1 text-xs opacity-70">(Needs Approval)</span>}
        </Button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
      ) : !loans || loans.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">{t('hr.loans.none')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
                <TableHead className="text-right">{t('hr.loans.principal')}</TableHead>
                <TableHead className="text-right">{t('hr.loans.installment')}</TableHead>
                <TableHead className="text-right">{t('hr.loans.balance')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.empName}</TableCell>
                  <TableCell><Badge variant="secondary">{t(`hr.loans.type.${l.type}`)}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(l.principal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(l.installment)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(l.balance)}</TableCell>
                  <TableCell>{formatDate(toDate(l.issuedAt))}</TableCell>
                  <TableCell>
                    <Badge variant={l.status === 'settled' ? 'success' : 'secondary'}>
                      {t(`hr.loans.status.${l.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === 'active' && (
                      <Button variant="ghost" size="sm" onClick={() => setSettleId(l.id)}>
                        {t('hr.loans.markSettled')}
                        {!isOwner && <span className="ml-1 text-xs opacity-70">*</span>}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('hr.loans.issue')}
              {!isOwner && <span className="ml-2 text-xs font-normal text-muted-foreground">(Pending Approval)</span>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Select value={form.empId} onValueChange={(v) => setForm({ ...form, empId: v })}>
                <SelectTrigger><SelectValue placeholder={t('hr.selectEmployee')} /></SelectTrigger>
                <SelectContent>
                  {employees?.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common.type')}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as 'loan' | 'advance' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="loan">{t('hr.loans.type.loan')}</SelectItem>
                    <SelectItem value="advance">{t('hr.loans.type.advance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.amount')} (ETB)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            {form.type === 'loan' && (
              <div className="space-y-2">
                <Label>{t('hr.loans.installment')} (ETB)</Label>
                <Input type="number" step="0.01" value={form.installment} onChange={(e) => setForm({ ...form, installment: e.target.value })} placeholder={t('hr.loans.installmentHint')} />
              </div>
            )}
            {form.type === 'advance' && (
              <p className="text-xs text-muted-foreground">{t('hr.loans.advanceHint')}</p>
            )}
            <div className="space-y-2">
              <Label>{t('hr.loans.reason')}</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common.saving') : isOwner ? t('hr.loans.issue') : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!settleId}
        onOpenChange={() => setSettleId(null)}
        title={isOwner ? t('hr.loans.markSettled') : 'Request Loan Settlement'}
        description={
          isOwner
            ? t('hr.loans.settleConfirm')
            : 'This will submit a settlement request to the owner for approval.'
        }
        onConfirm={settle}
      />
    </div>
  )
}

interface PayrollLine {
  empId: string
  name: string
  baseSalary: number
  daysWorked: number
  deductions: number
}

// ─── Payroll sub-component ───
function PayrollView({ employees, isOwner }: { employees?: Employee[]; isOwner: boolean }) {
  const { t, i18n } = useTranslation()
  const { show } = useToast()
  const addPayroll = useAddPayroll()
  const updateLoan = useUpdateLoan()
  const submitApproval = useSubmitHrApproval()
  const { data: allLoans } = useLoans()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [lines, setLines] = useState<PayrollLine[]>([])
  const [payingId, setPayingId] = useState<string | null>(null)

  const { data: paid } = usePayroll(month)
  const isPaid = (empId: string) => paid?.some((p) => p.empId === empId) ?? false

  const generate = () => {
    const active = employees || []
    setLines(active.map((e) => ({
      empId: e.id,
      name: e.name,
      baseSalary: e.salary,
      daysWorked: e.salaryType === 'daily' ? 26 : 30,
      deductions: 0,
    })))
  }

  const netPay = (line: PayrollLine, emp?: Employee) => {
    const gross = emp?.salaryType === 'daily'
      ? line.baseSalary * line.daysWorked
      : line.baseSalary
    return Math.max(0, gross - line.deductions)
  }

  const updateLine = (empId: string, patch: Partial<PayrollLine>) =>
    setLines((prev) => prev.map((l) => (l.empId === empId ? { ...l, ...patch } : l)))

  const pay = async (line: PayrollLine) => {
    const emp = employees?.find((e) => e.id === line.empId)
    setPayingId(line.empId)
    try {
      const baseNet = netPay(line, emp)
      const empLoans = (allLoans || []).filter(
        (l) => l.empId === line.empId && l.status === 'active'
      )
      const totalInstallment = empLoans.reduce((s, l) => s + l.installment, 0)
      const loanRepayment = Math.min(totalInstallment, baseNet)

      const payrollPayload = {
        empId: line.empId,
        month,
        baseSalary: line.baseSalary,
        daysWorked: line.daysWorked,
        deductions: line.deductions,
        loanRepayment,
        netPay: baseNet - loanRepayment,
        paidAt: now(),
        loanIds: empLoans.map((l) => l.id),
      }

      if (isOwner) {
        await addPayroll.mutateAsync(payrollPayload)
        for (const loan of empLoans) {
          const deduction = Math.min(loan.installment, loan.balance)
          const newBalance = loan.balance - deduction
          await updateLoan.mutateAsync({
            id: loan.id,
            data: { balance: newBalance, status: newBalance <= 0 ? 'settled' : 'active' },
          })
        }
        show(t('hr.salaryPaid', { name: line.name }), 'success')
      } else {
        await submitApproval.mutateAsync({
          type: 'pay_salary',
          payload: payrollPayload,
        })
        show(`Salary payment for ${line.name} submitted for owner approval`, 'success')
      }
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setPayingId(null)
    }
  }

  const totalNet = lines.reduce((s, l) => {
    const base = netPay(l, employees?.find((e) => e.id === l.empId))
    const empLoans = (allLoans || []).filter((x) => x.empId === l.empId && x.status === 'active')
    const loanDed = Math.min(empLoans.reduce((a, x) => a + x.installment, 0), base)
    return s + base - loanDed
  }, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setLines([]) }} className="max-w-[200px]" />
        <Button onClick={generate}><Wallet className="mr-2 h-4 w-4" /> {t('hr.generatePayroll')}</Button>
        {paid && paid.length > 0 && (
          <Button variant="outline" onClick={() => exportPayrollPDF(paid, i18n.language)}>
            <Download className="mr-2 h-4 w-4" /> {t('reports.payrollSummary')}
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('hr.payrollHint')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead className="text-right">{t('hr.baseSalary')}</TableHead>
                <TableHead className="text-right">{t('hr.daysWorked')}</TableHead>
                <TableHead className="text-right">{t('hr.deductions')}</TableHead>
                <TableHead className="text-right">{t('hr.loans.deduction')}</TableHead>
                <TableHead className="text-right">{t('hr.netPay')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const emp = employees?.find((e) => e.id === l.empId)
                const done = isPaid(l.empId)
                const baseNet = netPay(l, emp)
                const empActiveLoans = (allLoans || []).filter(
                  (x) => x.empId === l.empId && x.status === 'active'
                )
                const totalInstallment = empActiveLoans.reduce((s, x) => s + x.installment, 0)
                const loanDeduction = Math.min(totalInstallment, baseNet)
                const finalNet = baseNet - loanDeduction
                return (
                  <TableRow key={l.empId}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(l.baseSalary)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={l.daysWorked}
                        disabled={done || emp?.salaryType !== 'daily'}
                        onChange={(e) => updateLine(l.empId, { daysWorked: parseInt(e.target.value) || 0 })}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={l.deductions / 100}
                        disabled={done}
                        onChange={(e) => updateLine(l.empId, { deductions: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                        className="ml-auto h-8 w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {loanDeduction > 0 ? (
                        <span className="text-destructive">{formatCurrency(loanDeduction)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(finalNet)}</TableCell>
                    <TableCell className="text-right">
                      {done ? (
                        <Badge variant="success">{t('hr.paid')}</Badge>
                      ) : (
                        <Button size="sm" disabled={payingId === l.empId} onClick={() => pay(l)}>
                          {payingId === l.empId
                            ? t('common.saving')
                            : isOwner ? t('hr.paySalary') : 'Request Pay'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex justify-end gap-6 text-sm">
          <span className="text-muted-foreground">{t('hr.totalPayroll')}:</span>
          <span className="font-bold">{formatCurrency(totalNet)}</span>
        </div>
      )}
    </div>
  )
}

// ─── Owner-only Approvals tab ───
function ApprovalsView({ employees }: { employees?: Employee[] }) {
  const { show } = useToast()
  const { data: approvals, isLoading } = useHrApprovals()
  const reviewApproval = useReviewHrApproval()
  const addEmployee = useAddEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()
  const addAttendance = useAddAttendance()
  const addLoan = useAddLoan()
  const updateLoan = useUpdateLoan()
  const addPayroll = useAddPayroll()

  const [reviewing, setReviewing] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)

  const labelMap: Record<HrApproval['type'], string> = {
    add_employee: 'Add Employee',
    edit_employee: 'Edit Employee',
    delete_employee: 'Remove Employee',
    add_attendance: 'Add Attendance',
    issue_loan: 'Issue Loan/Advance',
    settle_loan: 'Settle Loan',
    pay_salary: 'Pay Salary',
  }

  const executeApproval = async (approval: HrApproval) => {
    const p = approval.payload
    switch (approval.type) {
      case 'add_employee':
        await addEmployee.mutateAsync(p.data as Record<string, unknown>)
        break
      case 'edit_employee':
        await updateEmployee.mutateAsync({ id: p.id as string, data: p.data as Record<string, unknown> })
        break
      case 'delete_employee':
        await deleteEmployee.mutateAsync(p.id as string)
        break
      case 'add_attendance':
        await addAttendance.mutateAsync(p as Parameters<typeof addAttendance.mutateAsync>[0])
        break
      case 'issue_loan':
        await addLoan.mutateAsync(p as Parameters<typeof addLoan.mutateAsync>[0])
        break
      case 'settle_loan':
        await updateLoan.mutateAsync({ id: p.id as string, data: { balance: 0, status: 'settled' } })
        break
      case 'pay_salary': {
        const loanIds = (p.loanIds as string[]) || []
        await addPayroll.mutateAsync(p as Parameters<typeof addPayroll.mutateAsync>[0])
        // Deduct loan repayments (simplified: mark any listed loan balances)
        for (const lid of loanIds) {
          try {
            await updateLoan.mutateAsync({ id: lid, data: { balance: 0, status: 'settled' } })
          } catch { /* best effort */ }
        }
        break
      }
    }
  }

  const handleApprove = async (approval: HrApproval) => {
    setReviewing(approval.id)
    try {
      await executeApproval(approval)
      await reviewApproval.mutateAsync({ id: approval.id, status: 'approved' })
      show('Request approved and applied successfully', 'success')
    } catch {
      show('Failed to apply the request', 'destructive')
    } finally {
      setReviewing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    setReviewing(rejectId)
    try {
      await reviewApproval.mutateAsync({ id: rejectId, status: 'rejected', note: rejectNote })
      show('Request rejected', 'success')
    } finally {
      setReviewing(null)
      setRejectId(null)
      setRejectNote('')
    }
  }

  const statusBadge = (s: HrApproval['status']) => {
    if (s === 'pending') return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>
    if (s === 'approved') return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>
  }

  if (isLoading) {
    return <p className="py-8 text-center text-muted-foreground">Loading...</p>
  }

  if (!approvals || approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckCircle className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">No HR approval requests yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{labelMap[a.type]}</TableCell>
                <TableCell>{a.submittedByName || a.submittedBy}</TableCell>
                <TableCell>{formatDateTime(toDate(a.submittedAt))}</TableCell>
                <TableCell>{statusBadge(a.status)}</TableCell>
                <TableCell className="text-right">
                  {a.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={reviewing === a.id}
                        onClick={() => handleApprove(a)}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {reviewing === a.id ? 'Applying…' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={reviewing === a.id}
                        onClick={() => { setRejectId(a.id); setRejectNote('') }}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {a.status !== 'pending' && a.reviewedByName && (
                    <span className="text-xs text-muted-foreground">by {a.reviewedByName}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason (optional)</Label>
            <Input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Enter reason for rejection…"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
