import { toast } from 'react-toastify'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const ESSA_TOAST_OPTS = {
  icon: false,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  autoClose: 4500
}

const VARIANT_ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle
}

function EssaToastContent({ variant = 'success', title, message, Icon }) {
  const ResolvedIcon = Icon || VARIANT_ICONS[variant] || CheckCircle2
  return (
    <div className={`essa-toast essa-toast--${variant}`}>
      <div className="essa-toast-icon" aria-hidden>
        <ResolvedIcon size={20} strokeWidth={2.25} />
      </div>
      <div className="essa-toast-body">
        <div className="essa-toast-title">{title}</div>
        {message ? <div className="essa-toast-message">{message}</div> : null}
      </div>
    </div>
  )
}

function showEssaToast(variant, { title, message, autoClose = 4500 }) {
  const content = (
    <EssaToastContent
      variant={variant}
      Icon={VARIANT_ICONS[variant]}
      title={title}
      message={message}
    />
  )
  const opts = {
    ...ESSA_TOAST_OPTS,
    autoClose,
    className: `essa-toast-wrap essa-toast-wrap--${variant}`,
    progressClassName: `essa-toast-progress essa-toast-progress--${variant}`
  }

  if (variant === 'error') return toast.error(content, opts)
  if (variant === 'warning') return toast.warning(content, opts)
  if (variant === 'info') return toast.info(content, opts)
  return toast.success(content, opts)
}

export function showExtractionSuccessToast(documentCount) {
  const count = Math.max(1, Number(documentCount) || 1)
  showEssaToast('success', {
    title: 'Extraction complete',
    message:
      count === 1
        ? 'Your document was extracted successfully. Opening invoice detail…'
        : `${count} documents were extracted successfully. Opening invoice detail…`
  })
}

export function showInvoiceParkedToast(invoiceNo) {
  showEssaToast('success', {
    title: 'Invoice parked',
    message: `${invoiceNo || 'Invoice'} has been parked and submitted for review.`
  })
}

export function showInvoiceReturnedToast(invoiceNo) {
  showEssaToast('info', {
    title: 'Returned for correction',
    message: `${invoiceNo || 'Invoice'} was sent back for correction.`
  })
}

export function showInvoiceApprovedToast(invoiceNo) {
  showEssaToast('success', {
    title: 'Invoice approved',
    message: `${invoiceNo || 'Invoice'} has been approved and advanced to the next workflow step.`
  })
}

export function showInvoiceRejectedToast(invoiceNo) {
  showEssaToast('info', {
    title: 'Invoice rejected',
    message: `${invoiceNo || 'Invoice'} was returned to AP for correction.`
  })
}

export function showEssaSuccessToast(title, message) {
  showEssaToast('success', { title, message })
}

export function showEssaInfoToast(title, message) {
  showEssaToast('info', { title, message })
}

export function showEssaErrorToast(title, message) {
  showEssaToast('error', { title, message })
}
