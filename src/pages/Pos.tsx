import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Printer } from 'lucide-react'

export default function Pos() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pos.title')}</h1>
        <Button>
          <Printer className="mr-2 h-4 w-4" />
          {t('pos.dailySummary')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Product Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('pos.searchProduct')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {/* Product card placeholders */}
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="flex cursor-pointer flex-col items-center rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="mb-2 h-16 w-16 rounded-md bg-muted" />
                    <p className="text-sm font-medium text-center">Product {i}</p>
                    <p className="text-xs text-muted-foreground">ETB 0.00</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                {t('pos.cart')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">{t('pos.emptyCart')}</p>
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>{t('common.total')}:</span>
                  <span className="font-bold">ETB 0.00</span>
                </div>
              </div>
              <Button className="w-full" disabled>
                {t('pos.checkout')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
