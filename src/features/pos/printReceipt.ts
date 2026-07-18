import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toDate } from '@/lib/analytics'
import type { Sale } from '@/types'

/** The bakery brand, printed boldly at the top of every receipt. */
const BRAND = { en: 'Nafsi Bakery', am: 'ናፍሲ ቤከሪ' }
const TAGLINE = { en: 'Freshly Baked, Every Day', am: 'በየቀኑ ትኩስ የተጋገረ' }

export interface ReceiptShop {
  name?: string
  name_am?: string
  telebirrNumber?: string
  bankAccount?: string
  phone?: string
}

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
}

/**
 * Builds a complete, self-contained HTML document for the receipt — its own
 * `<style>` and all. It is printed from a dedicated iframe (see `printReceipt`)
 * so the thermal printer only ever sees the receipt, never the app page.
 */
export function buildReceiptHtml(sale: Sale, shop: ReceiptShop, lang: 'en' | 'am', branchName?: string): string {
  const am = lang === 'am'
  const brand = am ? BRAND.am : BRAND.en
  const tagline = am ? TAGLINE.am : TAGLINE.en
  const itemName = (i: Sale['items'][number]) => (am ? i.name_am || i.name_en : i.name_en)

  const L = {
    receipt: am ? 'ደረሰኝ' : 'SALES RECEIPT',
    item: am ? 'ዕቃ' : 'Item', qty: am ? 'ብዛት' : 'Qty', price: am ? 'ዋጋ' : 'Price', amount: am ? 'ድምር' : 'Amount',
    total: am ? 'ጠቅላላ' : 'TOTAL', subtotal: am ? 'ንዑስ ድምር' : 'Subtotal', discount: am ? 'ቅናሽ' : 'Discount',
    payment: am ? 'ክፍያ' : 'Payment', cash: am ? 'ጥሬ ገንዘብ' : 'Cash', change: am ? 'መልስ' : 'Change',
    customer: am ? 'ደንበኛ' : 'Customer', date: am ? 'ቀን' : 'Date',
    thanks: am ? 'ስለ ግዢዎ እናመሰግናለን!' : 'Thank you for your purchase!',
  }

  const pay = sale.paymentMethod
  const payLabel = pay === 'cash' ? L.cash : pay === 'telebirr' ? 'Telebirr' : (am ? 'ባንክ' : 'Bank')

  const rows = sale.items.map((i) => `
    <tr>
      <td class="l">${esc(itemName(i))}</td>
      <td class="c">${i.quantity}</td>
      <td class="r">${(i.unitPrice / 100).toFixed(2)}</td>
      <td class="r">${(i.total / 100).toFixed(2)}</td>
    </tr>`).join('')

  const payLines = [
    `<div class="row pay"><span>${L.payment}</span><span>${esc(payLabel)}</span></div>`,
    pay === 'telebirr' && shop.telebirrNumber ? `<div class="row"><span>Telebirr</span><span>${esc(shop.telebirrNumber)}</span></div>` : '',
    pay === 'bank' && shop.bankAccount ? `<div class="row"><span>${am ? 'ባንክ' : 'Bank'}</span><span>${esc(shop.bankAccount)}</span></div>` : '',
    pay === 'cash' && sale.cashReceived
      ? `<div class="row"><span>${L.cash}</span><span>${esc(formatCurrency(sale.cashReceived))}</span></div>
         <div class="row"><span>${L.change}</span><span>${esc(formatCurrency(sale.changeDue || 0))}</span></div>`
      : '',
  ].join('')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(brand)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; background: #fff; }
  body {
    width: 76mm; margin: 0 auto; padding: 3mm 3mm 6mm;
    color: #000; font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 9.5pt; font-weight: 700; line-height: 1.4;
    -webkit-font-smoothing: none;
  }
  .l { text-align: left; } .r { text-align: right; } .c { text-align: center; }
  .brand { text-align: center; font-size: 20pt; font-weight: 800; letter-spacing: 1.5px; line-height: 1.1; margin-bottom: 1mm; }
  .tagline { text-align: center; font-size: 7.5pt; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 1.5mm; }
  .meta { text-align: center; font-size: 8pt; line-height: 1.3; }
  .meta .branch { font-weight: 800; font-size: 9pt; }
  .doc { text-align: center; font-size: 9pt; font-weight: 800; letter-spacing: 4px; padding: 0.5mm 0; }
  .double { border-top: 1.5pt solid #000; border-bottom: 1.5pt solid #000; height: 1.2mm; margin: 1.8mm 0; }
  .dash { border-top: 1pt dashed #000; margin: 1.5mm 0; }
  .info { margin: 1mm 0; font-size: 8.5pt; }
  .row { display: flex; justify-content: space-between; gap: 2mm; }
  .pay { margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 1mm; }
  th { border-bottom: 1pt solid #000; font-weight: 800; font-size: 8pt; padding-bottom: 0.6mm; }
  td { padding: 0.5mm 0; vertical-align: top; font-size: 8.5pt; }
  th.l, td.l { width: 46%; } th.c, td.c { width: 12%; }
  .totalbox { display: flex; justify-content: space-between; align-items: center; border: 1.5pt solid #000; padding: 1.2mm 2mm; margin: 1.5mm 0; font-size: 12pt; font-weight: 800; }
  .thanks { text-align: center; margin-top: 1mm; font-size: 9pt; }
  .signoff { text-align: center; font-weight: 800; font-size: 10pt; letter-spacing: 1px; }
  .stars { text-align: center; letter-spacing: 1px; margin-top: 1mm; }
</style>
</head>
<body>
  <div class="brand">${esc(brand)}</div>
  <div class="tagline">${esc(tagline)}</div>
  <div class="meta">
    ${branchName ? `<div class="branch">${esc(branchName)}</div>` : ''}
    <div>Bulehora, Ethiopia</div>
    ${shop.phone ? `<div>Tel: ${esc(shop.phone)}</div>` : ''}
  </div>

  <div class="double"></div>
  <div class="doc">${L.receipt}</div>
  <div class="double"></div>

  <div class="info">
    <div class="row"><span>${L.date}</span><span>${esc(formatDateTime(toDate(sale.timestamp)))}</span></div>
    <div class="row"><span>#</span><span>${esc((sale.id || '').slice(0, 8).toUpperCase())}</span></div>
    ${sale.customerName ? `<div class="row"><span>${L.customer}</span><span>${esc(sale.customerName)}</span></div>` : ''}
  </div>

  <table>
    <thead><tr><th class="l">${L.item}</th><th class="c">${L.qty}</th><th class="r">${L.price}</th><th class="r">${L.amount}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="dash"></div>
  <div class="row"><span>${L.subtotal}</span><span>${esc(formatCurrency(sale.subtotal))}</span></div>
  ${sale.discount > 0 ? `<div class="row"><span>${L.discount}</span><span>-${esc(formatCurrency(sale.discount))}</span></div>` : ''}

  <div class="totalbox"><span>${L.total}</span><span>${esc(formatCurrency(sale.total))}</span></div>

  ${payLines}

  <div class="double"></div>
  <div class="thanks">${L.thanks}</div>
  <div class="signoff">${esc(brand)}</div>
  <div class="stars">• • • • • • • • • • • • •</div>
</body>
</html>`
}

/**
 * Prints the receipt from a dedicated hidden iframe so the printer/RAWBT only
 * ever sees the receipt document — never the app page (the old whole-page
 * `@media print` visibility trick printed blank on thermal printers). Writing
 * real HTML (not a PDF) keeps it routing to the Sunmi/RAWBT print service.
 */
export function printReceipt(sale: Sale, shop: ReceiptShop, lang: 'en' | 'am', branchName?: string): void {
  document.getElementById('receipt-print-frame')?.remove()

  const iframe = document.createElement('iframe')
  iframe.id = 'receipt-print-frame'
  iframe.setAttribute('aria-hidden', 'true')
  // 0×0 + off-screen: laid out for printing, invisible on screen. Never
  // display:none — that stops the content from printing.
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument || win?.document
  if (!win || !doc) return

  doc.open()
  doc.write(buildReceiptHtml(sale, shop, lang, branchName))
  doc.close()

  let done = false
  const fire = () => {
    if (done) return
    done = true
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore — nothing more we can do */
    } finally {
      window.setTimeout(() => iframe.remove(), 2000)
    }
  }

  // Print once the little document has laid out; onload is most reliable, with a
  // timeout fallback for engines that don't fire it for document.write.
  iframe.onload = fire
  window.setTimeout(fire, 400)
}
