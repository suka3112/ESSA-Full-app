import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { connect } from 'react-redux'
import { toast } from 'react-toastify'
import { Landmark, Loader2, Lock, Mail, Phone, ShieldAlert, ShieldCheck } from 'lucide-react'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Textarea } from '../ui/Textarea'
import { ADMIN_USER_TYPE, FINANCE_USER_TYPE } from 'constants/userType'
import { DASHBOARD, INVOICE_DETAIL, VENDORS_LIST } from 'constants/url'
import { getEssaVendorDetail, updateEssaVendorControl } from '../../../api/essaVendors'
import '../../../assets/scss/essa/dashboard.scss'

function fmtMoney(amount, currency = 'IDR') {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'IDR',
      currencyDisplay: 'code',
      maximumFractionDigits: 0
    }).format(Number(amount))
  } catch {
    return `${currency || ''} ${Number(amount).toLocaleString('en-US')}`
  }
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`vd-badge vd-badge-${tone}`}>{children}</span>
}

function StatusBadge({ value }) {
  const key = String(value || '').toUpperCase()
  const tone =
    key === 'ACTIVE' || key === 'PAID' || key === 'POSTED' || key === 'OPEN'
      ? key === 'OPEN'
        ? 'info'
        : 'success'
      : key === 'INACTIVE' || key === 'CLOSED'
        ? 'neutral'
        : 'info'
  return <Badge tone={tone}>{value || '—'}</Badge>
}

function KeyValue({ label, children }) {
  return (
    <div>
      <dt className="vd-kv-label">{label}</dt>
      <dd className="vd-kv-value">{children || '—'}</dd>
    </div>
  )
}

