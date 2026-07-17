import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /**
   * Both variants slide up from the bottom on phones (thumb-reachable, full
   * width) and centre as a normal dialog from `sm` up. They differ in who owns
   * the padding and scrolling:
   *
   * - 'default' — the sheet pads and scrolls its own content. Use for forms;
   *   every existing dialog gets the slide-up treatment for free.
   * - 'sheet'   — no padding, a flex column, so the caller can pin its own
   *   header/footer and scroll only the middle (POS cart, checkout).
   */
  variant?: 'default' | 'sheet'
  hideClose?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, variant = 'default', hideClose, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className="backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        variant === 'sheet'
          ? [
              // Phone: full-width sheet pinned to the bottom edge.
              'inset-x-0 bottom-0 flex max-h-[92dvh] w-full flex-col rounded-t-3xl border-t p-0',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              // Desktop: behave like a normal centred dialog.
              'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border',
              'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
            ]
          : [
              // Phone: same slide-up sheet, but it keeps its own padding and
              // scrolls internally so plain form dialogs need no changes.
              'inset-x-0 bottom-0 grid max-h-[92dvh] w-full gap-4 overflow-y-auto rounded-t-3xl border-t px-4 pb-5 pt-3',
              'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
              // Desktop: centred dialog.
              'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6',
              'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
            ],
        className
      )}
      {...props}
    >
      {/* Grab handle — signals the sheet is dismissible by swiping down. Phone
          only: on desktop these are ordinary centred dialogs. */}
      <div
        className={cn(
          'mx-auto h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden',
          variant === 'sheet' ? 'mt-2' : '-mt-1 mb-1'
        )}
      />
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            'absolute rounded-full p-1.5 text-muted-foreground opacity-70 ring-offset-background transition-opacity hover:bg-accent hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none',
            variant === 'sheet' ? 'right-3 top-3' : 'right-4 top-4'
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
