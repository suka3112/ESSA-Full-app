import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileX
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

export default function PdfViewer({ src, fileName = 'Document', overlays = [], onFieldClick }) {
  const file = resolvePdfSrc(src)
  const rootRef = useRef(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [scale, setScale] = useState(1)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    setLoadFailed(false)
    setPageNum(1)
  }, [file])

  const overlaysForPage = overlays.filter((o) => (o.page || 1) === pageNum)

  const openPdf = () => {
    if (typeof file !== 'string') return
    window.open(file, '_blank', 'noopener,noreferrer')
  }

  const downloadPdf = () => {
    if (typeof file !== 'string') return
    const link = document.createElement('a')
    link.href = file
    link.download = fileName || 'document.pdf'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

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

  return (
    <div ref={rootRef} className="dx-doc-viewer" style={{ height: '100%' }}>
      <div className="dx-doc-viewer-frame">
        <div className="dx-doc-toolbar">
          <span className="dx-doc-toolbar-file">
            <span className="dx-doc-toolbar-name" title={fileName}>
              {fileName}
            </span>
          </span>
          <span className="dx-doc-toolbar-group">
            <ToolBtn
              aria-label="Zoom out"
              onClick={() => setScale((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
              disabled={scale <= 0.6}
            >
              <ZoomOut size={14} />
            </ToolBtn>
            <span className="dx-doc-toolbar-zoom">{Math.round(scale * 100)}%</span>
            <ToolBtn
              aria-label="Zoom in"
              onClick={() => setScale((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              disabled={scale >= 1.8}
            >
              <ZoomIn size={14} />
            </ToolBtn>
          </span>
          <span className="dx-doc-toolbar-rule" aria-hidden="true" />
          <span className="dx-doc-toolbar-group">
            <ToolBtn
              aria-label="Previous page"
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum <= 1}
            >
              <ChevronLeft size={14} />
            </ToolBtn>
            <span className="dx-doc-toolbar-page">
              Page {pageNum}/{numPages || '—'}
            </span>
            <ToolBtn
              aria-label="Next page"
              onClick={() => setPageNum((p) => Math.min(numPages || p + 1, p + 1))}
              disabled={!numPages || pageNum >= numPages}
            >
              <ChevronRight size={14} />
            </ToolBtn>
          </span>
          <span className="dx-doc-toolbar-rule" aria-hidden="true" />
          <span className="dx-doc-toolbar-group">
            <ToolBtn title="Open in new tab" aria-label="Open in new tab" onClick={openPdf}>
              <ExternalLink size={14} />
            </ToolBtn>
            <ToolBtn title="Download PDF" aria-label="Download PDF" onClick={downloadPdf}>
              <Download size={14} />
            </ToolBtn>
          </span>
        </div>

        <div className="dx-doc-stage">
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
    <button type="button" className="dx-doc-tool" {...props}>
      {children}
    </button>
  )
}
