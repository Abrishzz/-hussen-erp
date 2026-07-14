import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import { Download, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCollection, orderBy } from '@/hooks/useFirestore'
import { formatCurrency } from '@/lib/utils'
import type { Sale, Expense, RawMaterial } from '@/types'

function tsToDate(ts: unknown): Date {
  if (ts && typeof ts === 'object' && 'seconds' in ts) return new Date((ts as { seconds: number }).seconds * 1000)
  return new Date()
}

export default function Reports() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const { data: sales } = useCollection<Sale>('sales', [orderBy('timestamp', 'desc')])
  const { data: expenses } = useCollection<Expense>('expenses')
  const { data: materials } = useCollection<RawMaterial>('rawMaterials')

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10))
  const [to, setTo] = useState(today.toISOString().slice(0, 10))

  const range = useMemo(() => {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [from, to])

  const inRange = (d: Date) => d >= range.start && d <= range.end

  const report = useMemo(() => {
    const completed = (sales ?? []).filter((s) => s.status === 'completed' && inRange(tsToDate(s.timestamp)))
    const revenue = completed.reduce((s, x) => s + (x.total || 0), 0)
    const orders = completed.length
    const rangeExpenses = (expenses ?? []).filter((e) => inRange(tsToDate(e.date)))
    const expenseTotal = rangeExpenses.reduce((s, e) => s + (e.amount || 0), 0)

    const productMap = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const s of completed) {
      for (const it of s.items || []) {
        const name = isAm ? it.name_am || it.name_en : it.name_en
        const e = productMap.get(it.productId) ?? { name, qty: 0, revenue: 0 }
        e.qty += it.quantity
        e.revenue += it.total
        productMap.set(it.productId, e)
      }
    }
    const bestSellers = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 8)

    const expenseByCat = new Map<string, number>()
    for (const e of rangeExpenses) expenseByCat.set(e.category, (expenseByCat.get(e.category) ?? 0) + e.amount)

    return { revenue, orders, expenseTotal, net: revenue - expenseTotal, bestSellers, expenseByCat }
  }, [sales, expenses, from, to, isAm])

  const stockValue = (materials ?? []).reduce((s, m) => s + m.currentQty * m.avgCost, 0)

  const exportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Hussen Bakery — Report', 14, 18)
    doc.setFontSize(10)
    doc.text(`${from} → ${to}`, 14, 26)
    const rows: [string, string][] = [
      [t('finance.revenue'), formatCurrency(report.revenue)],
      [t('pos.orderCount'), String(report.orders)],
      [t('finance.expenses'), formatCurrency(report.expenseTotal)],
      [t('finance.netProfit'), formatCurrency(report.net)],
      [t('inventory.stockValue'), formatCurrency(stockValue)],
    ]
    let y = 40
    for (const [k, v] of rows) { doc.text(k, 14, y); doc.text(v, 120, y); y += 9 }
    y += 4
    doc.setFontSize(12); doc.text(t('reports.bestSellers'), 14, y); y += 8
    doc.setFontSize(10)
    for (const b of report.bestSellers) { doc.text(`${b.name}`, 14, y); doc.text(`${b.qty}`, 120, y); doc.text(formatCurrency(b.revenue), 150, y); y += 8 }
    doc.save(`report-${from}-${to}.pdf`)
  }

  const summary = [
    { label: t('finance.revenue'), value: formatCurrency(report.revenue) },
    { label: t('pos.orderCount'), value: String(report.orders) },
    { label: t('finance.expenses'), value: formatCurrency(report.expenseTotal) },
    { label: t('finance.netProfit'), value: formatCurrency(report.net) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.dateRange')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t('common.from')}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('common.to')}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <Button onClick={exportPdf}>
            <Download className="mr-2 h-4 w-4" />
            {t('reports.exportPdf')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t('reports.bestSellers')}</CardTitle></CardHeader>
          <CardContent className="h-72">
            {report.bestSellers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <BarChart3 className="mr-2 h-6 w-6" />{t('reports.noData')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.bestSellers} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)' }}
                    contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)' }}
                  />
                  <Bar dataKey="qty" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('finance.expenses')}</CardTitle></CardHeader>
          <CardContent className="p-0">
            {report.expenseByCat.size === 0 ? (
              <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(report.expenseByCat.entries()).map(([cat, amt]) => (
                    <TableRow key={cat}>
                      <TableCell>{t(`finance.categories.${cat}`, cat)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(amt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t('reports.bestSellers')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {report.bestSellers.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('reports.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead className="text-right">{t('common.quantity')}</TableHead>
                    <TableHead className="text-right">{t('finance.revenue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.bestSellers.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-right">{b.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(b.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
