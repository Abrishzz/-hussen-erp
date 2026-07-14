import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDateTime } from './utils'
import type { Sale, SaleItem } from '@/types'

interface ShopInfo {
  name: string
  name_am: string
  address?: string
  phone?: string
}

export function printReceipt(sale: Sale, shop: ShopInfo, lang: 'en' | 'am') {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] })
  const font = lang === 'am' ? 'Noto Sans Ethiopic' : 'Helvetica'
  const name = lang === 'am' ? shop.name_am : shop.name
  const pageWidth = 80
  let y = 10

  doc.setFont(font)
  doc.setFontSize(14)
  doc.text(name, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(8)
  if (shop.address) {
    doc.text(shop.address, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  if (shop.phone) {
    doc.text(`Tel: ${shop.phone}`, pageWidth / 2, y, { align: 'center' })
    y += 4
  }
  doc.text('Bulehora, Ethiopia', pageWidth / 2, y, { align: 'center' })
  y += 8

  // Separator
  doc.setFontSize(10)
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 6

  const headerText = lang === 'am' ? 'የሽያጭ ደረሰኝ' : 'SALES RECEIPT'
  doc.setFontSize(12)
  doc.text(headerText, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(8)
  const dateStr = formatDateTime(sale.timestamp)
  doc.text(`${lang === 'am' ? 'ቀን' : 'Date'}: ${dateStr}`, 5, y)
  y += 4
  const cashierLabel = lang === 'am' ? 'ካሽየር' : 'Cashier'
  doc.text(`${cashierLabel}: ${sale.cashierId.slice(0, 8)}`, 5, y)
  y += 4
  if (sale.customerName) {
    const custLabel = lang === 'am' ? 'ደንበኛ' : 'Customer'
    doc.text(`${custLabel}: ${sale.customerName}`, 5, y)
    y += 4
  }
  y += 2

  // Separator
  doc.setFontSize(10)
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 5

  // Items header
  doc.setFontSize(8)
  doc.text(lang === 'am' ? 'እቃ' : 'Item', 5, y)
  doc.text(lang === 'am' ? 'ብዛት' : 'Qty', 35, y)
  doc.text(lang === 'am' ? 'ዋጋ' : 'Price', 50, y)
  doc.text(lang === 'am' ? 'ድምር' : 'Total', 65, y)
  y += 4

  doc.setFontSize(10)
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 4

  // Items
  doc.setFontSize(8)
  sale.items.forEach((item: SaleItem) => {
    const name = lang === 'am' ? item.name_am : item.name_en
    doc.text(name.substring(0, 18), 5, y)
    doc.text(item.quantity.toString(), 35, y)
    doc.text(formatCurrency(item.unitPrice), 50, y)
    doc.text(formatCurrency(item.total), 65, y)
    y += 4
  })

  y += 2
  doc.setFontSize(10)
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 5

  // Totals
  doc.setFontSize(9)
  const subtotalLabel = lang === 'am' ? 'ድምር' : 'Subtotal'
  doc.text(`${subtotalLabel}:`, 5, y)
  doc.text(formatCurrency(sale.subtotal), 65, y)
  y += 4

  if (sale.discount > 0) {
    const discLabel = lang === 'am' ? 'ቅናሽ' : 'Discount'
    doc.text(`${discLabel}: -${formatCurrency(sale.discount)}`, 5, y)
    y += 4
  }

  doc.setFontSize(11)
  doc.setFont(font, 'bold')
  const totalLabel = lang === 'am' ? 'ጠቅላላ' : 'TOTAL'
  doc.text(`${totalLabel}:`, 5, y)
  doc.text(formatCurrency(sale.total), 65, y)
  y += 6

  doc.setFont(font, 'normal')
  doc.setFontSize(8)
  const payLabel = lang === 'am' ? 'የክፍያ ዘዴ' : 'Payment'
  doc.text(`${payLabel}: ${sale.paymentMethod}`, 5, y)
  y += 4

  if (sale.paymentMethod === 'cash' && sale.cashReceived) {
    const cashLabel = lang === 'am' ? 'የተቀበለው' : 'Cash'
    const changeLabel = lang === 'am' ? 'መቀየሪያ' : 'Change'
    doc.text(`${cashLabel}: ${formatCurrency(sale.cashReceived)}`, 5, y)
    y += 4
    if (sale.changeDue) {
      doc.text(`${changeLabel}: ${formatCurrency(sale.changeDue)}`, 5, y)
      y += 4
    }
  }

  y += 6
  doc.setFontSize(10)
  const thanks = lang === 'am' ? 'እንደበረከተ እንመሰክራለን!' : 'Thank you for your purchase!'
  doc.text(thanks, pageWidth / 2, y, { align: 'center' })
  y += 4
  doc.text('🌾 Hussen Bakery 🌾', pageWidth / 2, y, { align: 'center' })

  doc.autoPrint()
  window.open(doc.output('bloburl'))
}

export function downloadReceiptPDF(sale: Sale, shop: ShopInfo, lang: 'en' | 'am') {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] })
  const font = lang === 'am' ? 'Noto Sans Ethiopic' : 'Helvetica'
  const name = lang === 'am' ? shop.name_am : shop.name
  const pageWidth = 80
  let y = 10

  doc.setFont(font)
  doc.setFontSize(14)
  doc.text(name, pageWidth / 2, y, { align: 'center' })
  y += 6
  doc.setFontSize(8)
  doc.text('Bulehora, Ethiopia', pageWidth / 2, y, { align: 'center' })
  y += 8

  const headerText = lang === 'am' ? 'የሽያጭ ደረሰኝ' : 'SALES RECEIPT'
  doc.setFontSize(12)
  doc.text(headerText, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(8)
  doc.text(`Date: ${formatDateTime(sale.timestamp)}`, 5, y)
  y += 4
  doc.text(`Cashier: ${sale.cashierId.slice(0, 8)}`, 5, y)
  y += 6

  doc.setFontSize(10)
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(8)
  sale.items.forEach((item: SaleItem) => {
    const n = lang === 'am' ? item.name_am : item.name_en
    doc.text(`${n} x${item.quantity}`, 5, y)
    doc.text(formatCurrency(item.total), 65, y)
    y += 4
  })

  y += 2
  doc.text('━'.repeat(20), pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setFontSize(11)
  doc.setFont(font, 'bold')
  doc.text(`TOTAL: ${formatCurrency(sale.total)}`, 5, y)
  y += 6

  doc.setFont(font, 'normal')
  doc.setFontSize(8)
  doc.text(`Payment: ${sale.paymentMethod}`, 5, y)

  doc.save(`receipt-${sale.id?.slice(0, 8) || 'sale'}.pdf`)
}
