import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AlertOctagon, ArrowUpRight, GitBranch } from 'lucide-react'
import { connect } from 'react-redux'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { getPOInvoiceDetails } from 'api/POBased'
import { getPODropdown, getPOList } from 'api/PurchaseOrder'
import { fmtMoney, getEssaPOMatch } from 'api/essaDashboard'
import { INVOICE_DETAIL } from 'constants/url'
import { VENDOR_USER_TYPE } from 'constants/userType'
import { usePoBasedInvoices } from 'hooks/usePoBasedInvoices'
import { getEntityId, getVendorId } from 'services/utilities'
import {
  buildMatchFromPoInvoiceDetails,
  invoiceMatchesPo,
  mergePoOptions,
  normalizePoListItem,
  parsePoInvoiceRawId
} from '../lib/poMatching'
import '../../../assets/scss/essa/dashboard.scss'

async function fetchPurchaseOrders(userType) {
  const entityId = getEntityId()
  if (!entityId) return []

  try {
    if (userType === VENDOR_USER_TYPE) {
      const res = await getPODropdown({
        entity_id: entityId,
        vendor_id: getVendorId()
      })
      return (res?.data?.data || []).map(normalizePoListItem).filter((p) => p.po_number)
    }

    const res = await getPOList({
      entity_id: entityId,
      page: 1,
      limit: 1000
    })
    return (res?.data?.data?.results || []).map(normalizePoListItem).filter((p) => p.po_number)
  } catch {
    return []
  }
}

