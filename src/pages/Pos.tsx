import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProductGrid } from '@/features/pos/ProductGrid'
import { Cart } from '@/features/pos/Cart'
import { CheckoutDialog } from '@/features/pos/CheckoutDialog'
import { DailySalesSummary } from '@/features/pos/DailySalesSummary'
import { posStore } from '@/lib/posStore'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Button } from '@/components/ui/button'
import { Plus, Printer } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Pos() {
  const { t } = useTranslation()
  const { role } = useAuthStore()
  const navigate = useNavigate()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">{t('pos.title')}</h1>
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
            <ProductGrid onSelect={(product) => posStore.addItem(product)} />
          </div>
          <div className="lg:col-span-1">
            <Cart onCheckout={() => setCheckoutOpen(true)} />
          </div>
        </div>

        <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
      </div>
    </ErrorBoundary>
  )
}
