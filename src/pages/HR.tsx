import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { now, dateToTimestamp } from '@/lib/timestamp'
import {
  useEmployees, useAddEmployee, useUpdateEmployee, useDeleteEmployee,
  useAttendance, useAddAttendance, usePayroll, useAddPayroll,
} from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
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
import { Pencil, Trash2, UserPlus, ClipboardCheck, Wallet, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportPayrollPDF } from '@/lib/reports'
import { toDate } from '@/lib/analytics'
import type { Employee } from '@/types'

export default function HR() {
  return <ErrorBoundary><HRContent /></ErrorBoundary>
}

function HRContent() {
  const { t } = useTranslation()
  const { data: employees, isLoading } = useEmployees()
  const add = useAddEmployee()
  const update = useUpdateEmployee()
  const remove = useDeleteEmployee()

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
      if (editEmp) {
        await update.mutateAsync({ id: editEmp.id, data })
      } else {
        await add.mutateAsync(data)
      }
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
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
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">{t('hr.employees')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('hr.attendance')}</TabsTrigger>
          <TabsTrigger value="payroll">{t('hr.payroll')}</TabsTrigger>
        </TabsList>
        <TabsContent value="employees">
          <DataTable columns={columns} data={employees || []} loading={isLoading} />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceView employees={employees} />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollView employees={employees} />
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editEmp ? t('common.edit') : t('common.create')} {t('hr.employees')}</DialogTitle>
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
              <Button type="submit" disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title={t('common.delete')}
        description="Are you sure you want to deactivate this employee?"
        variant="destructive"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </div>
  )
}

// Attendance sub-component
function AttendanceView({ employees }: { employees?: Employee[] }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const addAttendance = useAddAttendance()
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
      await addAttendance.mutateAsync({
        empId: selectedEmp,
        date: dateToTimestamp(new Date(date)),
        checkIn,
        checkOut,
        status,
      })
      show(t('hr.attendanceSaved'), 'success')
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
          <ClipboardCheck className="mr-2 h-4 w-4" /> {saving ? t('common.saving') : t('common.save')}
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

interface PayrollLine {
  empId: string
  name: string
  baseSalary: number
  daysWorked: number
  deductions: number
}

// Payroll sub-component
function PayrollView({ employees }: { employees?: Employee[] }) {
  const { t, i18n } = useTranslation()
  const { show } = useToast()
  const addPayroll = useAddPayroll()
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

  const update = (empId: string, patch: Partial<PayrollLine>) =>
    setLines((prev) => prev.map((l) => (l.empId === empId ? { ...l, ...patch } : l)))

  const pay = async (line: PayrollLine) => {
    const emp = employees?.find((e) => e.id === line.empId)
    setPayingId(line.empId)
    try {
      await addPayroll.mutateAsync({
        empId: line.empId,
        month,
        baseSalary: line.baseSalary,
        daysWorked: line.daysWorked,
        deductions: line.deductions,
        netPay: netPay(line, emp),
        paidAt: now(),
      })
      show(t('hr.salaryPaid', { name: line.name }), 'success')
    } catch {
      show(t('common.error'), 'destructive')
    } finally {
      setPayingId(null)
    }
  }

  const totalNet = lines.reduce((s, l) => s + netPay(l, employees?.find((e) => e.id === l.empId)), 0)

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
                <TableHead className="text-right">{t('hr.netPay')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => {
                const emp = employees?.find((e) => e.id === l.empId)
                const done = isPaid(l.empId)
                return (
                  <TableRow key={l.empId}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(l.baseSalary)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={l.daysWorked}
                        disabled={done || emp?.salaryType !== 'daily'}
                        onChange={(e) => update(l.empId, { daysWorked: parseInt(e.target.value) || 0 })}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={l.deductions / 100}
                        disabled={done}
                        onChange={(e) => update(l.empId, { deductions: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                        className="ml-auto h-8 w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(netPay(l, emp))}</TableCell>
                    <TableCell className="text-right">
                      {done ? (
                        <Badge variant="success">{t('hr.paid')}</Badge>
                      ) : (
                        <Button size="sm" disabled={payingId === l.empId} onClick={() => pay(l)}>
                          {payingId === l.empId ? t('common.saving') : t('hr.paySalary')}
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
