import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { OCR_LINE_ITEM_COLUMNS } from 'api/apInvoiceOcr'
import { Input } from '../ui/Input'
import { extractCellPlaceholder, formatExtractLineCell } from './extractValidateSections'

const FALLBACK_TIMESHEET_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'username', label: 'Username' },
  { key: 'regularManhour', label: 'Regular Manhour', align: 'end' },
  { key: 'overtimeManhour', label: 'Overtime Manhour', align: 'end' },
  { key: 'role', label: 'Role' },
  { key: 'manpowerName', label: 'Manpower Name' }
]

export function hydrateTimesheetRow(sheet, entry) {
  return {
    date: entry?.date ?? null,
    username: entry?.username ?? sheet?.username ?? null,
    regularManhour: entry?.regularManhour ?? null,
    overtimeManhour: entry?.overtimeManhour ?? null,
    role: entry?.role ?? sheet?.role ?? null,
    manpowerName: entry?.manpowerName ?? sheet?.manpowerName ?? null
  }
}

export function TimesheetManpowerPanels({
  sheets = [],
  currency = 'IDR',
  defaultExpandedIndex = 0,
  editing = false,
  draftSheets = null,
  onDraftCellChange
}) {
  const [expanded, setExpanded] = useState(() => {
    const initialSheets = Array.isArray(sheets) ? sheets : []
    if (!initialSheets.length) return new Set()
    const idx = Math.min(Math.max(defaultExpandedIndex, 0), initialSheets.length - 1)
    return new Set([idx])
  })

  const columns =
    OCR_LINE_ITEM_COLUMNS?.timesheet_display ||
    OCR_LINE_ITEM_COLUMNS?.timesheet ||
    FALLBACK_TIMESHEET_COLUMNS

  const toggle = (index) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const safeSheets = Array.isArray(editing && draftSheets ? draftSheets : sheets) ? (editing && draftSheets ? draftSheets : sheets) : []
  if (!safeSheets.length || !columns.length) return null

  return (
    <div className="dx-timesheet-sheets">
      {safeSheets.map((sheet, sheetIndex) => {
        const isOpen = editing || expanded.has(sheetIndex)
        const entries = Array.isArray(sheet?.entries) ? sheet.entries : []
        const entryCount = entries.length

        return (
          <div
            key={sheetIndex}
            className={`dx-timesheet-sheet${isOpen ? ' dx-timesheet-sheet--open' : ''}`}
          >
            <button
              type="button"
              className="dx-timesheet-sheet-toggle"
              onClick={() => toggle(sheetIndex)}
              aria-expanded={isOpen}
            >
              <span className="dx-timesheet-sheet-chevron" aria-hidden>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
              <span className="dx-timesheet-sheet-name">
                {sheet.manpowerName || `Manpower ${sheetIndex + 1}`}
              </span>
              {sheet.role && <span className="dx-timesheet-sheet-role">{sheet.role}</span>}
              {sheet.username && (
                <span className="dx-timesheet-sheet-id">{sheet.username}</span>
              )}
              <span className="dx-timesheet-sheet-totals">
                {entryCount} day{entryCount !== 1 ? 's' : ''}
              </span>
            </button>

            {isOpen && entryCount > 0 && (
              <div className="essa-ocr-section-table dx-timesheet-sheet-body">
                <table className="dx-extract-lines-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {columns.map((col) => (
                        <th key={col.key} className={col.align === 'end' ? 'text-end' : undefined}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      const row = hydrateTimesheetRow(sheet, entry)
                      return (
                        <tr key={idx}>
                          <td className="dx-line-no">{idx + 1}</td>
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              className={
                                col.align === 'end'
                                  ? 'text-end dx-line-num'
                                  : col.key === 'manpowerName'
                                    ? 'dx-line-desc'
                                    : undefined
                              }
                            >
                              {editing ? (
                                <Input
                                  className="dx-extract-cell-input"
                                  value={row[col.key] ?? ''}
                                  placeholder={extractCellPlaceholder(col.label)}
                                  onChange={(e) =>
                                    onDraftCellChange?.(sheetIndex, idx, col.key, e.target.value)
                                  }
                                />
                              ) : (
                                formatExtractLineCell(col, row, currency)
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
