import { useMemo, useState } from 'react'

const inferTypeMeta = (type) => {
  const subtype = String(type?.subtype || '')
  const category = String(type?.categoryCode || type?.category || '').toUpperCase()

  if (category === 'NON_PO' || subtype.toLowerCase() === 'non-po') {
    return {
      categoryLabel: type?.category || 'Non-PO',
      poSeries: [],
      contentSignals: 'Resolved by absence of a PO number.'
    }
  }

  if (/material/i.test(subtype)) {
    return {
      categoryLabel: type?.category || 'PO',
      poSeries: ['4201', '4202'],
      contentSignals: 'Resolved from PO number series alone.'
    }
  }

  if (/manpower/i.test(subtype)) {
    return {
      categoryLabel: type?.category || 'PO',
      poSeries: ['4203'],
      contentSignals:
        'Manpower supply, welding/fabrication activity, headcount-based billing, manpower roles, manhour/timesheet language.'
    }
  }

  if (/civil/i.test(subtype)) {
    return {
      categoryLabel: type?.category || 'PO',
      poSeries: ['4203'],
      contentSignals:
        'Construction/civil work progress claim (not manpower timesheets). WBS stages such as Infrastructure, Sport Hall, Shared Block; Contract Value / Retention / Advance Payment Recovery; Work Progress Certificate with Work Package STR/ARS/MEP; Sertifikat Badan Usaha or Izin Usaha Jasa Konstruksi; vendors such as PT Berca Buana Sakti.'
    }
  }

  if (/camp|catering/i.test(subtype)) {
    return {
      categoryLabel: type?.category || 'PO',
      poSeries: ['4203'],
      contentSignals:
        'Catering or camp-service language, meal counts by type, attendance/headcount at camp or site facilities.'
    }
  }

  if (/travel/i.test(subtype)) {
    return {
      categoryLabel: type?.category || 'Non-PO',
      poSeries: [],
      contentSignals: 'Travel / ticket agency language; resolved as Non-PO when no PO number is present.'
    }
  }

  return {
    categoryLabel: type?.category || (category === 'NON_PO' ? 'Non-PO' : 'PO'),
    poSeries: [],
    contentSignals: ''
  }
}

export default function InvoiceCategory({ invoiceTypes = [], activeType, onSelectType }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  const categoryOptions = useMemo(() => {
    const labels = new Set()
    invoiceTypes.forEach((type) => {
      labels.add(inferTypeMeta(type).categoryLabel || type.category || 'Other')
    })
    return Array.from(labels)
  }, [invoiceTypes])

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return invoiceTypes
      .map((type) => {
        const meta = inferTypeMeta(type)
        return {
          id: type.id,
          type,
          categoryLabel: meta.categoryLabel,
          name: type.subtype,
          code: type.code || '—',
          poSeries: meta.poSeries,
          contentSignals: meta.contentSignals,
          documentCount: (type.documents || []).length
        }
      })
      .filter((row) => {
        if (categoryFilter !== 'ALL' && row.categoryLabel !== categoryFilter) return false
        if (!q) return true
        return (
          row.categoryLabel.toLowerCase().includes(q) ||
          row.name.toLowerCase().includes(q) ||
          String(row.code).toLowerCase().includes(q) ||
          row.poSeries.join(' ').toLowerCase().includes(q)
        )
      })
  }, [invoiceTypes, searchTerm, categoryFilter])

  return (
    <div className="ic-screen">
      <div className="ic-screen__body">
        <div className="ic-screen__head">
          <div>
            <h2>Invoice Category</h2>
            <p>
              Reference of invoice categories and how each subtype is detected before page
              classification.
            </p>
          </div>
        </div>

        <div className="ic-toolbar">
          <label className="ic-field">
            <span>Category</span>
            <select
              className="dx-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">All categories</option>
              {categoryOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="ic-field ic-field--grow">
            <span>Search</span>
            <input
              type="text"
              className="dx-input"
              value={searchTerm}
              placeholder="Search by category, type, code, or PO series…"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>

        <div className="ic-table-wrap dx-table-wrap">
          <table className="dx-table ic-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th style={{ width: 110 }}>Category</th>
                <th>Invoice type</th>
                <th style={{ width: 160 }}>Code</th>
                <th style={{ width: 140 }}>PO series</th>
                <th>Detection signals</th>
                <th style={{ width: 90 }}>Documents</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="ic-table__empty">
                    No invoice types match the current filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isSelected = activeType?.id === row.id
                  return (
                    <tr
                      key={row.id}
                      className={isSelected ? 'is-selected' : undefined}
                      onClick={() => onSelectType?.(row.type)}
                      style={{ cursor: onSelectType ? 'pointer' : undefined }}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="ic-scope">{row.categoryLabel}</span>
                      </td>
                      <td>{row.name}</td>
                      <td className="ic-mono">{row.code}</td>
                      <td className="ic-mono">
                        {row.poSeries.length ? row.poSeries.join(', ') : '—'}
                      </td>
                      <td className="text-muted">{row.contentSignals || '—'}</td>
                      <td>{row.documentCount}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
