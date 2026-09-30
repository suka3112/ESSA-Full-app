import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { connect } from 'react-redux'
import {
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  Landmark,
  Lock,
  Mail,
  Phone
} from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { getEssaVendorDetail } from '../../../api/essaVendors'
import '../../../assets/scss/essa/dashboard.scss'

const BRAND = 'var(--brand-primary-color, #2C9842)'

function fmtMoney(amount, currency = 'AED') {
  if (amount == null) return '—'
  const num = Number(amount)
  if (isNaN(num)) return '—'
  const curr = currency || 'AED'
  if (curr === 'USD') {
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${curr} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return String(iso)
  }
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return String(iso)
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return String(iso)
  }
}

function KeyValue({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <dt style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontSize: 13, color: '#1F2937', fontWeight: 500 }}>
        {children || '—'}
      </dd>
    </div>
  )
}

function VendorDetailView({ userInfo: { userType = 'finance' } }) {
  const { code } = useParams()
  const navigate = useNavigate()

  const [vendorData, setVendorData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    getEssaVendorDetail(code)
      .then((d) => {
        setVendorData(d)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [code])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div style={{ background: '#F8FAF9', padding: '60px 20px', textAlign: 'center', width: '100%', boxSizing: 'border-box', flex: 1 }}>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          Loading vendor details from database…
        </p>
      </div>
    )
  }

  if (!vendorData || !vendorData.vendor) {
    return (
      <div style={{ background: '#F8FAF9', padding: '40px 20px', textAlign: 'center', width: '100%', boxSizing: 'border-box', flex: 1 }}>
        <h3 style={{ color: '#1F2937' }}>Vendor not found</h3>
        <p style={{ color: '#6B7280', fontSize: 13 }}>
          Could not find vendor snapshot for code "{code}" in the database.
        </p>
        <Button
          variant="ghost"
          onClick={() => navigate(`/${userType}/vendors`)}
          style={{ marginTop: 12 }}
        >
          <ArrowLeft size={14} /> Back to Vendor Master
        </Button>
      </div>
    )
  }

  const { vendor: v, purchaseOrders = [], invoices = [] } = vendorData

  return (
    <div style={{ background: '#F8FAF9', padding: '14px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="dx-page dx-stack" style={{ gap: 14, width: '100%' }}>
        {/* Top Page Header */}
        <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}` },
              { label: 'Vendors', to: `/${userType}/vendors` },
              { label: v.code }
            ]}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{v.name}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: '#E6F5EA',
                    color: '#2D9A47',
                    border: '1px solid #B5E3C4'
                  }}
                >
                  {v.sapStatus}
                </span>
              </div>
            }
            description={`${v.code} · ${v.city}, ${v.state || v.country}`}
          />

          {/* First Part: Vendor Information Card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
            <Card
              title="Vendor Information"
              style={{
                boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.08)',
                border: '1px solid #E5E7EB'
              }}
            >
              {/* Read-only callout banner with subtle tint & shade */}
              <p
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: '1px solid #E5E7EB',
                  background: '#F6F8F7',
                  fontSize: 11,
                  color: '#4B5563',
                  marginBottom: 16,
                  lineHeight: 1.5,
                  boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.02)'
                }}
              >
                <Lock size={13} style={{ marginTop: 2, flexShrink: 0, color: '#6B7280' }} />
                <span>
                  <strong>Read-only SAP snapshot.</strong> Master vendor records are synchronized and maintained directly from SAP ERP.
                </span>
              </p>

              {/* Core Vendor Attributes */}
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px 24px',
                  margin: 0
                }}
              >
                <KeyValue label="Legal Name">{v.legalName}</KeyValue>
                <KeyValue label="Vendor Code">
                  <span style={{ fontWeight: 700, color: BRAND }}>{v.code}</span>
                </KeyValue>
                <KeyValue label="SAP Reference">
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>{v.sapRef}</span>
                </KeyValue>
                <KeyValue label="Address">
                  {v.address}, {v.city}, {v.state}, {v.country}
                </KeyValue>
                <KeyValue label="Tax Number">
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#374151' }}>{v.gstin}</span>
                </KeyValue>
                <KeyValue label="AP Contact">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Mail size={12} style={{ color: BRAND }} /> {v.email}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <Phone size={12} style={{ color: BRAND }} /> {v.phone}
                    </span>
                  </div>
                </KeyValue>
                <KeyValue label="Vendor SAP Sync">
                  {fmtDateTime(v.lastSyncAt)}
                </KeyValue>
              </dl>

              {/* Nested Payment details box with authentic ESSA- shade & inset */}
              <div
                style={{
                  marginTop: 18,
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: '#F6F8F7',
                  padding: '14px 18px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                }}
              >
                <p
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#374151',
                    margin: '0 0 12px'
                  }}
                >
                  <Landmark size={13} style={{ color: BRAND }} /> Payment details
                </p>
                <dl
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px 20px',
                    margin: 0
                  }}
                >
                  <KeyValue label="Bank">{v.bankName}</KeyValue>
                  <KeyValue label="Account Number">
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                      {v.bankAccountMasked}
                    </span>
                  </KeyValue>
                  <KeyValue label="Payment Terms">{v.paymentTerms}</KeyValue>
                  <KeyValue label="Currency">{v.currency}</KeyValue>
                </dl>
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 11, color: '#6B7280' }}>
                  The account number is masked. Payment is always made to the bank account held in the SAP vendor master.
                </p>
              </div>
            </Card>
          </div>

          {/* Second Part: Purchase Orders & Recent Invoices with deliberate separation gap */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16, marginTop: 6 }}>
            {/* Purchase Orders */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
                    <FileSpreadsheet size={15} style={{ color: BRAND }} /> Purchase orders
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
                    {purchaseOrders.length} records
                  </span>
                </div>
              }
              pad={false}
              style={{
                gridColumn: 'span 6',
                boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.08)',
                border: '1px solid #E5E7EB'
              }}
            >
              <div className="dx-table-wrap-scroll" style={{ maxHeight: 300, overflowY: 'auto', position: 'relative' }}>
                <table className="dx-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: BRAND, borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>PO</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Type</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Total</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Open</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Valid To</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
                          No purchase orders on file for this vendor.
                        </td>
                      </tr>
                    ) : (
                      purchaseOrders.map((po) => (
                        <tr key={po.poNumber} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{po.poNumber}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontWeight: 600,
                                background: '#F3F4F6',
                                color: '#4B5563',
                                border: '1px solid #E5E7EB',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {po.poType}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                            {fmtMoney(po.totalAmount, po.currency)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: po.openAmount > 0 ? '#16A34A' : undefined }}>
                            {fmtMoney(po.openAmount, po.currency)}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#4B5563' }}>{fmtDate(po.validTo)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontWeight: 600,
                                background: String(po.status).toLowerCase() === 'open' ? '#E5F2F9' : '#E6F5EA',
                                color: String(po.status).toLowerCase() === 'open' ? '#0075A9' : '#2D9A47',
                                border: `1px solid ${String(po.status).toLowerCase() === 'open' ? '#9FD3E9' : '#B5E3C4'}`
                              }}
                            >
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent Invoices */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
                    <FileText size={15} style={{ color: BRAND }} /> Recent invoices
                  </span>
                  <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
                    {invoices.length} recent invoices
                  </span>
                </div>
              }
              pad={false}
              style={{
                gridColumn: 'span 6',
                boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.08), 0 1px 2px -1px rgba(16, 24, 40, 0.08)',
                border: '1px solid #E5E7EB'
              }}
            >
              <div className="dx-table-wrap-scroll" style={{ maxHeight: 300, overflowY: 'auto', position: 'relative' }}>
                <table className="dx-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                    <tr style={{ background: BRAND, borderBottom: '1px solid #E5E7EB' }}>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>Invoice</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>Category</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                      <th style={{ position: 'sticky', top: 0, zIndex: 5, background: BRAND, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
                          No invoices on file for this vendor.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <Link
                              to={`/${userType}/invoice-processing/invoices/${encodeURIComponent(inv.id)}`}
                              style={{ fontWeight: 600, color: BRAND, textDecoration: 'none', fontSize: 12 }}
                              title={`Open invoice ${inv.invoiceNumber}`}
                            >
                              {inv.invoiceNumber}
                            </Link>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#4B5563' }}>{fmtDate(inv.invoiceDate)}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#4B5563' }}>
                            {inv.categoryName || '—'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                            {fmtMoney(inv.amount, inv.currency)}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontWeight: 600,
                                background: inv.status === 'Paid' ? '#E6F5EA' : '#E5F2F9',
                                color: inv.status === 'Paid' ? '#2D9A47' : '#0075A9',
                                border: `1px solid ${inv.status === 'Paid' ? '#B5E3C4' : '#9FD3E9'}`
                              }}
                            >
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

export default connect(mapStateToProps)(VendorDetailView)
