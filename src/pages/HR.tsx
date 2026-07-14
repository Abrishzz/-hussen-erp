import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import { UserPlus, CalendarCheck, Wallet, Pencil, Trash2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmployeeDialog } from '@/features/hr/EmployeeDialog'
import { AttendanceDialog } from '@/features/hr/AttendanceDialog'
import { useCollection, useDeleteDocument, useAddDocument, orderBy } from '@/hooks/useFirestore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import type { Employee, Attendance, Payroll } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return new Date((ts as { seconds: number }).seconds * 1000)
  return new Date()
}

export default function HR() {
  const { t } = useTranslation()
  const { data: employees, isLoading } = useCollection<Employee>('employees', [orderBy('name')])
  const { data: attendance } = useCollection<Attendance>('attendance', [orderBy('date', 'desc')])
  const { data: payroll } = useCollection<Payroll>('payroll', [orderBy('month', 'desc')])
  const deleteEmployee = useDeleteDocument('employees')
  const addPayroll = useAddDocument('payroll')

  const [empDialog, setEmpDialog] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [toDelete, setToDelete] = useState<Employee | null>(null)
  const [attDialog, setAttDialog] = useState(false)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(false)

  const empName = (id: string) => employees?.find((e) => e.id === id)?.name ?? id

  const workedDays = (empId: string, ym: string) =>
    (attendance ?? []).filter((a) => {
      const d = tsToDate(a.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      return a.empId === empId && key === ym && (a.status === 'present' || a.status === 'late' || a.status === 'half-day')
    }).reduce((s, a) => s + (a.status === 'half-day' ? 0.5 : 1), 0)

  const generatePayroll = async () => {
    const active = (employees ?? []).filter((e) => e.isActive)
    if (active.length === 0) return
    setGenerating(true)
    try {
      const existing = new Set((payroll ?? []).filter((p) => p.month === month).map((p) => p.empId))
      let created = 0
      for (const e of active) {
        if (existing.has(e.id)) continue
        const days = workedDays(e.id, month)
        const netPay = e.salaryType === 'monthly' ? e.salary : Math.round(e.salary * days)
        await addPayroll.mutateAsync({
          empId: e.id,
          month,
          baseSalary: e.salary,
          daysWorked: days,
          deductions: 0,
          netPay,
          paidAt: null,
        })
        created++
      }
      toast({ title: created > 0 ? t('common.success') : t('reports.noData'), variant: created > 0 ? 'success' : 'default' })
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const payslipPdf = (p: Payroll) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Hussen Bakery — Pay Slip', 14, 20)
    doc.setFontSize(11)
    const rows: [string, string][] = [
      [t('hr.employees'), empName(p.empId)],
      ['Month', p.month],
      [t('hr.baseSalary'), formatCurrency(p.baseSalary)],
      [t('hr.daysWorked'), String(p.daysWorked)],
      [t('hr.deductions'), formatCurrency(p.deductions)],
      [t('hr.netPay'), formatCurrency(p.netPay)],
    ]
    let y = 36
    for (const [k, v] of rows) {
      doc.text(k, 14, y)
      doc.text(v, 120, y)
      y += 9
    }
    doc.save(`payslip-${empName(p.empId)}-${p.month}.pdf`)
  }

  const monthPayroll = useMemo(() => (payroll ?? []).filter((p) => p.month === month), [payroll, month])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('hr.title')}</h1>
        <Button onClick={() => { setEditing(null); setEmpDialog(true) }}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('hr.addEmployee')}
        </Button>
      </div>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">{t('hr.employees')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('hr.attendance')}</TabsTrigger>
          <TabsTrigger value="payroll">{t('hr.payroll')}</TabsTrigger>
        </TabsList>

        {/* Employees */}
        <TabsContent value="employees">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
              ) : (employees ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('common.phone')}</TableHead>
                        <TableHead className="text-right">{t('hr.baseSalary')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(employees ?? []).map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell>{e.role}</TableCell>
                          <TableCell>{e.phone}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(e.salary)}
                            <span className="ml-1 text-xs text-muted-foreground">/{t(`hr.salaryType.${e.salaryType}`)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setEmpDialog(true) }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setToDelete(e)}>
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

        {/* Attendance */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('hr.attendance')}</CardTitle>
              <Button size="sm" onClick={() => setAttDialog(true)} disabled={(employees ?? []).length === 0}>
                <CalendarCheck className="mr-2 h-4 w-4" />
                {t('hr.attendance')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {(attendance ?? []).length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('hr.employees')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('hr.checkIn')}</TableHead>
                        <TableHead>{t('hr.checkOut')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(attendance ?? []).slice(0, 50).map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(tsToDate(a.date))}</TableCell>
                          <TableCell className="font-medium">{empName(a.empId)}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'present' ? 'success' : a.status === 'absent' ? 'destructive' : 'warning'}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{a.checkIn || '—'}</TableCell>
                          <TableCell>{a.checkOut || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">{t('hr.payroll')}</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />
                <Button size="sm" onClick={generatePayroll} disabled={generating || (employees ?? []).length === 0}>
                  <Wallet className="mr-2 h-4 w-4" />
                  {generating ? t('common.saving') : t('hr.generatePayroll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {monthPayroll.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('hr.employees')}</TableHead>
                        <TableHead className="text-right">{t('hr.baseSalary')}</TableHead>
                        <TableHead className="text-right">{t('hr.daysWorked')}</TableHead>
                        <TableHead className="text-right">{t('hr.netPay')}</TableHead>
                        <TableHead className="text-right">{t('hr.paySlip')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthPayroll.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{empName(p.empId)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.baseSalary)}</TableCell>
                          <TableCell className="text-right">{p.daysWorked}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(p.netPay)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => payslipPdf(p)}>
                              <FileText className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      <EmployeeDialog open={empDialog} onOpenChange={setEmpDialog} employee={editing} />
      <AttendanceDialog open={attDialog} onOpenChange={setAttDialog} employees={employees ?? []} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={t('hr.editEmployee')}
        description={toDelete?.name ?? ''}
        confirmLabel={t('common.delete')}
        loading={deleteEmployee.isPending}
        onConfirm={async () => {
          if (!toDelete) return
          try { await deleteEmployee.mutateAsync(toDelete.id); toast({ title: t('common.success'), variant: 'success' }) }
          catch { toast({ title: t('common.error'), variant: 'destructive' }) }
          finally { setToDelete(null) }
        }}
      />
    </div>
  )
}
