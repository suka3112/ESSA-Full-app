import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileX,
  Maximize2,
  Minimize2,
  RotateCcw,
  PanelLeftClose
} from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Must match pdfjs-dist version bundled with react-pdf (see public/pdf.worker.min.mjs).
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`

function resolvePdfSrc(src) {
  if (typeof src !== 'string') return src
  const host = (process.env.REACT_APP_OCR_PDF_IP || '').trim()
  if (!host || !src.includes('localhost')) return src
  return src.replace(/localhost/gi, host)
}

function PdfEmptyState({ title, description }) {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        height: '100%',
        padding: 32,
        textAlign: 'center'
      }}
    >
      <div>
        <FileX size={28} style={{ color: 'var(--dx-text-mute)' }} />
        <div
          style={{
            marginTop: 10,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--dx-text)'
          }}
        >
          {title}
        </div>
        <p
          style={{
            marginTop: 4,
            fontSize: 12,
            color: 'var(--dx-text-mute)',
            maxWidth: 280
          }}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

export default function PdfViewer({ src, overlays = [], onFieldClick, onClose }) {
  const file = resolvePdfSrc(src)
  const rootRef = useRef(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loadFailed, setLoadFailed] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
    setPageNum(1)
    setIsFullscreen(false)
  }, [file])

  useEffect(() => {
    if (!isFullscreen) return undefined

    const onKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  const overlaysForPage = overlays.filter((o) => (o.page || 1) === pageNum)

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen()
        } catch {
          /* ignore */
        }
      }
      setIsFullscreen(false)
      return
    }

    setIsFullscreen(true)

    const el = rootRef.current
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen()
      } catch {
        /* fixed overlay fallback is already active */
      }
    }
  }

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  if (!file) {
    return (
      <PdfEmptyState
        title="PDF preview unavailable"
        description="The source file isn't accessible. Extracted fields are still shown on the right."
      />
    )
  }

  if (loadFailed) {
    return (
      <PdfEmptyState
        title="PDF preview unavailable"
        description="The source file isn't accessible. Extracted fields are still shown on the right."
      />
    )
  }

  const shellStyle = isFullscreen
    ? {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      height: '100vh',
      background: 'var(--dx-card)'
    }
    : { height: '100%' }

  return (
    <div ref={rootRef} className={isFullscreen ? 'dx-pdf-fullscreen' : undefined} style={shellStyle}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid var(--dx-border-soft)',
            background: 'var(--dx-card)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {onClose && !isFullscreen && (
              <ToolBtn onClick={onClose} title="Hide document">
                <PanelLeftClose size={15} />
              </ToolBtn>
            )}
            <ToolBtn onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}>
              <ChevronLeft size={15} />
            </ToolBtn>
            <div
              style={{
                fontSize: 12,
                color: 'var(--dx-text-soft)',
                minWidth: 56,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500
              }}
            >
              {numPages ? `${pageNum} / ${numPages}` : '—'}
            </div>
            <ToolBtn
              onClick={() => setPageNum((p) => Math.min(numPages || p + 1, p + 1))}
              disabled={pageNum >= numPages}
            >
              <ChevronRight size={15} />
            </ToolBtn>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ToolBtn onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} disabled={scale <= 0.5}>
              <ZoomOut size={15} />
            </ToolBtn>
            <div
              style={{
                fontSize: 12,
                color: 'var(--dx-text-soft)',
                minWidth: 44,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500
              }}
            >
              {Math.round(scale * 100)}%
            </div>
            <ToolBtn onClick={() => setScale((s) => Math.min(2.5, s + 0.1))} disabled={scale >= 2.5}>
              <ZoomIn size={15} />
            </ToolBtn>
            <ToolBtn onClick={() => setScale(1.0)} title="Reset zoom">
              <RotateCcw size={14} />
            </ToolBtn>
            <ToolBtn
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </ToolBtn>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--dx-bg)',
            padding: 16,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Document
              file={file}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              onLoadError={() => setLoadFailed(true)}
              loading={
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 540,
                    height: 720,
                    background: '#fff',
                    border: '1px solid var(--dx-border)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--dx-text-mute)'
                  }}
                >
                  Loading PDF…
                </div>
              }
            >
              <div
                style={{
                  position: 'relative',
                  boxShadow: 'var(--dx-shadow-md)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: '#fff'
                }}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
                {overlaysForPage.map((o, i) => {
                  const color =
                    o.tone === 'fail' ? '#F04438' : o.tone === 'warn' ? '#F79009' : '#289840'
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onFieldClick?.(o)}
                      style={{
                        position: 'absolute',
                        left: `${o.x * 100}%`,
                        top: `${o.y * 100}%`,
                        width: `${o.w * 100}%`,
                        height: `${o.h * 100}%`,
                        border: `2px solid ${color}`,
                        borderRadius: 4,
                        background: `${color}14`,
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all .15s ease'
                      }}
                      title={`${o.label}: ${o.value}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${color}24`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${color}14`
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: -19,
                          left: -1,
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: color,
                          color: '#fff',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {o.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Document>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      style={{
        width: 30,
        height: 30,
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: 'var(--dx-text-soft)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        transition: 'all .15s ease',
        opacity: props.disabled ? 0.4 : 1
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) e.currentTarget.style.background = 'var(--dx-bg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}
