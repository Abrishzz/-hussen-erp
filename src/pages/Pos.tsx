import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { serverTimestamp } from 'firebase/firestore'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  PauseCircle,
  PlayCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCollection, useAddDocument, orderBy } from '@/hooks/useFirestore'
import { useCartStore, computeTotals, lineTotal, type DiscountMode } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/store/toastStore'
import { ReceiptDialog } from '@/features/pos/ReceiptDialog'
import type { ReceiptData } from '@/features/pos/receipt'
import type { Product, SaleItem } from '@/types'

type PaymentMethod = 'cash' | 'telebirr' | 'bank'

export default function Pos() {
  const { t, i18n } = useTranslation()
  const isAm = i18n.language === 'am'
  const user = useAuthStore((s) => s.user)
  const { settings } = useSettingsStore()
  const shopName = isAm ? settings.shopName_am : settings.shopName

  const { data: products, isLoading } = useCollection<Product>('products', [orderBy('name_en')])
  const createSale = useAddDocument('sales')

  const cart = useCartStore()
  const totals = computeTotals(cart.items, cart.orderDiscountValue, cart.orderDiscountMode)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const activeProducts = useMemo(
    () => (products ?? []).filter((p) => p.isActive),
    [products]
  )
  const categories = useMemo(
    () => Array.from(new Set(activeProducts.map((p) => p.category).filter(Boolean))).sort(),
    [activeProducts]
  )
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return activeProducts.filter((p) => {
      const matchesCat = category === 'all' || p.category === category
      const matchesSearch =
        !term || p.name_en.toLowerCase().includes(term) || p.name_am.toLowerCase().includes(term)
      return matchesCat && matchesSearch
    })
  }, [activeProducts, search, category])

  const qtyInCart = (id: string) => cart.items.find((i) => i.product.id === id)?.quantity ?? 0

  const cashReceivedCents = Math.round((parseFloat(cashReceived) || 0) * 100)
  const changeDue = Math.max(0, cashReceivedCents - totals.total)
  const cashShort = payment === 'cash' && cashReceived !== '' && cashReceivedCents < totals.total

  const canCheckout = cart.items.length > 0 && !cashShort && !createSale.isPending

  const handleCheckout = async () => {
    if (cart.items.length === 0) return
    if (payment === 'cash' && cashReceivedCents < totals.total) {
      toast({ title: t('pos.insufficientCash'), variant: 'destructive' })
      return
    }

    const saleItems: SaleItem[] = cart.items.map((i) => ({
      productId: i.product.id,
      name_en: i.product.name_en,
      name_am: i.product.name_am,
      quantity: i.quantity,
      unitPrice: i.product.price,
      discount: i.discount,
      total: lineTotal(i),
    }))

    const doc = {
      items: saleItems,
      subtotal: totals.subtotal,
      discount: totals.discountTotal,
      total: totals.total,
      paymentMethod: payment,
      cashReceived: payment === 'cash' ? cashReceivedCents : null,
      changeDue: payment === 'cash' ? changeDue : null,
      cashierId: user?.uid ?? 'unknown',
      customerName: cart.customerName || '',
      status: 'completed',
      timestamp: serverTimestamp(),
    }

    try {
      const created = await createSale.mutateAsync(doc)
      setReceipt({
        id: created.id,
        items: saleItems,
        subtotal: totals.subtotal,
        discount: totals.discountTotal,
        total: totals.total,
        paymentMethod: payment,
        cashReceived: payment === 'cash' ? cashReceivedCents : undefined,
        changeDue: payment === 'cash' ? changeDue : undefined,
        customerName: cart.customerName || undefined,
        cashierName: user?.displayName || user?.email || 'Cashier',
        timestamp: new Date(),
        lang: isAm ? 'am' : 'en',
      })
      setReceiptOpen(true)
      cart.clearCart()
      setCashReceived('')
      setPayment('cash')
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('pos.title')}</h1>
        {cart.heldOrders.length > 0 && (
          <Badge variant="warning">
            {cart.heldOrders.length} {t('pos.heldOrders')}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Product grid */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('pos.searchProduct')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('pos.allCategories')}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t('pos.noProducts')}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const inCart = qtyInCart(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => cart.addItem(p)}
                    className="relative flex flex-col items-center rounded-lg border bg-card p-3 text-center transition-colors hover:border-primary hover:bg-accent"
                  >
                    {inCart > 0 && (
                      <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                        {inCart}
                      </span>
                    )}
                    <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-md bg-muted text-lg font-bold text-muted-foreground">
                      {(isAm ? p.name_am : p.name_en).charAt(0)}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium leading-tight">
                      {isAm ? p.name_am : p.name_en}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatCurrency(p.price)}</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Held orders */}
          {cart.heldOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('pos.heldOrders')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cart.heldOrders.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{h.customerName || t('common.none')}</span>
                      <span className="ml-2 text-muted-foreground">
                        {h.items.reduce((s, i) => s + i.quantity, 0)} × ·{' '}
                        {new Date(h.heldAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => cart.resumeOrder(h.id)}>
                        <PlayCircle className="mr-1 h-4 w-4" />
                        {t('pos.resume')}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => cart.removeHeldOrder(h.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cart */}
        <div>
          <Card className="lg:sticky lg:top-16">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                {t('pos.cart')}
              </CardTitle>
              {cart.items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={cart.clearCart}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  {t('pos.clearCart')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.items.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t('pos.emptyCart')}</p>
              ) : (
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {cart.items.map((item) => (
                    <div key={item.product.id} className="space-y-1 border-b pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {isAm ? item.product.name_am : item.product.name_en}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => cart.decrement(item.product.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => cart.increment(item.product.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{t('pos.itemDiscount')}</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount ? item.discount / 100 : ''}
                            placeholder="0"
                            onChange={(e) =>
                              cart.setItemDiscount(
                                item.product.id,
                                Math.round((parseFloat(e.target.value) || 0) * 100)
                              )
                            }
                            className="h-7 w-20 text-xs"
                          />
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(lineTotal(item))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Customer + order discount */}
              <div className="space-y-2">
                <Input
                  placeholder={t('pos.customerName')}
                  value={cart.customerName}
                  onChange={(e) => cart.setCustomerName(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {t('pos.orderDiscount')}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cart.orderDiscountValue || ''}
                    placeholder="0"
                    onChange={(e) =>
                      cart.setOrderDiscount(parseFloat(e.target.value) || 0, cart.orderDiscountMode)
                    }
                    className="h-8"
                  />
                  <Select
                    value={cart.orderDiscountMode}
                    onValueChange={(v) => cart.setOrderDiscount(cart.orderDiscountValue, v as DiscountMode)}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">ETB</SelectItem>
                      <SelectItem value="percent">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('common.subtotal')}</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.discountTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('common.discount')}</span>
                    <span>- {formatCurrency(totals.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold">
                  <span>{t('common.total')}</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="space-y-2">
                <Label className="text-xs">{t('pos.payment')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'telebirr', 'bank'] as PaymentMethod[]).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={payment === m ? 'default' : 'outline'}
                      onClick={() => setPayment(m)}
                    >
                      {m === 'cash' ? t('pos.cash') : m === 'telebirr' ? t('pos.telebirr') : t('pos.bankTransfer')}
                    </Button>
                  ))}
                </div>
                {payment === 'cash' && (
                  <div className="space-y-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('pos.cashReceived')}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('pos.changeDue')}</span>
                      <span className="font-medium">{formatCurrency(changeDue)}</span>
                    </div>
                    {cashShort && (
                      <p className="text-xs text-destructive">{t('pos.insufficientCash')}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={cart.items.length === 0}
                  onClick={cart.holdOrder}
                >
                  <PauseCircle className="mr-2 h-4 w-4" />
                  {t('pos.holdOrder')}
                </Button>
                <Button className="flex-1" disabled={!canCheckout} onClick={handleCheckout}>
                  {createSale.isPending ? t('common.saving') : t('pos.completeSale')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={receipt}
        shopName={shopName}
      />
    </div>
  )
}
