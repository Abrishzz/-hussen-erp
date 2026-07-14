import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `ETB ${(amount / 100).toFixed(2)}`
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  return Math.round(parseFloat(cleaned) * 100)
}

export function formatDate(date: Date | { seconds: number; nanoseconds: number } | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date((date as { seconds: number }).seconds * 1000)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | { seconds: number; nanoseconds: number } | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date((date as { seconds: number }).seconds * 1000)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
