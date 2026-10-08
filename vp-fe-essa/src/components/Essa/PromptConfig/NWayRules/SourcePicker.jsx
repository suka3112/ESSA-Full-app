import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Search } from 'lucide-react'
import { CHANNELS, SOURCES } from '../../lib/nWay/catalog'
import { ChannelChip } from '../../lib/nWay/NWayChips'
import { matrixTitleFor } from '../../lib/nWay/matrixMap'

/** Same grouping as the rule editor: documents first, then SAP, then other systems. */
const GROUPS = [
  { label: 'Documents in the invoice package', channels: ['VENDOR_PDF', 'USER'] },
  { label: 'SAP master data', channels: ['SAP'] },
  { label: 'Other systems', channels: ['EXTERNAL', 'ESSA_SYSTEM'] }
]

/**
 * Popover for the matrix “Source document” column (Excel column D).
 * props: anchorEl, current (source code), title, matrixTitle (column D text), disabledReason, onPick(code), onClose()
 */
export default function SourcePicker({ anchorEl, current, title, matrixTitle, disabledReason, onPick, onClose }) {
  const ref = useRef(null)
  const inputRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUPS.map((g) => ({
      ...g,
      items: SOURCES.filter((s) => g.channels.includes(s.channel)).filter((s) => {
        if (!q) return true
        return `${s.label} ${matrixTitleFor(s.code)} ${CHANNELS[s.channel].long}`.toLowerCase().includes(q)
      })
    })).filter((g) => g.items.length)
  }, [query])
  const flat = useMemo(() => options.flatMap((g) => g.items), [options])

  useEffect(() => {
    const i = flat.findIndex((s) => s.code === current)
    setActive(i >= 0 ? i : 0)
  }, [flat, current])

  useLayoutEffect(() => {
    if (!anchorEl || !ref.current) return
    const r = anchorEl.getBoundingClientRect()
    const m = ref.current.getBoundingClientRect()
    let top = r.bottom + 6
    if (top + m.height > window.innerHeight - 8) top = Math.max(8, r.top - m.height - 6)
    const left = Math.max(8, Math.min(r.left, window.innerWidth - m.width - 8))
    setPos({ top, left })
  }, [anchorEl, options.length])

  useEffect(() => {
    inputRef.current?.focus()
    const onDown = (e) => {
      if (ref.current?.contains(e.target) || anchorEl?.contains(e.target)) return
      onClose()
    }
    const onScroll = (e) => {
      if (ref.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [anchorEl, onClose])

  useEffect(() => {
    ref.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (code) => {
    if (disabledReason) return
    if (code === current) return onClose()
    onPick(code)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      anchorEl?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!flat.length) return
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + dir + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) pick(flat[active].code)
    }
  }

  let index = -1
  return createPortal(
    <div
      ref={ref}
      className="nw-rolemenu nw-srcpick essa-dashboard"
      role="dialog"
      aria-label={title}
      style={{ top: pos.top, left: pos.left }}
      onKeyDown={onKeyDown}>
      <div className="nw-rolemenu__title">{title}</div>
      {matrixTitle ? (
        <div className="nw-srcpick__excel">
          Excel column D says <b>{matrixTitle}</b>
        </div>
      ) : null}
      <label className="nw-srcpick__search">
        <Search size={13} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Find a document or system"
          aria-label="Find a source document"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="nw-srcpick__list" role="listbox" aria-label="Source documents">
        {options.map((g) => (
          <div key={g.label} role="group" aria-label={g.label}>
            <div className="nw-srcpick__group">{g.label}</div>
            {g.items.map((s) => {
              index += 1
              const i = index
              const selected = s.code === current
              const excel = matrixTitleFor(s.code)
              return (
                <button
                  key={s.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`nw-srcpick__item${selected ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s.code)}>
                  <span className="nw-srcpick__text">
                    <b>{s.label}</b>
                    <small>{excel ? `Excel: ${excel}` : 'Not a column in the Excel matrix'}</small>
                  </span>
                  <ChannelChip code={s.code} />
                  {selected ? <Check size={14} className="nw-srcpick__check" aria-hidden /> : <span />}
                </button>
              )
            })}
          </div>
        ))}
        {!flat.length ? <div className="nw-srcpick__empty">No document matches “{query}”.</div> : null}
      </div>
      <div className="nw-rolemenu__foot">
        {disabledReason || 'The previous source stays in the rule as a Mandatory compare document. Saved as soon as you pick.'}
      </div>
    </div>,
    document.body
  )
}
