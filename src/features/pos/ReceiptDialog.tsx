import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useReactToPrint } from 'react-to-print'
import { Printer, Download, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { generateReceiptPdf, type ReceiptData, type ReceiptLabels } from './receipt'

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: ReceiptData | null
  shopName: string
}

export function ReceiptDialog({ open, onOpenChange, sale, shopName }: ReceiptDialogProps) {
  const { t } = useTranslation()
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: sale ? `receipt-${sale.id.slice(0, 8)}` : 'receipt',
  })

  if (!sale) return null

  const labels: ReceiptLabels = {
    shopName,
    title: t('pos.receipt.title'),
    date: t('pos.receipt.date'),
    cashier: t('pos.receipt.cashier'),
    customer: t('common.name'),
    item: t('pos.receipt.item'),
    qty: t('pos.receipt.qty'),
    total: t('pos.receipt.total'),
    subtotal: t('common.subtotal'),
    discount: t('common.discount'),
    grandTotal: t('common.total'),
    payment: t('pos.payment'),
    cashReceived: t('pos.cashReceived'),
    changeDue: t('pos.changeDue'),
    thankYou: t('pos.receipt.thankYou'),
    paymentMethods: {
      cash: t('pos.cash'),
      telebirr: t('pos.telebirr'),
      bank: t('pos.bankTransfer'),
    },
  }

  const nameFor = (item: ReceiptData['items'][number]) =>
    sale.lang === 'am' ? item.name_am || item.name_en : item.name_en

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('pos.saleCompleted')}</DialogTitle>
        </DialogHeader>

        {/* Printable area — fixed light styling so print output is legible */}
        <div ref={printRef} className="rounded-md border bg-white p-4 text-black">
          <div className="text-center">
            <div className="text-base font-bold">{shopName}</div>
            <div className="text-[10px]">Bulehora, Oromia, Ethiopia</div>
            <div className="text-[11px]">{labels.title}</div>
          </div>
          <div className="mt-2 border-t border-dashed pt-2 text-[11px] leading-5">
            <div>
              {labels.date}: {sale.timestamp.toLocaleString('en-GB')}
            </div>
            <div>
              {labels.cashier}: {sale.cashierName}
            </div>
            {sale.customerName && (
              <div>
                {labels.customer}: {sale.customerName}
              </div>
            )}
            <div>#{sale.id.slice(0, 8)}</div>
          </div>

          <table className="mt-2 w-full border-t border-dashed pt-2 text-[11px]">
            <thead>
              <tr className="border-b border-dashed">
                <th className="py-1 text-left font-semibold">{labels.item}</th>
                <th className="py-1 text-center font-semibold">{labels.qty}</th>
                <th className="py-1 text-right font-semibold">{labels.total}</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.productId}>
                  <td className="py-0.5">{nameFor(item)}</td>
                  <td className="py-0.5 text-center">{item.quantity}</td>
                  <td className="py-0.5 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 space-y-0.5 border-t border-dashed pt-2 text-[11px]">
            <div className="flex justify-between">
              <span>{labels.subtotal}</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span>{labels.discount}</span>
                <span>- {formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold">
              <span>{labels.grandTotal}</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>{labels.payment}</span>
              <span>{labels.paymentMethods[sale.paymentMethod]}</span>
            </div>
            {sale.paymentMethod === 'cash' && sale.cashReceived != null && (
              <>
                <div className="flex justify-between">
                  <span>{labels.cashReceived}</span>
                  <span>{formatCurrency(sale.cashReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{labels.changeDue}</span>
                  <span>{formatCurrency(sale.changeDue ?? 0)}</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 text-center text-[10px] italic">{labels.thankYou}</div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePrint()}>
              <Printer className="mr-2 h-4 w-4" />
              {t('common.print')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateReceiptPdf(sale, labels)}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.pdf')}
            </Button>
          </div>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pos.newSale')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
