import { useCallback } from 'react'

export function useToast() {
  const show = useCallback((message: string, variant: 'default' | 'destructive' | 'success' = 'default') => {
    const event = new CustomEvent('app-toast', { detail: { message, variant } })
    window.dispatchEvent(event)
  }, [])

  return { show }
}