function DenseTable({ columns, rows, rowKey, empty, scroll = false }) {
  return (
    <div className={scroll ? 'vd-table-wrap vd-table-scroll' : 'vd-table-wrap'}>
      <table className="vd-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="vd-empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row)} className={index % 2 === 1 ? 'is-zebra' : undefined}>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === 'right' ? 'is-right' : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function VendorDetailView({ userInfo: { userType = 'finance' } }) {
  const { code } = useParams()
  const canControl = userType === ADMIN_USER_TYPE || userType === FINANCE_USER_TYPE

  const [vendorData, setVendorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback((silent) => {
    if (!silent) setLoading(true)
    getEssaVendorDetail(code)
      .then((data) => {
        setVendorData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [code])

  useEffect(() => {
    loadData()
  }, [loadData])

  const applyControl = async () => {
    if (!confirm || !reason.trim()) return
    setSaving(true)
    try {
      await updateEssaVendorControl(code, { [confirm.field]: confirm.next, reason: reason.trim() })
      toast.success('Vendor control updated. The change is recorded in the vendor control history and audit trail.')
      setConfirm(null)
      setReason('')
      loadData(true)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <LeftPageContainer>
        <div className="vd-state">
          <Loader2 size={22} className="vd-spin" />
          <span>Loading vendor…</span>
        </div>
      </LeftPageContainer>
    )
  }

  if (!vendorData?.vendor) {
    return (
      <LeftPageContainer>
        <div className="vd-state">
          <p className="vd-state-title">Vendor not found</p>
          <p>Could not find a vendor snapshot for “{code}”.</p>
          <Link to={`/${userType}${VENDORS_LIST}`} className="vd-back">
            Back to Vendor Master
          </Link>
        </div>
      </LeftPageContainer>
    )
  }

  const v = vendorData.vendor
  const c = vendorData.control
  const purchaseOrders = vendorData.purchaseOrders || []
  const invoices = vendorData.invoices || []

  const confirmTitle =
    confirm?.field === 'negativeFlag'
      ? confirm.next
        ? 'Mark vendor as negative'
        : 'Remove negative flag'
      : confirm?.next
        ? 'Enable EAPA'
        : 'Disable EAPA'

  const confirmMessage =
    confirm?.field === 'negativeFlag' && confirm.next
      ? 'New invoices from this vendor will hard-fail validation (R-GLB-006) and route to AP review. This does not modify SAP master data.'
      : confirm?.field === 'apEnabled' && !confirm.next
        ? 'The vendor will be excluded from AP automation. Existing in-flight invoices are not cancelled.'
        : 'This restores normal AP automation processing for the vendor.'

  const reasonLabel =
    confirm?.next || confirm?.field === 'apEnabled' ? 'Reason (mandatory, audited)' : 'Reason (recommended)'

  return (
    <LeftPageContainer>
      <div className="essa-dashboard vd-page">
        <style>{pageCss}</style>
        <div className="vd-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Vendors', to: `/${userType}${VENDORS_LIST}` },
              { label: v.code }
            ]}
            title={
              <span className="vd-title">
                {v.name}
                <StatusBadge value={v.sapStatus} />
                {c?.negativeFlag && <Badge tone="error">Negative flag</Badge>}
                {c && c.apEnabled === false && <Badge tone="warning">AP disabled</Badge>}
              </span>
            }
            description={`${v.code} · ${v.city || '—'}, ${v.state || '—'}`}
            actions={
              canControl ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={c?.negativeFlag ? 'vd-btn' : 'vd-btn vd-btn-warning'}
                    onClick={() => {
                      setReason('')
                      setConfirm({ field: 'negativeFlag', next: !c?.negativeFlag })
                    }}
                  >
                    <ShieldAlert size={14} /> {c?.negativeFlag ? 'Remove negative flag' : 'Mark negative'}
                  </Button>
                  <Button
                    variant={c?.apEnabled === false ? 'primary' : 'secondary'}
                    size="sm"
                    className="vd-btn"
                    onClick={() => {
                      setReason('')
                      setConfirm({ field: 'apEnabled', next: !(c?.apEnabled ?? true) })
                    }}
                  >
                    <ShieldCheck size={14} /> {c?.apEnabled === false ? 'Enable EAPA' : 'Disable EAPA'}
                  </Button>
                </>
              ) : null
            }
          />

          <div className="vd-top">
            <Card title="Vendor Information" className="vd-span-2">
              <p className="vd-lock">
                <Lock size={12} />
                <span>
                  Read-only. SAP is the vendor master and vendor data is added, changed or removed through the ESSA
                  master-data process. Only the AP control overlay on the right is maintained in this portal.
                </span>
              </p>
              <dl className="vd-kv vd-kv-3">
                <KeyValue label="Legal Name">{v.legalName}</KeyValue>
                <KeyValue label="Vendor Code">{v.code}</KeyValue>
                <KeyValue label="SAP Reference">
                  <span className="vd-mono">{v.sapRef}</span>
                </KeyValue>
                <KeyValue label="Address">
                  {v.address}, {v.city}, {v.state}, {v.country}
                </KeyValue>
                <KeyValue label="Tax Number">
                  <span className="vd-mono">{v.gstin}</span>
                </KeyValue>
                <KeyValue label="AP Contact">
                  <span className="vd-contact">
                    <Mail size={12} /> {v.email}
                  </span>
                  <span className="vd-contact">
                    <Phone size={12} /> {v.phone}
                  </span>
                </KeyValue>
                <KeyValue label="Vendor SAP Sync">{fmtDateTime(v.lastSyncAt)}</KeyValue>
              </dl>

              <div className="vd-payment">
                <p className="vd-payment-title">
                  <Landmark size={13} /> Bank details
                </p>
                <dl className="vd-kv vd-kv-4">
                  <KeyValue label="Bank">{v.bankName}</KeyValue>
                  <KeyValue label="Account Number">
                    <span className="vd-mono">{v.bankAccountMasked}</span>
                  </KeyValue>
                  <KeyValue label="Payment Terms">{v.paymentTerms}</KeyValue>
                  <KeyValue label="Currency">{v.currency}</KeyValue>
                </dl>
                <p className="vd-payment-note">
                  The account number is masked. Payment is always made to the bank account held in the SAP vendor master.
                </p>
              </div>
            </Card>

            <Card title="Portal AP control overlay">
              <dl className="vd-control">
                <KeyValue label="Negative Vendor Flag">
                  {c?.negativeFlag ? <Badge tone="error">Enabled</Badge> : <Badge tone="success">Disabled</Badge>}
                </KeyValue>
                <KeyValue label="AP Automation Enabled">
                  {c?.apEnabled === false ? <Badge tone="warning">No — EAPA disabled</Badge> : <Badge tone="success">Yes</Badge>}
                </KeyValue>
                {c?.reason && <KeyValue label="Reason">{c.reason}</KeyValue>}
                {c?.remarks && <KeyValue label="Remarks">{c.remarks}</KeyValue>}
                <KeyValue label="Last Status Update">{c ? `${c.updatedByName || '—'} · ${fmtDateTime(c.updatedAt)}` : '—'}</KeyValue>
              </dl>
            </Card>
          </div>

          <div className="vd-split">
            <Card title="Purchase orders" pad={false}>
              <DenseTable
                columns={[
                  { key: 'po', header: 'PO', render: (row) => <span className="vd-strong">{row.poNumber}</span> },
                  { key: 'type', header: 'Type', render: (row) => <Badge tone="neutral">{row.poType}</Badge> },
                  { key: 'total', header: 'Value', align: 'right', render: (row) => fmtMoney(row.totalAmount, row.currency) },
                  { key: 'open', header: 'Open', align: 'right', render: (row) => <span className="vd-strong">{fmtMoney(row.openAmount, row.currency)}</span> },
                  { key: 'valid', header: 'Valid To', render: (row) => <span className="vd-small">{fmtDate(row.validTo)}</span> },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> }
                ]}
                rows={purchaseOrders}
                rowKey={(row) => row.poNumber}
                empty="No records"
                scroll
              />
            </Card>

            <Card title="Recent invoices" pad={false}>
              <DenseTable
                columns={[
                  {
                    key: 'no',
                    header: 'Invoice',
                    render: (row) => (
                      <Link to={`/${userType}${INVOICE_DETAIL.replace(':id', encodeURIComponent(row.id))}`} className="vd-link">
                        {row.invoiceNumber}
                      </Link>
                    )
                  },
                  { key: 'date', header: 'Date', render: (row) => <span className="vd-small">{fmtDate(row.invoiceDate)}</span> },
                  { key: 'cat', header: 'Category', render: (row) => <span className="vd-small">{row.categoryName || '—'}</span> },
                  { key: 'amount', header: 'Amount', align: 'right', render: (row) => fmtMoney(row.amount, row.currency) },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge value={row.status} /> }
                ]}
                rows={invoices}
                rowKey={(row) => row.id}
                empty="No records"
                scroll
              />
            </Card>
          </div>
        </div>

        <Dialog
          open={Boolean(confirm)}
          onClose={() => !saving && setConfirm(null)}
          width={520}
          title={confirmTitle}
          footer={
            <>
              <Button variant="ghost" className="vd-dialog-btn" onClick={() => setConfirm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant={confirm?.next && confirm?.field === 'negativeFlag' ? 'danger' : 'secondary'}
                className={confirm?.next && confirm?.field === 'negativeFlag' ? 'vd-dialog-btn' : 'vd-dialog-btn vd-btn-warning'}
                disabled={saving || !reason.trim()}
                onClick={applyControl}
              >
                {saving ? 'Applying…' : 'Apply control change'}
              </Button>
            </>
          }
        >
          <div className="vd-confirm">
            <p>{confirmMessage}</p>
            <label className="vd-reason">
              <span>
                {reasonLabel} <span className="vd-req">*</span>
              </span>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason (recorded in the audit trail)" />
            </label>
          </div>
        </Dialog>
      </div>
    </LeftPageContainer>
  )
}

