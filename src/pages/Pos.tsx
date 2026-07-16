import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProductGrid } from '@/features/pos/ProductGrid'
import { Cart } from '@/features/pos/Cart'
import { CheckoutDialog } from '@/features/pos/CheckoutDialog'
import { DailySalesSummary } from '@/features/pos/DailySalesSummary'
import { posStore } from '@/lib/posStore'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { Plus, Printer, Store, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBranchStock, useActiveBranches } from '@/hooks/useData'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import type { Product } from '@/types'

export default function Pos() {
  const { t } = useTranslation()
  const { role, branchId } = useAuthStore()
  const { show } = useToast()
  const navigate = useNavigate()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

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
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">{t('pos.title')}</h1>
            {branchScoped && branchName && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Store className="h-4 w-4" /> {branchName}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {role === 'owner' && (
              <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
                <Plus className="mr-1 h-4 w-4" />
                {t('common.create')}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Printer className="mr-1 h-4 w-4" />
              {t('pos.dailySummary')}
            </Button>
          </div>
        </div>

        <DailySalesSummary />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProductGrid onSelect={handleSelect} stock={stockMap} />
          </div>
          <div className="lg:col-span-1">
            <Cart onCheckout={() => setCheckoutOpen(true)} />
          </div>
        </div>

        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} branchId={branchScoped ? branchId : null} />
      </div>
    </ErrorBoundary>
  )
}
