import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/**
 * A compact thumbnail that opens the full payment-proof image. Renders nothing
 * when the sale has no proof, so callers can drop it into a table cell freely.
 */
export function PaymentProofViewer({ proof }: { proof?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!proof) return <span className="text-muted-foreground">—</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-accent"
      >
        <img src={proof} alt="" className="h-6 w-6 rounded object-cover" />
        {t('pos.viewProof')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent variant="sheet" className="sm:max-w-lg">
          <DialogHeader className="shrink-0 px-4 pb-2 pt-3 text-left sm:px-6 sm:pt-5">
            <DialogTitle>{t('pos.paymentProof')}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <img src={proof} alt={t('pos.paymentProof')} className="mx-auto max-h-[70vh] w-auto rounded-xl" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
