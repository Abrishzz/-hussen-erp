import { jsPDF } from 'jspdf'
import { formatCurrency } from '@/lib/utils'
import type { SaleItem } from '@/types'

export interface ReceiptData {
  id: string
  items: SaleItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'telebirr' | 'bank'
  cashReceived?: number
  changeDue?: number
  customerName?: string
  cashierName: string
  timestamp: Date
  lang: 'en' | 'am'
}

export interface ReceiptLabels {
  shopName: string
  title: string
  date: string
  cashier: string
  customer: string
  item: string
  qty: string
  total: string
  subtotal: string
  discount: string
  grandTotal: string
  payment: string
  cashReceived: string
  changeDue: string
  thankYou: string
  paymentMethods: { cash: string; telebirr: string; bank: string }
}

function nameFor(item: SaleItem, lang: 'en' | 'am') {
  return lang === 'am' ? item.name_am || item.name_en : item.name_en
}

/** Generates and downloads an 80mm-style thermal receipt PDF. */
export function generateReceiptPdf(sale: ReceiptData, labels: ReceiptLabels): void {
  const width = 80
  const lineH = 5
  const margin = 5
  // Rough dynamic height based on line count.
  const height = 90 + sale.items.length * lineH
  const doc = new jsPDF({ unit: 'mm', format: [width, height] })

  let y = margin + 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(labels.shopName, width / 2, y, { align: 'center' })
  y += lineH
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Bulehora, Oromia, Ethiopia', width / 2, y, { align: 'center' })
  y += lineH
  doc.text(labels.title, width / 2, y, { align: 'center' })
  y += lineH

  doc.setFontSize(8)
  doc.text(`${labels.date}: ${sale.timestamp.toLocaleString('en-GB')}`, margin, y)
  y += lineH - 1
  doc.text(`${labels.cashier}: ${sale.cashierName}`, margin, y)
  y += lineH - 1
  if (sale.customerName) {
    doc.text(`${labels.customer}: ${sale.customerName}`, margin, y)
    y += lineH - 1
  }
  doc.text(`#${sale.id.slice(0, 8)}`, margin, y)
  y += lineH - 2

  doc.setLineWidth(0.2)
  doc.line(margin, y, width - margin, y)
  y += lineH - 1

  // Items
  doc.setFont('helvetica', 'bold')
  doc.text(labels.item, margin, y)
  doc.text(labels.qty, width - 28, y)
  doc.text(labels.total, width - margin, y, { align: 'right' })
  y += lineH - 1
  doc.setFont('helvetica', 'normal')

  for (const item of sale.items) {
    const name = nameFor(item, sale.lang).slice(0, 22)
    doc.text(name, margin, y)
    doc.text(String(item.quantity), width - 27, y)
    doc.text(formatCurrency(item.total).replace('ETB ', ''), width - margin, y, { align: 'right' })
    y += lineH - 1
  }

  y += 1
  doc.line(margin, y, width - margin, y)
  y += lineH - 1

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, margin, y)
    doc.text(value, width - margin, y, { align: 'right' })
    y += lineH - 1
  }

  row(labels.subtotal, formatCurrency(sale.subtotal))
  if (sale.discount > 0) row(labels.discount, `- ${formatCurrency(sale.discount)}`)
  doc.setFontSize(10)
  row(labels.grandTotal, formatCurrency(sale.total), true)
  doc.setFontSize(8)
  row(labels.payment, labels.paymentMethods[sale.paymentMethod])
  if (sale.paymentMethod === 'cash' && sale.cashReceived != null) {
    row(labels.cashReceived, formatCurrency(sale.cashReceived))
    row(labels.changeDue, formatCurrency(sale.changeDue ?? 0))
  }

  y += 2
  doc.setFont('helvetica', 'italic')
  doc.text(labels.thankYou, width / 2, y, { align: 'center' })

  doc.save(`receipt-${sale.id.slice(0, 8)}.pdf`)
}
