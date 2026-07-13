import { create } from 'zustand'

export type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'> & { variant?: ToastVariant }) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: ({ variant = 'default', ...rest }) =>
    set((state) => ({
      toasts: [...state.toasts, { id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, variant, ...rest }],
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience helper usable outside of React components. */
export const toast = (args: Omit<ToastItem, 'id'> & { variant?: ToastVariant }) =>
  useToastStore.getState().push(args)
