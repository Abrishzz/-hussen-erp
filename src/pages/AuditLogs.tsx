import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useSales, useDistributions, useCashCloses, useProductionBatches,
  useExpenses, useOrders, useInquiries, useUsers,
} from '@/hooks/useData'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toDate } from '@/lib/analytics'
import { formatCurrency } from '@/lib/utils'
import { downloadSpreadsheet } from '@/lib/excel'
import {
  ScrollText, Search, Download, ShoppingCart, Truck, Banknote, Factory,
  Wallet, ClipboardList, MessageSquare,
} from 'lucide-react'

/** Every activity stream we can reconstruct from existing collections. */
type LogKind = 'sale' | 'distribution' | 'cashClose' | 'production' | 'expense' | 'order' | 'inquiry'

interface LogEntry {
  id: string
  kind: LogKind
  at: Date
  actor: string
  summary: string
  detail: string
  amount?: number
}

const KIND_META: Record<LogKind, { icon: React.ElementType; labelKey: string; cls: string }> = {
  sale: { icon: ShoppingCart, labelKey: 'audit.kinds.sale', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  distribution: { icon: Truck, labelKey: 'audit.kinds.distribution', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
  cashClose: { icon: Banknote, labelKey: 'audit.kinds.cashClose', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  production: { icon: Factory, labelKey: 'audit.kinds.production', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  expense: { icon: Wallet, labelKey: 'audit.kinds.expense', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400' },
  order: { icon: ClipboardList, labelKey: 'audit.kinds.order', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' },
  inquiry: { icon: MessageSquare, labelKey: 'audit.kinds.inquiry', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300' },
}

export default function AuditLogs() {
  return <ErrorBoundary><AuditLogsContent /></ErrorBoundary>
}

function AuditLogsContent() {
  const { t } = useTranslation()
  const { data: sales } = useSales()
  const { data: distributions } = useDistributions()
  const { data: closes } = useCashCloses()
  const { data: batches } = useProductionBatches()
  const { data: expenses } = useExpenses()
  const { data: orders } = useOrders()
  const { data: inquiries } = useInquiries()
  const { data: users } = useUsers()

  const [search, setSearch] = useState('')
  const [kinds, setKinds] = useState<Set<LogKind>>(new Set())
  const [limit, setLimit] = useState(100)

  const userName = (uid?: string) =>
    users?.find((u) => u.id === uid)?.displayName || (uid ? uid.slice(0, 6) : '—')

  /** Fold every collection into one time-ordered activity feed. */
  const entries = useMemo<LogEntry[]>(() => {
    const out: LogEntry[] = []

    for (const s of sales || []) {
      out.push({
        id: `sale-${s.id}`,
        kind: 'sale',
        at: toDate(s.timestamp),
        actor: userName(s.cashierId),
        summary: t('audit.saleSummary', { count: s.items?.length ?? 0 }),
        detail: `${s.paymentMethod}${s.status === 'voided' ? ' · voided' : ''}`,
        amount: s.total,
      })
    }

    for (const d of distributions || []) {
      out.push({
        id: `dist-${d.id}`,
        kind: 'distribution',
        at: toDate(d.createdAt),
        actor: d.createdByName || userName(d.createdBy),
        summary: t('audit.distributionSummary', { count: d.lines?.length ?? 0 }),
        detail: (d.lines || []).slice(0, 4).map((l) => `${l.name_en}→${l.branchName}:${l.qty}`).join(', '),
      })
    }

    for (const c of closes || []) {
      out.push({
        id: `close-${c.id}`,
        kind: 'cashClose',
        at: toDate(c.submittedAt),
        actor: c.cashierName || userName(c.cashierId),
        summary: t('audit.cashCloseSummary', { branch: c.branchName }),
        detail: `${c.status} · ${c.orderCount} ${t('pos.orderCount').toLowerCase()}`,
        amount: c.totalSales,
      })
    }

    for (const b of batches || []) {
      out.push({
        id: `batch-${b.id}`,
        kind: 'production',
        at: toDate(b.date),
        actor: userName(b.staffId),
        summary: t('audit.productionSummary', { product: b.productName_en, qty: b.actualQty }),
        detail: b.confirmed ? t('audit.confirmed') : t('audit.notConfirmed'),
      })
    }

    for (const e of expenses || []) {
      out.push({
        id: `exp-${e.id}`,
        kind: 'expense',
        at: toDate(e.date),
        actor: e.submittedByName || userName(e.recordedBy),
        summary: e.description || t('finance.expenses'),
        detail: `${e.category} · ${t(`finance.${e.status || 'approved'}`)}`,
        amount: e.amount,
      })
    }

    for (const o of orders || []) {
      out.push({
        id: `order-${o.id}`,
        kind: 'order',
        at: toDate(o.createdAt),
        actor: o.customerName,
        summary: t('audit.orderSummary', { id: o.id.slice(0, 6).toUpperCase() }),
        detail: `${o.status} · ${o.paymentMethod}`,
        amount: o.total,
      })
    }

    for (const i of inquiries || []) {
      out.push({
        id: `inq-${i.id}`,
        kind: 'inquiry',
        at: toDate(i.createdAt),
        actor: i.name,
        summary: t('audit.inquirySummary'),
        detail: (i.message || '').slice(0, 80),
      })
    }

    return out.sort((a, b) => b.at.getTime() - a.at.getTime())
  }, [sales, distributions, closes, batches, expenses, orders, inquiries, users, t])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (kinds.size > 0 && !kinds.has(e.kind)) return false
      if (!q) return true
      return e.actor.toLowerCase().includes(q)
        || e.summary.toLowerCase().includes(q)
        || e.detail.toLowerCase().includes(q)
    })
  }, [entries, search, kinds])

  const toggleKind = (k: LogKind) => {
    setKinds((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k); else next.add(k)
      return next
    })
  }

  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ScrollText className="h-6 w-6 text-primary" /> {t('audit.title')}
          </h1>
          <p className="text-muted-foreground">{t('audit.subtitle')}</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => downloadSpreadsheet(
            `audit-log-${new Date().toISOString().split('T')[0]}`,
            [t('common.date'), t('audit.type'), t('audit.actor'), t('common.description'), t('common.notes'), t('common.amount')],
            filtered.map((e) => [
              fmt(e.at), t(KIND_META[e.kind].labelKey), e.actor, e.summary, e.detail,
              e.amount != null ? e.amount / 100 : '',
            ]),
          )}
        >
          <Download className="mr-1 h-4 w-4" /> {t('reports.excel')}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('audit.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={kinds.size === 0 ? 'default' : 'outline'} size="sm" onClick={() => setKinds(new Set())}>
              {t('common.all')}
            </Button>
            {(Object.keys(KIND_META) as LogKind[]).map((k) => (
              <Button key={k} variant={kinds.has(k) ? 'default' : 'outline'} size="sm" onClick={() => toggleKind(k)}>
                {t(KIND_META[k].labelKey)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('audit.showing', { shown: Math.min(limit, filtered.length), total: filtered.length })}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <ScrollText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">{t('audit.noActivity')}</p>
          </CardContent></Card>
        ) : filtered.slice(0, limit).map((e) => {
          const meta = KIND_META[e.kind]
          const Icon = meta.icon
          return (
            <Card key={e.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{t(meta.labelKey)}</Badge>
                    <span className="text-sm font-medium">{e.actor}</span>
                    <span className="text-xs text-muted-foreground">{fmt(e.at)}</span>
                  </div>
                  <p className="mt-1 text-sm">{e.summary}</p>
                  {e.detail && <p className="truncate text-xs capitalize text-muted-foreground">{e.detail}</p>}
                </div>
                {e.amount != null && (
                  <span className="shrink-0 text-sm font-bold">{formatCurrency(e.amount)}</span>
                )}
              </CardContent>
            </Card>
          )
        })}

        {filtered.length > limit && (
          <Button variant="outline" className="w-full" onClick={() => setLimit((n) => n + 100)}>
            {t('audit.loadMore')}
          </Button>
        )}
      </div>
    </div>
  )
}
