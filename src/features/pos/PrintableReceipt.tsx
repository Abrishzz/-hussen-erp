import { createPortal } from 'react-dom'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toDate } from '@/lib/analytics'
import type { Sale } from '@/types'

interface Props {
  sale: Sale | null
  shop: { name: string; name_am: string; address?: string; phone?: string; telebirrNumber?: string; bankAccount?: string }
  lang: 'en' | 'am'
  branchName?: string
}

/**
 * The receipt, as real HTML in the page.
 *
 * It is NOT a PDF on purpose: generating a PDF and printing it from a hidden
 * iframe silently prints the surrounding web page in Safari (an iframe holding a
 * PDF exposes no printable document), and opening it in a tab gets popup-blocked.
 * Printing plain HTML that `@media print` isolates works in every browser,
 * including iOS, and lets a thermal printer size it at 80mm.
 */
export function PrintableReceipt({ sale, shop, lang, branchName }: Props) {
  if (!sale) return null

  const am = lang === 'am'
  const name = am ? 'ናፍሲ ቤከሪ' : 'Nafsi Bakery'
  const itemName = (i: Sale['items'][number]) => (am ? i.name_am : i.name_en)

  const L = {
    item: am ? 'ዕቃ' : 'Item',
    qty: am ? 'ብዛት' : 'Qty',
    price: am ? 'ዋጋ' : 'Price',
    total: am ? 'ጠቅላላ' : 'TOTAL',
    subtotal: am ? 'ንዑስ ድምር' : 'Subtotal',
    discount: am ? 'ቅናሽ' : 'Discount',
    payment: am ? 'ክፍያ' : 'Payment',
    cash: am ? 'ጥሬ ገንዘብ' : 'Cash',
    change: am ? 'መልስ' : 'Change',
    served: am ? 'አገልጋይ' : 'Served by',
    customer: am ? 'ደንበኛ' : 'Customer',
    thanks: am ? 'እናመሰግናለን!' : 'Thank you!',
  }

  // Portalled to <body>: the print CSS positions this absolutely, and any
  // positioned/overflow-clipped ancestor in the app layout would shift or clip it.
  return createPortal(
    <div id="print-receipt" className="print-receipt" aria-hidden="true">
      <div className="pr-center">
        <div className="pr-shop">{name}</div>
        {shop.address && <div>{shop.address}</div>}
        {branchName && <div>{branchName}</div>}
        {shop.phone && <div>Tel: {shop.phone}</div>}
        <div>Bulehora, Ethiopia</div>
      </div>

      <div className="pr-rule" />
      <div className="pr-row"><span>#{sale.id?.slice(0, 8)}</span><span>{formatDateTime(toDate(sale.timestamp))}</span></div>
      {sale.customerName && <div className="pr-row"><span>{L.customer}</span><span>{sale.customerName}</span></div>}
      <div className="pr-rule" />

      <table className="pr-table">
        <thead>
          <tr>
            <th className="pr-left">{L.item}</th>
            <th className="pr-right">{L.qty}</th>
            <th className="pr-right">{L.price}</th>
            <th className="pr-right">{L.total}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i, n) => (
            <tr key={n}>
              <td className="pr-left">{itemName(i)}</td>
              <td className="pr-right">{i.quantity}</td>
              <td className="pr-right">{(i.unitPrice / 100).toFixed(2)}</td>
              <td className="pr-right">{(i.total / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pr-rule" />
      <div className="pr-row"><span>{L.subtotal}</span><span>{formatCurrency(sale.subtotal)}</span></div>
      {sale.discount > 0 && (
        <div className="pr-row"><span>{L.discount}</span><span>-{formatCurrency(sale.discount)}</span></div>
      )}
      <div className="pr-row pr-total"><span>{L.total}</span><span>{formatCurrency(sale.total)}</span></div>
      <div className="pr-rule" />

      <div className="pr-row"><span>{L.payment}</span><span>{sale.paymentMethod}</span></div>
      {sale.paymentMethod === 'cash' && !!sale.cashReceived && (
        <>
          <div className="pr-row"><span>{L.cash}</span><span>{formatCurrency(sale.cashReceived)}</span></div>
          <div className="pr-row"><span>{L.change}</span><span>{formatCurrency(sale.changeDue || 0)}</span></div>
        </>
      )}
      {sale.paymentMethod === 'telebirr' && shop.telebirrNumber && (
        <div className="pr-row"><span>{am ? 'ተሌብር' : 'Telebirr'}</span><span>{shop.telebirrNumber}</span></div>
      )}
      {sale.paymentMethod === 'bank' && shop.bankAccount && (
        <div className="pr-row"><span>{am ? 'ባንክ' : 'Bank'}</span><span>{shop.bankAccount}</span></div>
      )}

      <div className="pr-rule" />
      <div className="pr-center pr-thanks">{L.thanks}</div>
      <div className="pr-center">** {name} **</div>
    </div>,
    document.body
  )
}
