import { createPortal } from 'react-dom'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toDate } from '@/lib/analytics'
import type { Sale } from '@/types'

/** The bakery's brand, shown once and boldly at the top of every receipt. */
const BRAND = { en: 'Nafsi Bakery', am: 'ናፍሲ ቤከሪ' }
const TAGLINE = { en: 'Freshly Baked, Every Day', am: 'በየቀኑ ትኩስ የተጋገረ' }

interface Props {
  sale: Sale | null
  shop: { name?: string; name_am?: string; telebirrNumber?: string; bankAccount?: string; phone?: string }
  lang: 'en' | 'am'
  branchName?: string
}

/**
 * The receipt, as real HTML in the page.
 *
 * It is NOT a PDF on purpose: a generated PDF just lands in the Downloads folder
 * on Android/Sunmi instead of printing. Plain HTML that `@media print` isolates
 * prints via the browser's own print flow — which on Sunmi routes to the RAWBT
 * thermal print service — and works identically in Chrome, Safari and iOS.
 */
export function PrintableReceipt({ sale, shop, lang, branchName }: Props) {
  if (!sale) return null

  const am = lang === 'am'
  const brand = am ? BRAND.am : BRAND.en
  const tagline = am ? TAGLINE.am : TAGLINE.en
  const itemName = (i: Sale['items'][number]) => (am ? i.name_am || i.name_en : i.name_en)

  const L = {
    receipt: am ? 'ደረሰኝ' : 'SALES RECEIPT',
    item: am ? 'ዕቃ' : 'Item',
    qty: am ? 'ብዛት' : 'Qty',
    price: am ? 'ዋጋ' : 'Price',
    amount: am ? 'ድምር' : 'Amount',
    total: am ? 'ጠቅላላ' : 'TOTAL',
    subtotal: am ? 'ንዑስ ድምር' : 'Subtotal',
    discount: am ? 'ቅናሽ' : 'Discount',
    payment: am ? 'ክፍያ' : 'Payment',
    cash: am ? 'ጥሬ ገንዘብ' : 'Cash',
    change: am ? 'መልስ' : 'Change',
    customer: am ? 'ደንበኛ' : 'Customer',
    date: am ? 'ቀን' : 'Date',
    cashier: am ? 'ካሽየር' : 'Served by',
    thanks: am ? 'ስለ ግዢዎ እናመሰግናለን!' : 'Thank you for your purchase!',
  }

  const pay = sale.paymentMethod
  const payLabel = pay === 'cash' ? L.cash : pay === 'telebirr' ? 'Telebirr' : (am ? 'ባንክ' : 'Bank')

  // Portalled to <body>: the print CSS positions this absolutely, and any
  // positioned/overflow-clipped ancestor in the app layout would shift or clip it.
  return createPortal(
    <div id="print-receipt" className="print-receipt" aria-hidden="true">
      {/* Brand */}
      <div className="pr-brand">{brand}</div>
      <div className="pr-tagline">{tagline}</div>
      <div className="pr-meta">
        {branchName && <div className="pr-branch">{branchName}</div>}
        <div>Bulehora, Ethiopia</div>
        {shop.phone && <div>Tel: {shop.phone}</div>}
      </div>

      <div className="pr-double" />
      <div className="pr-doc">{L.receipt}</div>
      <div className="pr-double" />

      <div className="pr-info">
        <div className="pr-row"><span>{L.date}</span><span>{formatDateTime(toDate(sale.timestamp))}</span></div>
        <div className="pr-row"><span>#</span><span>{sale.id?.slice(0, 8).toUpperCase()}</span></div>
        {sale.customerName && <div className="pr-row"><span>{L.customer}</span><span>{sale.customerName}</span></div>}
      </div>

      <table className="pr-table">
        <thead>
          <tr>
            <th className="pr-left">{L.item}</th>
            <th className="pr-c">{L.qty}</th>
            <th className="pr-right">{L.price}</th>
            <th className="pr-right">{L.amount}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i, n) => (
            <tr key={n}>
              <td className="pr-left">{itemName(i)}</td>
              <td className="pr-c">{i.quantity}</td>
              <td className="pr-right">{(i.unitPrice / 100).toFixed(2)}</td>
              <td className="pr-right">{(i.total / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pr-dash" />
      <div className="pr-row"><span>{L.subtotal}</span><span>{formatCurrency(sale.subtotal)}</span></div>
      {sale.discount > 0 && (
        <div className="pr-row"><span>{L.discount}</span><span>-{formatCurrency(sale.discount)}</span></div>
      )}

      <div className="pr-totalbox">
        <span>{L.total}</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>

      <div className="pr-row pr-pay"><span>{L.payment}</span><span>{payLabel}</span></div>
      {pay === 'telebirr' && shop.telebirrNumber && (
        <div className="pr-row"><span>Telebirr</span><span>{shop.telebirrNumber}</span></div>
      )}
      {pay === 'bank' && shop.bankAccount && (
        <div className="pr-row"><span>{am ? 'ባንክ' : 'Bank'}</span><span>{shop.bankAccount}</span></div>
      )}
      {pay === 'cash' && !!sale.cashReceived && (
        <>
          <div className="pr-row"><span>{L.cash}</span><span>{formatCurrency(sale.cashReceived)}</span></div>
          <div className="pr-row"><span>{L.change}</span><span>{formatCurrency(sale.changeDue || 0)}</span></div>
        </>
      )}

      <div className="pr-double" />
      <div className="pr-thanks">{L.thanks}</div>
      <div className="pr-signoff">{brand}</div>
      <div className="pr-stars">• • • • • • • • • • • • •</div>
    </div>,
    document.body
  )
}
