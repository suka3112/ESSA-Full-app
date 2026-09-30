import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Dialog({ open, onClose, title, description, children, footer, width = 560 }) {
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
      {open && (
        <div className="essa-dashboard essa-dialog-root" key="essa-dialog-root">
          <motion.div
            className="dx-dialog-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="presentation"
          >
            <motion.div
              className="dx-dialog"
              style={{ maxWidth: width }}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dx-dialog-title"
            >
              <div className="dx-dialog-header">
                <div className="dx-dialog-header-text">
                  <h3 id="dx-dialog-title" className="dx-dialog-title">
                    {title}
                  </h3>
                  {description ? <p className="dx-dialog-subtitle">{description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="dx-dialog-close"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="dx-dialog-body">{children}</div>
              {footer ? <div className="dx-dialog-footer">{footer}</div> : null}
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
