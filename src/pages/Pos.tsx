import { useState, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { ProductGrid } from '@/features/pos/ProductGrid'
import { Cart } from '@/features/pos/Cart'
import { CheckoutDialog } from '@/features/pos/CheckoutDialog'
import { DailySalesSummary } from '@/features/pos/DailySalesSummary'
import { printReceipt } from '@/features/pos/printReceipt'
import { useSettingsStore } from '@/store/settingsStore'
import { posStore } from '@/lib/posStore'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Store, AlertTriangle, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBranchStock, useActiveBranches } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'
import type { Product, Sale } from '@/types'

export default function Pos() {
  const { t, i18n } = useTranslation()
  const { role, branchId } = useAuthStore()
  const { settings } = useSettingsStore()
  const { show } = useToast()
  const navigate = useNavigate()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const cart = useSyncExternalStore(posStore.subscribe, posStore.getState)
  const itemCount = cart.items.reduce((n, i) => n + i.quantity, 0)
  const cartTotal = posStore.getTotal()
  const cartQty = Object.fromEntries(cart.items.map((i) => [i.product.id, i.quantity]))

  // Cashiers are branch-scoped: POS shows only what their branch received and
  // blocks overselling. Owner/manager (no branch) sell without stock limits.
  const branchScoped = role === 'cashier'
  const { data: branchStock } = useBranchStock(branchScoped ? branchId || undefined : undefined)
  const { data: branches } = useActiveBranches()
  const branchName = branches?.find((b) => b.id === branchId)?.name

  const stockMap: Record<string, number> | null = branchScoped && branchId
    ? Object.fromEntries((branchStock || []).map((s) => [s.productId, s.qty]))
    : null

  const handleSelect = (product: Product) => {
    if (stockMap) {
      const available = stockMap[product.id] || 0
      const inCart = posStore.getState().items.find((i) => i.product.id === product.id)?.quantity || 0
      if (inCart + 1 > available) {
        show(t('pos.insufficientStock', { name: product.name_en }), 'destructive')
        return
      }
    }
    posStore.addItem(product)
  }

  const openCheckout = () => {
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  // Print the receipt straight after the sale is saved — from its own isolated
  // iframe document (see printReceipt), which prints reliably on Sunmi/RAWBT.
  const handleCompleted = (sale: Sale) => {
    printReceipt(
      sale,
      {
        name: settings.shopName,
        name_am: settings.shopName_am,
        telebirrNumber: settings.telebirrNumber,
        bankAccount: settings.bankAccount,
      },
      i18n.language as 'en' | 'am',
      branchScoped ? branchName : undefined,
    )
  }

  // A cashier with no branch assigned can't sell — guide them to the owner.
  if (branchScoped && !branchId) {
    return (
      <ErrorBoundary>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h2 className="text-xl font-semibold">{t('pos.noBranchTitle')}</h2>
          <p className="max-w-md text-muted-foreground">{t('pos.noBranchDesc')}</p>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      {/* Extra bottom room on mobile so the floating cart bar never covers the
          last row of products. */}
      <div className={itemCount > 0 ? 'space-y-3 pb-20 lg:pb-0' : 'space-y-3'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{t('pos.title')}</h1>
            {branchScoped && branchName && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Store className="h-4 w-4" /> {branchName}
              </p>
            )}
          </div>
          {role === 'owner' && (
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
              <Plus className="mr-1 h-4 w-4" />
              {t('common.create')}
            </Button>
          )}
        </div>

        {/* The day's totals are reference material, not selling tools — they'd
            push the products below the fold on a phone. Desktop has the room. */}
        <div className="hidden lg:block">
          <DailySalesSummary />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* min-w-0: grid items default to min-width:auto, which lets wide
              content push the track (and the whole page) past the viewport. */}
          <div className="min-w-0 lg:col-span-2">
            <ProductGrid onSelect={handleSelect} stock={stockMap} cartQty={cartQty} />
          </div>
          {/* Desktop keeps the cart alongside; mobile uses the bar + sheet below. */}
          <div className="hidden lg:col-span-1 lg:block">
            <Cart onCheckout={openCheckout} />
          </div>
        </div>
      </div>

      {/* ─── Mobile: floating cart bar, sits just above the bottom tab bar ─── */}
      {itemCount > 0 && (
        <div className="fixed inset-x-3 bottom-[5.25rem] z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]"
          >
            <span className="relative shrink-0">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[11px] font-bold text-primary">
                {itemCount}
              </span>
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[11px] leading-tight opacity-80">{t('pos.cart')}</span>
              <span className="block truncate text-base font-bold leading-tight">{formatCurrency(cartTotal)}</span>
            </span>
            <span className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-semibold">
              {t('pos.checkout')}
            </span>
          </button>
        </div>
      )}

      {/* ─── Mobile: cart sheet ─── */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent variant="sheet" className="lg:hidden">
          <DialogHeader className="shrink-0 border-b px-4 pb-3 pt-3 text-left">
            <DialogTitle>{t('pos.cart')} ({itemCount})</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
            <Cart onCheckout={openCheckout} />
          </div>
        </DialogContent>
      </Dialog>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        branchId={branchScoped ? branchId : null}
        onCompleted={handleCompleted}
      />
    </ErrorBoundary>
  )
}
