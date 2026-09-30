import clsx from 'clsx'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { PageHeader } from '../PageShell'
import { SLA_MANAGEMENT } from 'constants/url'
import { adminCrumbs, slaTo, SlaSectionNav, SLA_SECTIONS } from '../lib/sla'
import '../../../assets/scss/essa/dashboard.scss'

export default function SlaLayout({
  active,
  title,
  description,
  actions,
  breadcrumb,
  showSectionNav = true,
  className,
  children
}) {
  const section = SLA_SECTIONS.find((s) => s.key === active)
  const crumbs =
    breadcrumb ||
    adminCrumbs(
      section && section.key !== 'policies'
        ? { label: 'SLA Management', to: slaTo(SLA_MANAGEMENT) }
        : { label: 'SLA Management' },
      ...(section && section.key !== 'policies' ? [{ label: section.label }] : [])
    )

  return (
    <LeftPageContainer>
      <div className={clsx('essa-dashboard email-templates-page sla-management-page', className)}>
        <div className="dx-page" style={{ paddingTop: 0 }}>
          <PageHeader title={title} description={description} actions={actions} breadcrumb={crumbs} />
          {showSectionNav ? <SlaSectionNav active={active} /> : null}
          {children}
        </div>
      </div>
    </LeftPageContainer>
  )
}