const pageCss = `
.vd-page .vd-stack{display:flex;flex-direction:column;gap:16px;}
.vd-page .vd-title{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;}
.vd-page .vd-top,.vd-page .vd-split{display:grid;gap:16px;}
.vd-page .vd-split>.card{min-width:0;max-width:100%;}
@media (min-width:1024px){
  .vd-page .vd-top{grid-template-columns:minmax(0,2fr) minmax(280px,1fr);}
  .vd-page .vd-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}
}
.vd-page .vd-btn.dx-btn{height:28px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;gap:6px;}
.vd-page .vd-btn.dx-btn-secondary{background:#fff;border:1px solid #2C9842;color:#247a35;}
.vd-page .vd-btn.dx-btn-secondary:hover{background:#eef8f0;filter:none;box-shadow:none;}
.vd-page .vd-btn-warning.dx-btn{background:#fff;border:1px solid #d97706;color:#b45309;}
.vd-page .vd-btn-warning.dx-btn:hover{background:#fef5e7;filter:none;box-shadow:none;}
.vd-page .vd-lock{display:flex;align-items:flex-start;gap:6px;margin:0 0 12px;border:1px solid #e5e7eb;border-radius:6px;background:#f6f8f7;padding:6px 10px;font-size:10px;line-height:14px;color:#4b5563;}
.vd-page .vd-lock svg{margin-top:2px;flex-shrink:0;color:#9ca3af;}
.vd-page .vd-kv{display:grid;gap:12px 16px;margin:0;}
.vd-page .vd-kv-3{grid-template-columns:1fr 1fr;}
.vd-page .vd-kv-4{grid-template-columns:1fr 1fr;}
@media (min-width:768px){
  .vd-page .vd-kv-3{grid-template-columns:repeat(3,minmax(0,1fr));}
  .vd-page .vd-kv-4{grid-template-columns:repeat(4,minmax(0,1fr));}
}
.vd-page .vd-kv-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#374151;}
.vd-page .vd-kv-value{margin:2px 0 0;font-size:14px;color:#1f2937;}
.vd-page .vd-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;}
.vd-page .vd-contact{display:flex;align-items:center;gap:6px;font-size:14px;}
.vd-page .vd-contact + .vd-contact{margin-top:2px;}
.vd-page .vd-contact svg{color:#2C9842;flex-shrink:0;}
.vd-page .vd-payment{margin-top:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f6f8f7;padding:12px;}
.vd-page .vd-payment-title{display:flex;align-items:center;gap:6px;margin:0 0 10px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#374151;}
.vd-page .vd-payment-title svg{color:#2C9842;}
.vd-page .vd-payment-note{margin:8px 0 0;font-size:10px;color:#9ca3af;}
.vd-page .vd-control{display:flex;flex-direction:column;gap:12px;margin:0;}
.vd-badge{display:inline-flex;align-items:center;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:14px;white-space:nowrap;}
.vd-badge-neutral{background:#eef0f2;color:#374151;}
.vd-badge-success{background:#e6f5ea;color:#2d9a47;}
.vd-badge-warning{background:#fef5e7;color:#b45309;}
.vd-badge-error{background:#fdecec;color:#b91c1c;}
.vd-badge-info{background:#e5f2f9;color:#0075a9;}
.vd-page .vd-table-wrap{overflow-x:auto;max-width:100%;}
.vd-page .vd-table-scroll{overflow:auto;max-height:320px;}
.vd-page .vd-table{width:100%;min-width:520px;border-collapse:collapse;text-align:left;font-size:14px;color:#1f2937;}
.vd-page .vd-table thead th{background:#2C9842;color:#fff;font-size:14px;font-weight:700;letter-spacing:0;text-transform:none;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.vd-page .vd-table-scroll thead th{position:sticky;top:0;z-index:1;}
.vd-page .vd-table thead th.is-right,.vd-page .vd-table tbody td.is-right{text-align:right;}
.vd-page .vd-table tbody td{padding:6px 12px;border-bottom:1px solid #eef0f2;vertical-align:middle;background:#fff;}
.vd-page .vd-table tbody tr.is-zebra td{background:#f6f8f7;}
.vd-page .vd-table tbody tr:last-child td{border-bottom:none;}
.vd-page .vd-empty{padding:28px 12px;text-align:center;color:#6b7280;font-size:12px;}
.vd-page .vd-strong{font-weight:500;}
.vd-page .vd-small{font-size:12px;}
.vd-page .vd-link{font-weight:500;color:#247a35;text-decoration:none;}
.vd-page .vd-link:hover{text-decoration:underline;}
.vd-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:240px;color:#6b7280;text-align:center;}
.vd-state-title{margin:0;font-size:16px;font-weight:600;color:#1f2937;}
.vd-state p{margin:0;font-size:13px;}
.vd-back{color:#247a35;font-size:13px;font-weight:500;}
.vd-spin{color:#2C9842;animation:vd-spin 1s linear infinite;}
@keyframes vd-spin{to{transform:rotate(360deg);}}
.vd-confirm{display:flex;flex-direction:column;gap:12px;font-size:14px;color:#374151;}
.vd-confirm p{margin:0;}
.vd-reason{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#1f2937;}
.vd-req{color:#b91c1c;}
.vd-reason textarea,.essa-dialog-root .vd-reason textarea{width:100%;border-radius:6px;border:1px solid #e5e7eb;padding:8px 10px;font-size:14px;font-weight:400;color:#1f2937;}
.vd-reason textarea:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.essa-dialog-root .vd-dialog-btn.dx-btn{height:36px;padding:0 14px;border-radius:6px;font-size:14px;font-weight:500;}
.essa-dialog-root .vd-dialog-btn.dx-btn-ghost{border-color:transparent;background:transparent;color:#374151;}
.essa-dialog-root .vd-btn-warning.dx-btn{background:#fff;border:1px solid #d97706;color:#b45309;}
`

const mapStateToProps = (state) => ({
  userInfo: state.userInfo || {}
})

export default connect(mapStateToProps)(VendorDetailView)
