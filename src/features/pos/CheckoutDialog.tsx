import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { posStore } from '@/lib/posStore'
import { useAddSale, useDeductBranchStock } from '@/hooks/useData'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { now } from '@/lib/timestamp'
import { printReceipt } from '@/lib/receipt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency } from '@/lib/utils'
import { Banknote, Smartphone, Building2, Check } from 'lucide-react'
import type { SaleItem } from '@/types'

type Method = 'cash' | 'telebirr' | 'bank'

const METHODS: { id: Method; icon: React.ElementType; label: string }[] = [
  { id: 'cash', icon: Banknote, label: 'pos.cash' },
  { id: 'telebirr', icon: Smartphone, label: 'pos.telebirr' },
  { id: 'bank', icon: Building2, label: 'pos.bankTransfer' },
]

/** Notes a cashier actually handles, in ETB. */
const NOTES = [50, 100, 200, 500, 1000]

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the sale is tagged to this branch and branch stock is deducted. */
  branchId?: string | null
}

export function CheckoutDialog({ open, onOpenChange, branchId }: CheckoutDialogProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const addSale = useAddSale()
  const deductBranchStock = useDeductBranchStock()
  const [customerName, setCustomerName] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<Method>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [saving, setSaving] = useState(false)

  const state = posStore.getState()
  const subtotal = posStore.getSubtotal()
  const itemDiscountTotal = posStore.getItemDiscountTotal()
  const total = posStore.getTotal()
  const cashReceivedNum = Math.round(parseFloat(cashReceived || '0') * 100)
  const changeDue = Math.max(0, cashReceivedNum - total)
  const short = paymentMethod === 'cash' && cashReceivedNum > 0 && cashReceivedNum < total

  // Start each sale clean rather than inheriting the last one's customer/cash.
  useEffect(() => {
    if (open) {
      setCustomerName('')
      setCashReceived('')
      setPaymentMethod('cash')
    }
  }, [open])

  // Only offer notes that could actually cover the bill, plus "exact".
  const suggestions = NOTES.filter((n) => n * 100 >= total).slice(0, 3)

  const handlePayment = async () => {
    setSaving(true)
    try {
      const items: SaleItem[] = state.items.map((ci) => ({
        productId: ci.product.id,
        name_en: ci.product.name_en,
        name_am: ci.product.name_am,
        quantity: ci.quantity,
        unitPrice: ci.product.price,
        discount: ci.discount,
        total: ci.product.price * ci.quantity - ci.discount * ci.quantity,
      }))

      const saleData = {
        items,
        subtotal,
        discount: state.discount + itemDiscountTotal,
        total,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceivedNum : 0,
        changeDue: paymentMethod === 'cash' ? changeDue : 0,
        cashierId: user?.uid || '',
        branchId: branchId || '',
        customerName: customerName || '',
        status: 'completed' as const,
        timestamp: now(),
      }

      const saleRef = await addSale.mutateAsync(saleData)
      const saleWithId = { ...saleData, id: saleRef.id }

      // Branch-scoped sale: draw down the branch's received stock.
      if (branchId) {
        await deductBranchStock.mutateAsync({ branchId, items: state.items })
      }

      printReceipt(saleWithId, { name: settings.shopName, name_am: settings.shopName_am }, i18n.language as 'en' | 'am')
      posStore.clearCart()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-3 text-left sm:px-6 sm:pt-5">
          <DialogTitle>{t('pos.checkout')}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-2 sm:px-6">
          {/* The number that matters, up top and unmissable. */}
          <div className="flex items-end justify-between rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="text-sm font-medium opacity-90">{t('common.total')}</span>
            <span className="text-3xl font-bold leading-none tabular-nums">{formatCurrency(total)}</span>
          </div>

          <div className="space-y-2">
            <Label>{t('pos.payment')}</Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const active = paymentMethod === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-medium transition-all active:scale-95',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    <m.icon className="h-5 w-5" />
                    {t(m.label)}
                  </button>
                )
              })}
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label>{t('pos.cashReceived')}</Label>
              {/* Tapping a note beats typing on a phone mid-queue. */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCashReceived((total / 100).toString())}
                  className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                >
                  {t('pos.exact')}
                </button>
                {suggestions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCashReceived(n.toString())}
                    className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="h-12 text-lg font-semibold"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
              {short && (
                <p className="text-sm font-medium text-destructive">
                  {t('pos.shortBy', { amount: formatCurrency(total - cashReceivedNum) })}
                </p>
              )}
              {cashReceivedNum >= total && cashReceivedNum > 0 && (
                <div className="flex items-end justify-between rounded-2xl bg-green-100 px-4 py-2.5 text-green-800 dark:bg-green-900/40 dark:text-green-100">
                  <span className="text-sm font-medium">{t('pos.changeDue')}</span>
                  <span className="text-2xl font-bold leading-none tabular-nums">{formatCurrency(changeDue)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('pos.customerName')}</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11" />
          </div>
        </div>

        {/* Action pinned to the bottom — always reachable without scrolling. */}
        <div className="shrink-0 border-t bg-background p-4 sm:px-6">
          <Button
            className="h-14 w-full rounded-xl text-base font-semibold"
            onClick={handlePayment}
            disabled={saving || short}
          >
            {saving ? t('common.loading') : (
              <>
                <Check className="mr-2 h-5 w-5" />
                {t('pos.completeSale')} · {formatCurrency(total)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
