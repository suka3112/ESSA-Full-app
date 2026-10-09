import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { connect } from 'react-redux'

import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { getEssaExceptionCodes } from 'api/essaDashboard'
import { DASHBOARD } from 'constants/url'
import '../../../assets/scss/essa/dashboard.scss'

function EssaExceptionCodes({ userInfo: { userType = 'admin' } = {} }) {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    let cancelled = false
    getEssaExceptionCodes()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const types = useMemo(() => {
    const seen = []
    rows.forEach((row) => {
      if (row.exceptionType && !seen.includes(row.exceptionType)) seen.push(row.exceptionType)
    })
    return seen
  }, [rows])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (type && row.exceptionType !== type) return false
      if (!needle) return true
      return [row.code, row.name, row.meaning, row.exceptionType, row.documentName]
        .some((value) => String(value || '').toLowerCase().includes(needle))
    })
  }, [rows, search, type])

  return (
    <LeftPageContainer>
      <div className="essa-dashboard ec-page">
        <style>{pageCss}</style>
        <div className="ec-stack">
          <PageHeader
            breadcrumb={[
              { label: 'Home', to: `/${userType}${DASHBOARD}` },
              { label: 'Administration' },
              { label: 'Exception Codes' }
            ]}
            title="Exception Codes"
            description="One code per error type. The same code applies whatever the invoice, category or vendor, and it is what the Exception Workbench shows."
          />

          <Card pad={false}>
            <div className="ec-filters">
              <span className="ec-field">
                <span className="ec-field-label">Search</span>
                <span className="ec-search">
                  <Search size={14} />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Code, name or meaning…"
                    aria-label="Search exception codes"
                  />
                </span>
              </span>
              <span className="ec-field">
                <span className="ec-field-label">Exception Type</span>
                <select
                  className="ec-select"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  aria-label="Exception type filter"
                >
                  <option value="">Any type</option>
                  {types.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </span>
              <span className="ec-count">
                {visible.length} of {rows.length} codes
              </span>
            </div>

            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead>
                  <tr>
                    <th>Exception Code</th>
                    <th>Exception Type</th>
                    <th>Name</th>
                    <th>What It Means</th>
                    <th>Document</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ec-state">
                          <Loader2 size={18} className="ec-spin" />
                          <p>Loading exception codes…</p>
                        </div>
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="ec-state">
                          <p className="ec-state-title">No matching codes</p>
                          <p>{search || type ? 'Nothing matches these filters.' : 'No exception codes are configured.'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visible.map((row, index) => (
                      <tr key={row.code} className={index % 2 === 1 ? 'is-zebra' : undefined}>
                        <td><span className="ec-code">{row.code}</span></td>
                        <td>{row.exceptionType || '—'}</td>
                        <td><span className="ec-name">{row.name || '—'}</span></td>
                        <td><span className="ec-meaning">{row.meaning || '—'}</span></td>
                        <td>{row.documentName || '—'}</td>
                        <td>
                          <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'} dot={false}>
                            {row.status === 'ACTIVE' ? 'Active' : row.status || '—'}
                          </Badge>
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
    </LeftPageContainer>
  )
}

const pageCss = `
.ec-page .ec-stack{display:flex;flex-direction:column;gap:12px;}
.ec-page .ec-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;border-bottom:1px solid #eef0f2;padding:12px;}
.ec-page .ec-field{display:flex;flex-direction:column;gap:2px;}
.ec-page .ec-field-label{font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#4b5563;}
.ec-page .ec-search{position:relative;display:block;width:256px;}
.ec-page .ec-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;z-index:1;}
.ec-page .ec-search .dx-input,.ec-page .ec-select{height:36px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1f2937;}
.ec-page .ec-search .dx-input{width:100%;padding:6px 10px 6px 32px;}
.ec-page .ec-select{min-width:180px;padding:6px 8px;}
.ec-page .ec-search .dx-input:focus,.ec-page .ec-select:focus{border-color:#3aaa55;outline:none;box-shadow:0 0 0 2px #d8f0dd;}
.ec-page .ec-count{margin-left:auto;align-self:center;font-size:12px;color:#4b5563;}
.ec-page .ec-table-wrap{overflow:auto;max-height:68vh;}
.ec-page .ec-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left;font-size:14px;color:#1f2937;}
.ec-page .ec-table thead th{position:sticky;top:0;z-index:2;background:#2C9842;color:#fff;font-size:14px;font-weight:700;padding:8px 12px;white-space:nowrap;border:none;text-align:left;}
.ec-page .ec-table tbody td{padding:8px 12px;border-bottom:1px solid #eef0f2;vertical-align:top;background:#fff;}
.ec-page .ec-table tbody tr.is-zebra td{background:#f6f8f7;}
.ec-page .ec-code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:600;color:#247a35;}
.ec-page .ec-name{font-weight:500;}
.ec-page .ec-meaning{display:block;max-width:28rem;font-size:12px;color:#374151;}
.ec-page .ec-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:40px 16px;text-align:center;color:#6b7280;}
.ec-page .ec-state-title{margin:0;font-size:14px;font-weight:500;color:#374151;}
.ec-page .ec-state p{margin:0;font-size:12px;}
.ec-page .ec-spin{color:#2C9842;animation:ec-spin 1s linear infinite;}
@keyframes ec-spin{to{transform:rotate(360deg);}}
`

const mapStateToProps = (state) => ({
  userInfo: state.user?.userInfo || state.userInfo || {}
})

export default connect(mapStateToProps)(EssaExceptionCodes)
