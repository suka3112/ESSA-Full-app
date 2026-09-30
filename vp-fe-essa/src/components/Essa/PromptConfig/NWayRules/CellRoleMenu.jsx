import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { Marker } from '../../lib/nWay/NWayChips'

/** Roles a matrix cell can take. `key` is the keyboard shortcut. */
export const CELL_ROLES = [
  { role: 'SOURCE', label: 'Anchor', hint: 'Source of truth — read the value here', key: 'A' },
  { role: 'REQUIRED', label: 'Compare · must match', hint: 'Missing or different fails the rule', key: 'C' },
  { role: 'IF_PRESENT', label: 'Compare · if present', hint: 'Only when the document is attached', key: 'O' },
  { role: 'PARTIAL', label: 'Partial', hint: 'Part of the value appears here', key: 'P' },
  { role: 'EXTRACT', label: 'Extract only', hint: 'Shown for context, not compared', key: 'E' },
  { role: null, label: 'Not used', hint: 'Remove this document from the rule', key: 'Del' }
]

export const roleFromKey = (key) => {
  const k = String(key || '').toLowerCase()
  if (k === 'a') return 'SOURCE'
  if (k === 'c' || k === 'x') return 'REQUIRED'
  if (k === 'o' || k === '?') return 'IF_PRESENT'
  if (k === 'p') return 'PARTIAL'
  if (k === 'e') return 'EXTRACT'
  if (k === 'delete' || k === 'backspace' || k === '-') return null
  return undefined
}

/**
 * Small popover anchored to a matrix cell.
 * props: anchorEl, current (role|null), title, disabledReason, onPick(role), onClose()
 */
export default function CellRoleMenu({ anchorEl, current, title, disabledReason, onPick, onClose }) {
  const menuRef = useRef(null)
  const [pos, setPos] = useState({ top: -9999, left: -9999 })
  const [active, setActive] = useState(() => Math.max(0, CELL_ROLES.findIndex((o) => o.role === (current ?? null))))

  const isDisabled = (opt) =>
    Boolean(disabledReason) || (current === 'SOURCE' && opt.role !== 'SOURCE') // the anchor moves only by picking another anchor

  useLayoutEffect(() => {
    if (!anchorEl || !menuRef.current) return
    const r = anchorEl.getBoundingClientRect()
    const m = menuRef.current.getBoundingClientRect()
    let top = r.bottom + 6
    let left = r.left + r.width / 2 - m.width / 2
    if (top + m.height > window.innerHeight - 8) top = r.top - m.height - 6
    left = Math.max(8, Math.min(left, window.innerWidth - m.width - 8))
    setPos({ top, left })
  }, [anchorEl])

  useEffect(() => {
    menuRef.current?.focus()
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorEl?.contains(e.target)) return
      onClose()
    }
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return
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

  const pick = (opt) => {
    if (isDisabled(opt)) return
    if (opt.role === (current ?? null)) return onClose()
    onPick(opt.role)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      anchorEl?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + dir + CELL_ROLES.length) % CELL_ROLES.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(CELL_ROLES[active])
    } else {
      const role = roleFromKey(e.key)
      if (role !== undefined) {
        e.preventDefault()
        const opt = CELL_ROLES.find((o) => o.role === role)
        if (opt) pick(opt)
      }
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      className="nw-rolemenu essa-dashboard"
      role="menu"
      aria-label={title}
      tabIndex={-1}
      style={{ top: pos.top, left: pos.left }}
      onKeyDown={onKeyDown}>
      <div className="nw-rolemenu__title">{title}</div>
      {CELL_ROLES.map((opt, i) => {
        const selected = opt.role === (current ?? null)
        const disabled = isDisabled(opt)
        return (
          <button
            key={opt.label}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            aria-disabled={disabled}
            className={`nw-rolemenu__item${selected ? ' is-selected' : ''}${i === active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(opt)}>
            <span className="nw-rolemenu__mark">{opt.role ? <Marker role={opt.role} /> : <span className="nw-rolemenu__none">·</span>}</span>
            <span className="nw-rolemenu__text">
              <b>{opt.label}</b>
              <small>{opt.hint}</small>
            </span>
            <kbd>{opt.key}</kbd>
            {selected ? <Check size={14} className="nw-rolemenu__check" aria-hidden /> : null}
          </button>
        )
      })}
      <div className="nw-rolemenu__foot">
        {disabledReason ||
          (current === 'SOURCE'
            ? 'To move the anchor, set another document as Anchor — this one becomes “must match”.'
            : 'Saved as soon as you pick. Shortcuts work on a focused cell too.')}
      </div>
    </div>,
    document.body
  )
}
