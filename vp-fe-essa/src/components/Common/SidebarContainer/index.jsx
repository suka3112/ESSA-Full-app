import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { connect, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Landmark,
  Settings,
  ShieldCheck
} from 'lucide-react'
import './style.scss'
import {
  INVOICE_DASHBOARD,
  USER_MANAGEMENT,
  INVOICES,
  UPLOAD_INVOICE,
  TIMELINE,
  APPROVALS,
  EXCEPTION_WORKBENCH,
  INBOUND_EMAILS,
  INBOUND_SHAREPOINT,
  APPROVAL_MATRIX,
  AUDIT_LOGS,
  VENDORS_LIST,
  PURCHASE_ORDER,
  EMAIL_TEMPLATES,
  SLA_MANAGEMENT,
  PROMPT_CONFIG
} from 'constants/url'
import OutsideClickHandler from '../OutsideClickHandler'
import { closeSidebar } from '../../../redux/actions/sidebarActions'
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'

function EapaLogo() {
  return (
    <div className="eapa-logo">
      <img src="/essa-logo.png" alt="ESSA" />
      <span>EAPA (Accounts Payable Automation)</span>
    </div>
  )
}

export const isPathActive = (pathname, fullPath) =>
  pathname === fullPath || pathname.startsWith(`${fullPath}/`)

export const getSidebarMenuItems = ({ t, isAdmin, isVendor }) => {
  const items = [
    { name: t('dashboard'), icon: LayoutDashboard, path: INVOICE_DASHBOARD },
    {
      name: t('invoiceProcessing'),
      icon: FileText,
      path: INVOICES,
      subItems: [
        { name: t('invoices'), path: INVOICES },
        ...(isAdmin ? [{ name: t('uploadInvoice'), path: UPLOAD_INVOICE }] : []),
        { name: t('timeline'), path: TIMELINE },
        ...(!isVendor
          ? [
            { name: t('approvals'), path: APPROVALS },
            { name: t('exceptionWorkbench'), path: EXCEPTION_WORKBENCH },
            { name: t('inboundEmails'), path: INBOUND_EMAILS },
            { name: t('inboundSharePoint'), path: INBOUND_SHAREPOINT }
          ]
          : [])
      ]
    },
    ...(!isVendor ? [{ name: t('vendors'), icon: Landmark, path: VENDORS_LIST }] : []),
    { name: t('purchaseOrders'), icon: FileSpreadsheet, path: PURCHASE_ORDER },
    ...(isAdmin
      ? [
        {
          name: t('administration'),
          icon: Settings,
          path: SLA_MANAGEMENT,
          matchPaths: [
            EMAIL_TEMPLATES,
            SLA_MANAGEMENT,
            APPROVAL_MATRIX,
            USER_MANAGEMENT,
            PROMPT_CONFIG
          ],
          subItems: [
            { name: t('invoiceConfiguration'), path: PROMPT_CONFIG },
            { name: t('slaManagement'), path: SLA_MANAGEMENT },
            { name: t('exceptionCodes'), dummy: true },
            { name: t('workflowsAndApproval'), path: APPROVAL_MATRIX },
            { name: t('emailTemplates'), path: EMAIL_TEMPLATES },
            { name: t('usersAndRoles'), path: USER_MANAGEMENT }
          ]
        },
        { name: t('auditLogs'), icon: ShieldCheck, path: AUDIT_LOGS }
      ]
      : [])
  ]
  return items
}

const SidebarContainer = ({ userInfo: { userType } }) => {
  const location = useLocation()
  const { t } = useTranslation('sidebar')
  const dispatch = useDispatch()
  const isAdmin = userType === ADMIN_USER_TYPE
  const isVendor = userType === VENDOR_USER_TYPE

  const menuItems = useMemo(
    () => getSidebarMenuItems({ t, isAdmin, isVendor }),
    [t, isAdmin, isVendor]
  )

  const closeSidebarHandler = () => {
    if (window.innerWidth <= 850) {
      dispatch(closeSidebar())
    }
  }

  return (
    <OutsideClickHandler className="sidebar-outside-wrap" onOutsideClick={closeSidebarHandler}>
      <aside className="sidebar">
        <EapaLogo />
        <nav aria-label="Main navigation" className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            const itemTo = `/${userType}${item.path}`
            const matchPaths = item.matchPaths || [
              item.path,
              ...(item.subItems?.map((sub) => sub.path) || [])
            ]
            const parentActive = matchPaths.some((path) =>
              isPathActive(location.pathname, `/${userType}${path}`)
            )

            return (
              <div key={item.name} className="sidebar-nav-item">
                <NavLink
                  to={itemTo}
                  end={item.path === '/'}
                  className={clsx('sidebar-nav-link', parentActive && 'active')}>
                  <Icon size={16} strokeWidth={1.75} />
                  {item.name}
                </NavLink>
                {item.subItems && parentActive && (
                  <div className="sidebar-subnav">
                    {item.subItems.map((c) =>
                      c.dummy ? (
                        <span key={c.name} className="sidebar-subnav-link sidebar-subnav-link--dummy">
                          {c.name}
                        </span>
                      ) : (
                        <NavLink
                          key={c.path}
                          to={`/${userType}${c.path}`}
                          end={c.path !== SLA_MANAGEMENT}
                          className={({ isActive }) =>
                            clsx('sidebar-subnav-link', isActive && 'active')
                          }>
                          {c.name}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          {t('eapaFooter')}
          <br />
          {t('eapaEnv')}
        </div>
      </aside>
    </OutsideClickHandler>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(SidebarContainer)
