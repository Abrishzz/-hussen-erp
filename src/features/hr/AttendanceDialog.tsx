import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Timestamp } from 'firebase/firestore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAddDocument } from '@/hooks/useFirestore'
import { toast } from '@/store/toastStore'
import type { Employee, Attendance } from '@/types'

const STATUSES: Attendance['status'][] = ['present', 'absent', 'late', 'half-day']

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: Employee[]
}

export function AttendanceDialog({ open, onOpenChange, employees }: Props) {
  const { t } = useTranslation()
  const add = useAddDocument('attendance')

  const [empId, setEmpId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<Attendance['status']>('present')
  const [checkIn, setCheckIn] = useState('08:00')
  const [checkOut, setCheckOut] = useState('17:00')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEmpId(employees[0]?.id ?? '')
      setDate(new Date().toISOString().slice(0, 10))
      setStatus('present')
    }
  }, [open, employees])

  const submit = async () => {
    if (!empId) return
    setSaving(true)
    try {
      await add.mutateAsync({
        empId,
        date: Timestamp.fromDate(new Date(date)),
        status,
        checkIn: status === 'absent' ? '' : checkIn,
        checkOut: status === 'absent' ? '' : checkOut,
      })
      toast({ title: t('common.success'), variant: 'success' })
      onOpenChange(false)
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const statusLabel: Record<Attendance['status'], string> = {
    present: t('common.active'),
    absent: t('common.inactive'),
    late: t('hr.checkIn'),
    'half-day': t('hr.salaryType.daily'),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('hr.attendance')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('hr.employees')}</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.date')}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Attendance['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {status !== 'absent' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('hr.checkIn')}</Label>
                <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('hr.checkOut')}</Label>
                <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving || !empId}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
