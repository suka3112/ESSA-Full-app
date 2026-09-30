import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react'

import { cn } from '../lib/cn'
import { Input } from './Input'

/** Filter label stacked above a control — SLA Management type: 12px / 500. */
export function FilterField({ label, children, className, labelClassName }) {
  return (
    <span className={cn('flex flex-col gap-0.5', className)}>
      <span
        className={cn(
          'text-xs font-medium text-ink-muted',
          labelClassName
        )}
      >
        {label}
      </span>
      {children}
    </span>
  )
}

/** Search input with a leading magnifying-glass icon. Extra props go to the input. */
export function FilterSearch({ className, ...props }) {
  return (
    <span className="relative block max-w-full">
      <Search
        size={13}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
      />
      <Input className={cn('dx-filter-search-input h-9 !pl-8 pr-2.5', className)} {...props} />
    </span>
  )
}

/** Horizontal filter row. Pass page-specific spacing/border classes via `className`. */
export function FilterBar({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-wrap items-end gap-x-2.5 gap-y-1 px-3 py-1.5', className)} {...props}>
      {children}
    </div>
  )
}

/** Invoice / vendor table pager (numbered pages + optional page-size). */
function visiblePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set([1, total, current, current - 1, current + 1])
  if (current <= 3) [2, 3, 4].forEach((n) => set.add(n))
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((n) => set.add(n))
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push(`e-${nums[i]}`)
    out.push(nums[i])
  }
  return out
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  onPageSize,
  noun = 'entries',
  pageSizes = [10, 25, 50, 100]
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = visiblePages(page, totalPages)

  return (
    <div className="dx-invoices-pagination">
      <span className="dx-invoices-pagination-label">
        Showing {from} to {to} of {total} {noun}
      </span>
      <div className="dx-invoices-pagination-controls">
        {onPageSize ? (
          <label className="dx-invoices-pagination-size">
            Rows per page
            <select
              className="dx-select"
              value={pageSize}
              onChange={(e) => onPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className="dx-invoices-page-btn"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="dx-invoices-page-btn" style={{ border: 'none', minWidth: 16, cursor: 'default' }}>
              …
            </span>
          ) : (
            <button
              type="button"
              key={p}
              className={`dx-invoices-page-btn${p === page ? ' is-active' : ''}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          className="dx-invoices-page-btn"
          disabled={page >= totalPages}
          aria-label="Next page"
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

/** Green-header sortable column — used by Invoice, Vendor, and Email Template tables. */
export function SortTh({ col, sortKey, onSort, children, className, style }) {
  return (
    <th className={className} style={style}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 bg-transparent p-0 font-inherit text-inherit"
        style={{
          color: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 700,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          fontSize: '10px'
        }}
      >
        {children}
        <ChevronsUpDown size={12} className={sortKey === col ? 'opacity-100' : 'opacity-70'} />
      </button>
    </th>
  )
}

/** Scrollable workbench table. Compact badge/cell styles live on `dx-workbench-table`. */
export function WorkbenchTable({ className, children, ...props }) {
  return (
    <div className={cn('dx-table-wrap dx-table-wrap-scroll dx-invoices-table-wrap', className)}>
      <table className="dx-table dx-invoices-table dx-workbench-table" {...props}>
        {children}
      </table>
    </div>
  )
}

/** Shared list-page card: tabs, filters, pagination, table. */
export function ListWorkbench({ children, className }) {
  return (
    <section className={cn('dx-card dx-invoices-card', className)}>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}