function EssaPOMatching({ userInfo: { userType } }) {
  const [searchParams] = useSearchParams()
  const { data: poInvoices = [], isLoading: invoicesLoading } = usePoBasedInvoices()
  const [pos, setPos] = useState([])
  const [posLoading, setPosLoading] = useState(true)
  const [po, setPo] = useState(searchParams.get('po') || '')
  const [invId, setInv] = useState(searchParams.get('invoice') || '')
  const [match, setMatch] = useState(null)
  const [matchLoading, setMatchLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPosLoading(true)

    fetchPurchaseOrders(userType)
      .then((apiPos) => {
        if (!cancelled) setPos(mergePoOptions(apiPos, poInvoices))
      })
      .finally(() => {
        if (!cancelled) setPosLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userType, poInvoices])

  const filteredInvoices = useMemo(
    () => poInvoices.filter((i) => invoiceMatchesPo(i, po)),
    [poInvoices, po]
  )

  useEffect(() => {
    if (!po) return
    if (invId && !filteredInvoices.some((i) => String(i.id) === String(invId))) {
      setInv('')
    }
  }, [po, invId, filteredInvoices])

  useEffect(() => {
    if (!po || !invId) {
      setMatch(null)
      return undefined
    }

    let cancelled = false
    setMatchLoading(true)

    const loadMatch = async () => {
      const isPoInvoice =
        String(invId).startsWith('po-') || /^\d+$/.test(String(invId).replace(/^po-/, ''))

      try {
        if (isPoInvoice) {
          const rawId = parsePoInvoiceRawId(invId)
          const res = await getPOInvoiceDetails({ id: rawId })
          const detail = res?.data?.data
          if (cancelled) return

          if (!detail) {
            setMatch({ error: 'Invoice not found.' })
            return
          }

          const built = buildMatchFromPoInvoiceDetails(po, detail)
          if (!built.rows.length) {
            setMatch({ error: `No line items on this invoice reference PO ${po}.` })
          } else {
            setMatch(built)
          }
          return
        }

        const data = await getEssaPOMatch(po, invId)
        if (!cancelled) setMatch(data)
      } catch (err) {
        if (!cancelled) {
          setMatch({ error: err?.message || 'Failed to load match data.' })
        }
      } finally {
        if (!cancelled) setMatchLoading(false)
      }
    }

    loadMatch()
    return () => {
      cancelled = true
    }
  }, [po, invId])

  const detailPath = (id) => `/${userType}${INVOICE_DETAIL.replace(':id', id)}`
  const selectsLoading = posLoading || invoicesLoading

  return (
    <LeftPageContainer>
      <div className="essa-dashboard">
        <div className="dx-page">
          <div className="dx-card" style={{ marginBottom: 16 }}>
            <div
              className="dx-card-body"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
            >
              <div>
                <label className="dx-label" htmlFor="po-match-po">
                  Purchase Order
                </label>
                <select
                  id="po-match-po"
                  className={`dx-select${!po ? ' dx-select--placeholder' : ''}`}
                  value={po}
                  disabled={selectsLoading}
                  onChange={(e) => setPo(e.target.value)}
                >
                  {selectsLoading ? (
                    <option value="">Loading purchase orders…</option>
                  ) : (
                    <option value="" disabled hidden>
                      {pos.length
                        ? `Select a purchase order (${pos.length} available)`
                        : 'No purchase orders available'}
                    </option>
                  )}
                  {pos.map((p) => (
                    <option key={p.po_number} value={p.po_number}>
                      {p.po_number}
                      {p.vendor_name ? ` · ${p.vendor_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="dx-label" htmlFor="po-match-invoice">
                  Invoice
                </label>
                <select
                  id="po-match-invoice"
                  className={`dx-select${!invId ? ' dx-select--placeholder' : ''}`}
                  value={invId}
                  disabled={selectsLoading || !po}
                  onChange={(e) => setInv(e.target.value)}
                >
                  {selectsLoading ? (
                    <option value="">Loading invoices…</option>
                  ) : !po ? (
                    <option value="" disabled hidden>
                      Select a purchase order first
                    </option>
                  ) : filteredInvoices.length === 0 ? (
                    <option value="">No invoices linked to this PO</option>
                  ) : (
                    <option value="" disabled hidden>
                      {`Select an invoice (${filteredInvoices.length} available)`}
                    </option>
                  )}
                  {filteredInvoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.invoice_no || i.id} · {fmtMoney(i.total_amount, i.currency)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!match && !matchLoading && (
            <div className="dx-empty-state">
              <GitBranch size={32} />
              <h3>Select a purchase order and invoice</h3>
              <p>
                Choose a PO and invoice above to compare line items, quantities, and amounts. Mismatches
                will be highlighted in the match table.
              </p>
            </div>
          )}

          {matchLoading && (
            <div className="dx-card" style={{ padding: 14, color: 'var(--dx-text-soft)' }}>
              Loading match data…
            </div>
          )}

          {match?.error && (
            <div className="dx-card" style={{ padding: 14, color: 'var(--dx-error-700)' }}>
              <AlertOctagon
                size={16}
                style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }}
              />
              {match.error}
            </div>
          )}

          {match?.rows && (
            <div className="dx-card">
              <div className="dx-card-head">
                <GitBranch size={18} className="text-primary" />
                <h2 className="dx-card-title">3-Way Match · PO {match.po.po_number}</h2>
                <Link
                  to={detailPath(match.invoice.id)}
                  className="dx-btn dx-btn-ghost dx-btn-sm"
                  style={{ marginLeft: 'auto' }}
                >
                  Open invoice <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="dx-table-wrap">
                <table className="dx-table dx-table-compact">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Line</th>
                      <th rowSpan={2}>Description</th>
                      <th rowSpan={2}>Unit</th>
                      <th
                        colSpan={3}
                        style={{
                          borderRight: '1px solid var(--dx-border-soft)',
                          textAlign: 'center'
                        }}
                      >
                        PO
                      </th>
                      <th
                        colSpan={3}
                        style={{
                          borderRight: '1px solid var(--dx-border-soft)',
                          textAlign: 'center'
                        }}
                      >
                        Invoice
                      </th>
                      <th rowSpan={2}>GR / SES</th>
                      <th rowSpan={2}>Flags</th>
                    </tr>
                    <tr>
                      <th>Qty</th>
                      <th>Consumed</th>
                      <th>Rate</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.rows.map((r, i) => (
                      <tr key={i} style={{ cursor: 'default' }}>
                        <td className="fw-600">{r.line_no}</td>
                        <td>{r.description}</td>
                        <td>{r.unit}</td>
                        <td className="text-end">{r.po?.qty ?? '—'}</td>
                        <td className="text-end">{r.po?.consumed ?? '—'}</td>
                        <td className="text-end">{r.po ? fmtMoney(r.po.rate, '') : '—'}</td>
                        <td className={`text-end ${matchCellClass(r, 'qtyOk')}`}>
                          {r.invoice?.qty ?? '—'}
                        </td>
                        <td className={`text-end ${matchCellClass(r, 'rateOk')}`}>
                          {r.invoice ? fmtMoney(r.invoice.rate, '') : '—'}
                        </td>
                        <td className="text-end">
                          {r.invoice ? fmtMoney(r.invoice.total, '') : '—'}
                        </td>
                        <td className={`text-end ${matchCellClass(r, 'sesOk')}`}>
                          {r.ses?.qty ?? '—'}
                        </td>
                        <td>
                          {r.flags.extra && <span className="dx-badge warn">extra</span>}
                          {r.flags.rateOk === false && <span className="dx-badge fail">rate</span>}
                          {r.flags.qtyOk === false && (
                            <span className="dx-badge fail" style={{ marginLeft: 4 }}>
                              qty
                            </span>
                          )}
                          {r.flags.sesOk === false && (
                            <span className="dx-badge fail" style={{ marginLeft: 4 }}>
                              ses
                            </span>
                          )}
                          {r.flags.rateOk === true &&
                            r.flags.qtyOk === true &&
                            r.flags.sesOk !== false && <span className="dx-badge pass">match</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </LeftPageContainer>
  )
}

function matchCellClass(r, key) {
  const v = r.flags[key]
  if (v === true) return 'dx-match-cell ok'
  if (v === false) return 'dx-match-cell bad'
  return ''
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(EssaPOMatching)
