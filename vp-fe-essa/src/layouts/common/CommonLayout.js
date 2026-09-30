import React, { memo, useMemo } from 'react'
import styles from 'assets/scss/layouts/CommonLayout.module.scss'
import SidebarContainer, {
  getSidebarMenuItems,
  isPathActive
} from 'components/Common/SidebarContainer'
import HeaderSection from 'components/Common/HeaderSection'
import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { parseJSON } from 'services/utilities'
import { useBrand } from 'contexts/BrandContext'
import SVGIcon from 'components/Common/SVGIcon'
import { INVOICE_DASHBOARD, MY_PROFILE, SLA_MANAGEMENT } from 'constants/url'
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'

const SLA_CRUMB_LABELS = {
  reminders: 'Reminder Rules',
  escalations: 'Escalation Rules',
  calendar: 'Business Calendar',
  simulation: 'Simulation / Test',
  monitor: 'SLA Instances / Monitor',
  create: 'Create SLA',
  edit: 'Edit SLA'
}

const formatSegmentLabel = (segment) =>
  decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const getBreadcrumbs = (pathname, userType, menuItems, t) => {
  const prefix = `/${userType}`
  const homeTo = `${prefix}${INVOICE_DASHBOARD}`
  const crumbs = [{ label: t('home'), to: homeTo }]

  if (pathname === homeTo || pathname === `${prefix}/dashboard`) {
    return crumbs
  }

  for (const item of menuItems) {
    if (!item.subItems?.length) continue
    const child = [...item.subItems]
      .filter((sub) => sub.path)
      .sort((a, b) => b.path.length - a.path.length)
      .find((sub) => isPathActive(pathname, `${prefix}${sub.path}`))
    if (child) {
      crumbs.push(
        { label: item.name, to: `${prefix}${item.path}` },
        { label: child.name, to: `${prefix}${child.path}` }
      )
      const childFull = `${prefix}${child.path}`
      if (child.path === SLA_MANAGEMENT && pathname.startsWith(`${childFull}/`)) {
        const rest = pathname.slice(childFull.length).split('/').filter(Boolean)
        if (rest[0] === 'edit' || rest[0] === 'create') {
          return crumbs
        }
        rest.forEach((segment, index) => {
          if (index > 0 && rest[index - 1] === 'edit') return
          const toEnd = segment === 'edit' && rest[index + 1] ? index + 2 : index + 1
          crumbs.push({
            label: SLA_CRUMB_LABELS[segment] || formatSegmentLabel(segment),
            to: `${childFull}/${rest.slice(0, toEnd).join('/')}`
          })
        })
      }
      return crumbs
    }
  }

  const item = [...menuItems]
    .filter((it) => it.path)
    .sort((a, b) => b.path.length - a.path.length)
    .find((it) => isPathActive(pathname, `${prefix}${it.path}`))
  if (item) {
    crumbs.push({ label: item.name, to: `${prefix}${item.path}` })
    return crumbs
  }

  if (isPathActive(pathname, `${prefix}${MY_PROFILE}`)) {
    crumbs.push({ label: t('myProfile'), to: `${prefix}${MY_PROFILE}` })
    return crumbs
  }

  const segments = pathname
    .replace(new RegExp(`^${prefix}/?`), '')
    .split('/')
    .filter(Boolean)
  segments.forEach((segment, index) => {
    crumbs.push({
      label: formatSegmentLabel(segment),
      to: `${prefix}/${segments.slice(0, index + 1).join('/')}`
    })
  })
  return crumbs
}

const CommonLayout = memo(({ children }) => {
  const location = useLocation()
  const exceptDashBoard = location.pathname === '/vendor/dashboard'
  const { t } = useTranslation('sidebar')
  const sidebar = useSelector((state) => state.sidebar)
  const userType = useSelector((state) => state.userInfo?.userType)
  const social = parseJSON(localStorage.getItem('entity_details'))
  const { brandConfig } = useBrand()
  const isAdmin = userType === ADMIN_USER_TYPE
  const isVendor = userType === VENDOR_USER_TYPE
  const menuItems = useMemo(
    () => getSidebarMenuItems({ t, isAdmin, isVendor }),
    [t, isAdmin, isVendor]
  )
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, userType, menuItems, t),
    [location.pathname, userType, menuItems, t]
  )

  return (
    <div className={styles.vendorLayout}>
      <div className="d-flex !max-w-[100vw]">
        <div className={`${styles.overlay} ${sidebar.isOpen ? styles.show : ''}`}></div>
        <div className={`${styles.sideBar} ${sidebar.isOpen ? styles.open : styles.closed}`}>
          <SidebarContainer />
        </div>
        <div className={styles.mainContent}>
          <HeaderSection />
          <div className={styles.pageContent}>
            <nav className={styles.breadcrumbBar} aria-label="Breadcrumb">
              <ol className={`${styles.breadcrumbList} breadcrumb`}>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <li key={`${crumb.to}-${crumb.label}`} className="breadcrumb-item">
                      {index > 0 && <span className="breadcrumb-separator">&gt;</span>}
                      {isLast ? (
                        <span className="breadcrumb-current">{crumb.label}</span>
                      ) : (
                        <Link to={crumb.to} className="breadcrumb-link">
                          {crumb.label}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ol>
            </nav>
            {children}

            {/* {!exceptDashBoard && */}
            {/*
            <div className={styles.footer_container}>
              <div className={styles.footer_left_content}>
                <p>{brandConfig.footer.copyrightText}</p>
              </div>
              <div className={styles.footer_right_content}>
                <p>Version 1.0.1</p> |
                <p
                  onClick={() => window.open(brandConfig.website.main, '_blank')}
                  style={{ cursor: 'pointer' }}>
                  {brandConfig.footer.websiteDisplay}
                </p>
                <div className={styles.vl}></div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <a
                    href={social?.Facebook_Link || brandConfig.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer">
                    <SVGIcon name="fcBook" alt="facebook" size={20} />
                  </a>
                  <a
                    href={social?.Twitter_Link || brandConfig.socialMedia.twitter}
                    target="_blank"
                    rel="noopener noreferrer">
                    <SVGIcon name="twitter" alt="x" size={20} />
                  </a>
                  <a
                    href={social?.LinkedIn_Link || brandConfig.socialMedia.linkedin}
                    target="_blank"
                    rel="noopener noreferrer">
                    <SVGIcon name="linkedIn" alt="linked In" size={20} />
                  </a>
                  <a
                    href={social?.YouTube_Link || brandConfig.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer">
                    <SVGIcon name="uTube" alt="Youtube" size={20} />
                  </a>
                  <a
                    href={social?.Instagram_Link || brandConfig.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer">
                    <SVGIcon name="insta" alt="Instagram" size={20} />
                  </a>
                </div>
              </div>
            </div>
            */}
            {/* } */}
          </div>
        </div>
      </div>
    </div>
  )
})

export { CommonLayout }
