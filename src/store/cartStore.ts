import { create } from 'zustand'
import type { Product, CartItem } from '@/types'

export type DiscountMode = 'fixed' | 'percent'

export interface HeldOrder {
  id: string
  items: CartItem[]
  customerName: string
  orderDiscountValue: number
  orderDiscountMode: DiscountMode
  heldAt: number
}

interface CartState {
  items: CartItem[]
  customerName: string
  /** Order-level discount raw value: cents when mode='fixed', percentage when mode='percent'. */
  orderDiscountValue: number
  orderDiscountMode: DiscountMode
  heldOrders: HeldOrder[]

  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  increment: (productId: string) => void
  decrement: (productId: string) => void
  setItemDiscount: (productId: string, discountCents: number) => void
  setCustomerName: (name: string) => void
  setOrderDiscount: (value: number, mode: DiscountMode) => void
  clearCart: () => void
  holdOrder: () => void
  resumeOrder: (id: string) => void
  removeHeldOrder: (id: string) => void
}

const clampQty = (q: number) => (q < 1 ? 1 : Math.floor(q))

export const useCartStore = create<CartState>((set) => ({
  items: [],
  customerName: '',
  orderDiscountValue: 0,
  orderDiscountMode: 'fixed',
  heldOrders: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }
      }
      return { items: [...state.items, { product, quantity: 1, discount: 0 }] }
    }),

  removeItem: (productId) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: clampQty(quantity) } : i
      ),
    })),

  increment: (productId) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    })),

  decrement: (productId) =>
    set((state) => ({
      items: state.items
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0),
    })),

  setItemDiscount: (productId, discountCents) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount: Math.max(0, Math.round(discountCents)) } : i
      ),
    })),

  setCustomerName: (name) => set({ customerName: name }),

  setOrderDiscount: (value, mode) => set({ orderDiscountValue: Math.max(0, value), orderDiscountMode: mode }),

  clearCart: () =>
    set({ items: [], customerName: '', orderDiscountValue: 0, orderDiscountMode: 'fixed' }),

  holdOrder: () =>
    set((state) => {
      if (state.items.length === 0) return state
      const held: HeldOrder = {
        id: `hold_${Date.now()}`,
        items: state.items,
        customerName: state.customerName,
        orderDiscountValue: state.orderDiscountValue,
        orderDiscountMode: state.orderDiscountMode,
        heldAt: Date.now(),
      }
      return {
        heldOrders: [...state.heldOrders, held],
        items: [],
        customerName: '',
        orderDiscountValue: 0,
        orderDiscountMode: 'fixed',
      }
    }),

  resumeOrder: (id) =>
    set((state) => {
      const order = state.heldOrders.find((h) => h.id === id)
      if (!order) return state
      return {
        items: order.items,
        customerName: order.customerName,
        orderDiscountValue: order.orderDiscountValue,
        orderDiscountMode: order.orderDiscountMode,
        heldOrders: state.heldOrders.filter((h) => h.id !== id),
      }
    }),

  removeHeldOrder: (id) =>
    set((state) => ({ heldOrders: state.heldOrders.filter((h) => h.id !== id) })),
}))

/** Line total after the item's own discount, in cents. */
export function lineTotal(item: CartItem): number {
  return Math.max(0, item.product.price * item.quantity - item.discount)
}

export interface CartTotals {
  subtotal: number // sum of price*qty before any discount
  itemDiscountTotal: number
  orderDiscountAmount: number
  discountTotal: number // item + order discounts combined
  total: number
}

export function computeTotals(
  items: CartItem[],
  orderDiscountValue: number,
  orderDiscountMode: DiscountMode
): CartTotals {
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const itemDiscountTotal = items.reduce((s, i) => s + Math.min(i.discount, i.product.price * i.quantity), 0)
  const afterItems = subtotal - itemDiscountTotal
  const orderDiscountAmount =
    orderDiscountMode === 'percent'
      ? Math.round((afterItems * Math.min(orderDiscountValue, 100)) / 100)
      : Math.min(orderDiscountValue, afterItems)
  const total = Math.max(0, afterItems - orderDiscountAmount)
  return {
    subtotal,
    itemDiscountTotal,
    orderDiscountAmount,
    discountTotal: itemDiscountTotal + orderDiscountAmount,
    total,
  }
}
