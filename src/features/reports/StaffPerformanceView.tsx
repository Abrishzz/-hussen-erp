import { useTranslation } from 'react-i18next'
import { formatCurrency } from '@/lib/utils'
import { staffPerformance } from '@/lib/analytics'
import type { Sale, SystemUser } from '@/types'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface Props {
  sales: Sale[]
  users?: SystemUser[]
  /** Hide the bar chart (e.g. compact dashboard panel). */
  compact?: boolean
}

/**
 * Staff (cashier) performance table + revenue bar chart. Aggregation is shared
 * via `staffPerformance` so Dashboard, Reports and the Staff Report page match.
 */
export function StaffPerformanceView({ sales, users, compact }: Props) {
  const { t } = useTranslation()
  const rows = staffPerformance(sales, users)

  if (rows.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
  }

  const chartData = rows.map((r) => ({ name: r.name, revenue: r.revenue / 100 }))

  return (
    <div className="space-y-6">
      {!compact && (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
            <Tooltip formatter={(v: unknown) => `ETB ${Number(v).toFixed(2)}`} />
            <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('staffReport.staff')}</TableHead>
              <TableHead className="text-right">{t('pos.orderCount')}</TableHead>
              <TableHead className="text-right">{t('staffReport.itemsSold')}</TableHead>
              <TableHead className="text-right">{t('finance.revenue')}</TableHead>
              <TableHead className="text-right">{t('staffReport.avgOrder')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={r.staffId}>
                <TableCell className="font-medium">
                  {idx === 0 && <span className="mr-1">🏆</span>}{r.name}
                </TableCell>
                <TableCell className="text-right">{r.orders}</TableCell>
                <TableCell className="text-right">{r.itemsSold}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(r.revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.avgOrder)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
