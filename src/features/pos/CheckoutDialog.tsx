import { useState } from 'react'
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
import { Banknote, Smartphone, Building2 } from 'lucide-react'
import type { SaleItem } from '@/types'

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'telebirr' | 'bank'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [saving, setSaving] = useState(false)

  const state = posStore.getState()
  const subtotal = posStore.getSubtotal()
  const itemDiscountTotal = posStore.getItemDiscountTotal()
  const total = posStore.getTotal()
  const cashReceivedNum = parseFloat(cashReceived || '0') * 100
  const changeDue = Math.max(0, cashReceivedNum - total)

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

      const shop = {
        name: settings.shopName,
        name_am: settings.shopName_am,
      }

      printReceipt(saleWithId, shop, i18n.language as 'en' | 'am')
      posStore.clearCart()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pos.checkout')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('pos.customerName')}</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('pos.payment')}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="flex-col gap-1 h-auto py-3"
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-xs">{t('pos.cash')}</span>
              </Button>
              <Button
                variant={paymentMethod === 'telebirr' ? 'default' : 'outline'}
                className="flex-col gap-1 h-auto py-3"
                onClick={() => setPaymentMethod('telebirr')}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-xs">{t('pos.telebirr')}</span>
              </Button>
              <Button
                variant={paymentMethod === 'bank' ? 'default' : 'outline'}
                className="flex-col gap-1 h-auto py-3"
                onClick={() => setPaymentMethod('bank')}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-xs">{t('pos.bankTransfer')}</span>
              </Button>
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label>{t('pos.cashReceived')}</Label>
              <Input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
              {cashReceivedNum > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('pos.changeDue')}: ETB {(changeDue / 100).toFixed(2)}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1 border-t pt-3">
            <div className="flex justify-between text-sm">
              <span>{t('common.subtotal')}:</span>
              <span>ETB {(subtotal / 100).toFixed(2)}</span>
            </div>
            {itemDiscountTotal > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>{t('pos.itemDiscount')}:</span>
                <span>-ETB {(itemDiscountTotal / 100).toFixed(2)}</span>
              </div>
            )}
            {state.discount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>{t('pos.orderDiscount')}:</span>
                <span>-ETB {(state.discount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>{t('common.total')}:</span>
              <span>ETB {(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={handlePayment} disabled={saving}>
              {saving ? t('common.loading') : t('pos.payment')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
