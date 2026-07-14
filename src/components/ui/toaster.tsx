import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastData {
  id: number
  message: string
  variant: 'default' | 'destructive' | 'success'
}

let toastId = 0
const listeners: Array<(toast: ToastData) => void> = []

export function showToast(message: string, variant: 'default' | 'destructive' | 'success' = 'default') {
  const toast = { id: ++toastId, message, variant }
  listeners.forEach((fn) => fn(toast))
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 4000)
    }
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }, [])

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right',
            toast.variant === 'destructive' && 'border-destructive bg-destructive text-destructive-foreground',
            toast.variant === 'success' && 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
            toast.variant === 'default' && 'bg-background text-foreground',
          )}
        >
          {toast.variant === 'success' && <CheckCircle className="h-4 w-4" />}
          {toast.variant === 'destructive' && <AlertCircle className="h-4 w-4" />}
          {toast.variant === 'default' && <Info className="h-4 w-4" />}
          <p className="text-sm">{toast.message}</p>
          <button onClick={() => remove(toast.id)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
