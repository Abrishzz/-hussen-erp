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
    if (existing) {
      existing.quantity++
    } else {
      state.items.push({ product, quantity: 1, discount: 0 })
    }
    notify()
  },
  removeItem(productId: string) {
    state.items = state.items.filter((i) => i.product.id !== productId)
    notify()
  },
  updateQuantity(productId: string, qty: number) {
    const item = state.items.find((i) => i.product.id === productId)
    if (item) {
      item.quantity = Math.max(1, qty)
      notify()
    }
  },
  updateItemDiscount(productId: string, discount: number) {
    const item = state.items.find((i) => i.product.id === productId)
    if (item) {
      item.discount = Math.max(0, discount)
      notify()
    }
  },
  setDiscount(discount: number) {
    state.discount = Math.max(0, discount)
    notify()
  },
  setCustomerName(name: string) {
    state.customerName = name
    notify()
  },
  setPaymentMethod(method: 'cash' | 'telebirr' | 'bank') {
    state.paymentMethod = method
    notify()
  },
  setCashReceived(amount: number) {
    state.cashReceived = amount
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
    state.heldOrders.push({
      id,
      items: [...state.items],
      discount: state.discount,
      customerName: state.customerName,
    })
    this.clearCart()
    notify()
  },
  resumeOrder(id: string) {
    const held = state.heldOrders.find((o) => o.id === id)
    if (held) {
      state.items = held.items
      state.discount = held.discount
      state.customerName = held.customerName
      state.heldOrders = state.heldOrders.filter((o) => o.id !== id)
      notify()
    }
  },
  clearCart() {
    state.items = []
    state.discount = 0
    state.customerName = ''
    state.cashReceived = 0
    state.paymentMethod = 'cash'
    notify()
  },
}
