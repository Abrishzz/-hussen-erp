import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { posStore } from '@/lib/posStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'

interface CartProps {
  onCheckout: () => void
}

export function Cart({ onCheckout }: CartProps) {
  const { t } = useTranslation()
  const state = useSyncExternalStore(posStore.subscribe, posStore.getState)

  const subtotal = posStore.getSubtotal()
  const itemDiscountTotal = posStore.getItemDiscountTotal()
  const total = posStore.getTotal()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b pb-3">
        <ShoppingCart className="h-5 w-5" />
        <h3 className="font-semibold">{t('pos.cart')} ({state.items.length})</h3>
      </div>

      <ScrollArea className="flex-1 py-2">
        {state.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('pos.emptyCart')}</p>
        ) : (
          <div className="space-y-2">
            {state.items.map((item) => (
              <div key={item.product.id} className="rounded-lg border p-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">
                      {item.product.name_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ETB {(item.product.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => posStore.removeItem(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => posStore.updateQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => posStore.updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <div className="ml-auto text-right">
                    <p className="text-sm font-bold">
                      ETB {((item.product.price * item.quantity - item.discount * item.quantity) / 100).toFixed(2)}
                    </p>
                    {item.discount > 0 && (
                      <p className="text-xs text-destructive">
                        -ETB {((item.discount * item.quantity) / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  <Input
                    type="number"
                    placeholder={t('pos.itemDiscount')}
                    className="h-6 text-xs"
                    value={item.discount / 100 || ''}
                    onChange={(e) =>
                      posStore.updateItemDiscount(
                        item.product.id,
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {state.heldOrders.length > 0 && (
        <div className="border-t pt-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('pos.resumeOrder')}:</p>
          <div className="flex flex-wrap gap-1">
            {state.heldOrders.map((held) => (
              <Button
                key={held.id}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => posStore.resumeOrder(held.id)}
              >
                {held.items.length} items
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t('pos.orderDiscount')}
            className="h-8 text-sm"
            value={state.discount / 100 || ''}
            onChange={(e) => posStore.setDiscount(Math.round(parseFloat(e.target.value || '0') * 100))}
          />
          <span className="text-xs text-muted-foreground shrink-0">{t('common.discount')}</span>
        </div>
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
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={state.items.length === 0}
            onClick={onCheckout}
          >
            {t('pos.checkout')}
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={state.items.length === 0}
            onClick={() => posStore.holdOrder()}
            title={t('pos.holdOrder')}
          >
            <span className="text-lg">⏸</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
