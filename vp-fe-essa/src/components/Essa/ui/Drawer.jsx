import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-xl',
  className
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="essa-drawer-root"
          className={clsx(
            'essa-dashboard essa-drawer-root email-templates-page fixed inset-0 z-[1200] flex justify-end',
            className
          )}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className={clsx('flex h-full w-full flex-col bg-white shadow-pop', width)}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
              <h2 className="m-0 text-sm font-semibold text-ink">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="rounded p-1 text-ink-muted hover:bg-line-soft"
              >
                <X size={16} />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
            {footer ? (
              <div className="ie-drawer-foot flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-white px-4 py-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}
