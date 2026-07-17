import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { posStore } from '@/lib/posStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingCart, Percent, PauseCircle, ArrowRight } from 'lucide-react'

interface CartProps {
  onCheckout: () => void
}

export function Cart({ onCheckout }: CartProps) {
  const { t, i18n } = useTranslation()
  const state = useSyncExternalStore(posStore.subscribe, posStore.getState)
  // Per-item discount is rare, so it stays behind a toggle rather than putting an
  // input on every row and burying the numbers that matter.
  const [openDiscount, setOpenDiscount] = useState<string | null>(null)
  const [orderDiscountOpen, setOrderDiscountOpen] = useState(false)

  const subtotal = posStore.getSubtotal()
  const itemDiscountTotal = posStore.getItemDiscountTotal()
  const total = posStore.getTotal()
  const count = state.items.reduce((n, i) => n + i.quantity, 0)

  if (state.items.length === 0) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <ShoppingCart className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t('pos.emptyCart')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="hidden items-center gap-2 border-b pb-3 lg:flex">
        <ShoppingCart className="h-5 w-5" />
        <h3 className="font-semibold">{t('pos.cart')} ({count})</h3>
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-2">
        {state.items.map((item) => {
          const lineTotal = item.product.price * item.quantity - item.discount * item.quantity
          const showDiscount = openDiscount === item.product.id
          return (
            <div key={item.product.id} className="rounded-2xl border bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">🥖</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {i18n.language === 'am' ? item.product.name_am : item.product.name_en}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.price)} {t('pos.each')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => posStore.removeItem(item.product.id)}
                  aria-label={t('common.delete')}
                  className="shrink-0 rounded-lg p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border p-0.5">
                  <button
                    type="button"
                    onClick={() => posStore.updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    aria-label="-"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => posStore.updateQuantity(item.product.id, item.quantity + 1)}
                    aria-label="+"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenDiscount(showDiscount ? null : item.product.id)}
                  aria-label={t('pos.itemDiscount')}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors',
                    item.discount > 0 || showDiscount
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Percent className="h-4 w-4" />
                </button>

                <div className="ml-auto text-right">
                  <p className="text-sm font-bold tabular-nums">{formatCurrency(lineTotal)}</p>
                  {item.discount > 0 && (
                    <p className="text-xs text-destructive tabular-nums">
                      -{formatCurrency(item.discount * item.quantity)}
                    </p>
                  )}
                </div>
              </div>

              {showDiscount && (
                <Input
                  type="number"
                  autoFocus
                  placeholder={t('pos.itemDiscount')}
                  className="mt-2 h-9"
                  value={item.discount / 100 || ''}
                  onChange={(e) =>
                    posStore.updateItemDiscount(item.product.id, Math.round(parseFloat(e.target.value || '0') * 100))
                  }
                />
              )}
            </div>
          )
        })}

        {state.heldOrders.length > 0 && (
          <div className="rounded-2xl border border-dashed p-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('pos.resumeOrder')}</p>
            <div className="flex flex-wrap gap-1.5">
              {state.heldOrders.map((held) => (
                <Button key={held.id} variant="outline" size="sm" className="text-xs"
                  onClick={() => posStore.resumeOrder(held.id)}>
                  {held.items.length} {t('pos.items')}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Totals + actions stay pinned to the bottom of the sheet/panel */}
      <div className="shrink-0 space-y-3 border-t bg-background pt-3">
        {orderDiscountOpen ? (
          <Input
            type="number"
            autoFocus
            placeholder={t('pos.orderDiscount')}
            className="h-9"
            value={state.discount / 100 || ''}
            onChange={(e) => posStore.setDiscount(Math.round(parseFloat(e.target.value || '0') * 100))}
          />
        ) : (
          <button
            type="button"
            onClick={() => setOrderDiscountOpen(true)}
            className="text-xs font-medium text-primary hover:underline"
          >
            + {t('pos.orderDiscount')}
          </button>
        )}

        <div className="space-y-1">
          <Row label={t('common.subtotal')} value={formatCurrency(subtotal)} />
          {itemDiscountTotal > 0 && (
            <Row label={t('pos.itemDiscount')} value={`-${formatCurrency(itemDiscountTotal)}`} tone="danger" />
          )}
          {state.discount > 0 && (
            <Row label={t('pos.orderDiscount')} value={`-${formatCurrency(state.discount)}`} tone="danger" />
          )}
        </div>

        <div className="flex items-end justify-between rounded-2xl bg-muted/60 px-3 py-2.5">
          <span className="text-sm font-medium text-muted-foreground">{t('common.total')}</span>
          <span className="text-2xl font-bold leading-none tabular-nums">{formatCurrency(total)}</span>
        </div>

        <div className="flex gap-2">
          <Button className="h-12 flex-1 rounded-xl text-base font-semibold" onClick={onCheckout}>
            {t('pos.checkout')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl px-3"
            onClick={() => posStore.holdOrder()}
            title={t('pos.holdOrder')}
          >
            <PauseCircle className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('tabular-nums', tone === 'danger' && 'text-destructive')}>{value}</span>
    </div>
  )
}
