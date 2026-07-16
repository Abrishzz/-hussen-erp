import { generateId } from '@/lib/utils'
import type { Product, CartItem } from '@/types'

interface POSState {
  items: CartItem[]
  discount: number
  customerName: string
  paymentMethod: 'cash' | 'telebirr' | 'bank'
  cashReceived: number
  heldOrders: { id: string; items: CartItem[]; discount: number; customerName: string }[]
}

let state: POSState = {
  items: [],
  discount: 0,
  customerName: '',
  paymentMethod: 'cash',
  cashReceived: 0,
  heldOrders: [],
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export const posStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getState() {
    return state
  },
  addItem(product: Product) {
    const existing = state.items.find((i) => i.product.id === product.id)
    const items = existing
      ? state.items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      : [...state.items, { product, quantity: 1, discount: 0 }]
    state = { ...state, items }
    notify()
  },
  removeItem(productId: string) {
    state = { ...state, items: state.items.filter((i) => i.product.id !== productId) }
    notify()
  },
  updateQuantity(productId: string, qty: number) {
    state = {
      ...state,
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(1, qty) } : i
      ),
    }
    notify()
  },
  updateItemDiscount(productId: string, discount: number) {
    state = {
      ...state,
      items: state.items.map((i) =>
        i.product.id === productId ? { ...i, discount: Math.max(0, discount) } : i
      ),
    }
    notify()
  },
  setDiscount(discount: number) {
    state = { ...state, discount: Math.max(0, discount) }
    notify()
  },
  setCustomerName(name: string) {
    state = { ...state, customerName: name }
    notify()
  },
  setPaymentMethod(method: 'cash' | 'telebirr' | 'bank') {
    state = { ...state, paymentMethod: method }
    notify()
  },
  setCashReceived(amount: number) {
    state = { ...state, cashReceived: amount }
    notify()
  },
  getSubtotal() {
    return state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  },
  getItemDiscountTotal() {
    return state.items.reduce((sum, i) => sum + i.discount * i.quantity, 0)
  },
  getTotal() {
    return Math.max(0, this.getSubtotal() - this.getItemDiscountTotal() - state.discount)
  },
  getChange() {
    return Math.max(0, state.cashReceived - this.getTotal())
  },
  holdOrder() {
    const id = generateId()
    const heldOrders = [
      ...state.heldOrders,
      {
        id,
        items: [...state.items],
        discount: state.discount,
        customerName: state.customerName,
      },
    ]
    state = {
      ...state,
      heldOrders,
      items: [],
      discount: 0,
      customerName: '',
      cashReceived: 0,
      paymentMethod: 'cash',
    }
    notify()
  },
  resumeOrder(id: string) {
    const held = state.heldOrders.find((o) => o.id === id)
    if (held) {
      state = {
        ...state,
        items: held.items,
        discount: held.discount,
        customerName: held.customerName,
        heldOrders: state.heldOrders.filter((o) => o.id !== id),
      }
      notify()
    }
  },
  clearCart() {
    state = {
      ...state,
      items: [],
      discount: 0,
      customerName: '',
      cashReceived: 0,
      paymentMethod: 'cash',
    }
    notify()
  },
}
