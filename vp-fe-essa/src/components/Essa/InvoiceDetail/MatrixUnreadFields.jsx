import { useState } from 'react'
import { ChevronDown, ChevronRight, FileWarning } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Tabs } from '../ui/Tabs'

const REQUIREMENT_LABEL = {
  MANDATORY: 'Mandatory',
  OPTIONAL: 'Optional',
  CONDITIONAL: 'Conditional',
  UNRESOLVED: 'Unresolved'
}

const REQUIREMENT_TONE = {
  MANDATORY: 'fail',
  OPTIONAL: 'neutral',
  CONDITIONAL: 'neutral',
  UNRESOLVED: 'neutral'
}

function reasonText(reason) {
  if (reason === 'DOCUMENT_TYPE_UNMAPPED') {
    return 'This document type is not a bundle document in the matrix, so its data points were not read.'
  }
  if (reason === 'NO_DOCUMENT_CLASSIFIED') {
    return 'No document type was identified in the PDF.'
  }
  return 'The matrix marks this value on the document, and extraction did not return it.'
}

function groupUnreadItems(items) {
  const groups = []
  const indexByName = new Map()
  if (!Array.isArray(items)) return groups
  for (const item of items) {
    const name = item.documentName || item.recognizedType || 'Document'
    if (!indexByName.has(name)) {
      indexByName.set(name, groups.length)
      groups.push({ name, items: [] })
    }
    groups[indexByName.get(name)].items.push(item)
  }
  return groups
}

function UnreadItemList({ items }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item) => (
        <li
          key={`${item.documentCode || item.recognizedType || ''}-${item.dataPointCode || item.reason}-${item.matrixRef || ''}`}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: '1px solid var(--dx-border, #e6e8ec)'
          }}
        >
          <div>
            <div>
              {item.dataPointName || 'Document type'}
              {item.matrixRef ? ` (${item.matrixRef})` : ''}
            </div>
            <div style={{ color: 'var(--dx-text-muted, #667085)', fontSize: 13 }}>
              {reasonText(item.reason)}
            </div>
          </div>
          <Badge tone={REQUIREMENT_TONE[item.requirement] || 'neutral'} dot={false}>
            {REQUIREMENT_LABEL[item.requirement] || 'Unresolved'}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

export function MatrixUnreadFields({ items }) {
  const groups = groupUnreadItems(items)
  const [activeName, setActiveName] = useState('')
  const [open, setOpen] = useState(true)

  if (groups.length === 0) return null

  const selected = groups.some((group) => group.name === activeName)
    ? activeName
    : groups[0].name
  const activeGroup = groups.find((group) => group.name === selected) || groups[0]

  return (
    <div className="dx-ev-section">
      <button
        type="button"
        className="dx-ev-section-header dx-ev-section-header--toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <FileWarning size={15} className="dx-ev-section-icon" aria-hidden />
        <div className="dx-ev-section-header-text">
          <div className="dx-ev-section-title-row">
            <h4 className="dx-ev-section-title">Values not read</h4>
            <span className="dx-ev-section-badge dx-ev-section-badge--fail">
              {items.length}
            </span>
          </div>
          <p className="dx-ev-section-sub">
            Data points from the uploaded PDF that extraction could not read.
            Unresolved means the matrix has not confirmed mandatory or optional.
          </p>
        </div>
        <span className="dx-ev-section-chevron" aria-hidden>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open ? (
        <>
          {groups.length > 1 ? (
            <Tabs
              className="dx-ev-unread-tabs"
              tabs={groups.map((group) => ({
                value: group.name,
                label: group.name,
                badge: group.items.length
              }))}
              value={selected}
              onChange={setActiveName}
            />
          ) : null}
          <div className="dx-ev-unread-scroll" role="tabpanel">
            <div style={{ padding: '12px 16px' }}>
              {groups.length === 1 ? (
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{activeGroup.name}</div>
              ) : null}
              <UnreadItemList items={activeGroup.items} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
