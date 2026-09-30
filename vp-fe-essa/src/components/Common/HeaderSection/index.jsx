import React, { useState, useRef, useEffect } from 'react'
import './style.scss'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import myProfile from 'assets/images/HeaderProfileIcons/myProfile.svg'
import resetPassword from 'assets/images/HeaderProfileIcons/resetPassword.svg'
import extension from 'assets/images/HeaderProfileIcons/extension.svg'
import logout from 'assets/images/HeaderProfileIcons/logout.svg'
import { connect, useDispatch, useSelector } from 'react-redux'
import { toggleSidebar } from '../../../redux/actions/sidebarActions'
import { Check, ChevronDown, CircleHelp, ClipboardCheck, LogOut, Menu, Users } from 'lucide-react'
import { FAQS, INVOICE_DASHBOARD } from 'constants/url'
import CustomModal from '../Modal'
import { NormalButton } from '..'
import { getEntityDropdown, getNotifications, getProfileImage } from 'api/MyProfile'
import { getProfileDetails } from 'api/MyProfile'
import { useTranslation } from 'react-i18next'
import { getEntityId, logout as logoutFromApp } from 'services/utilities'

import { ADMIN_USER_TYPE, FINANCE_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { persistEssaRole } from 'constants/essaRoles'
import { SET_USER_INFO } from 'redux/constants/userInfoConstant'
import { fetchImage } from 'services/helperFunctions'
import { setAuthSession } from 'utils/authStorage'
import { toast } from 'react-toastify'
import socket from 'services/socket'

const DEMO_PERSONAS = [
  {
    id: 'putri',
    name: 'Putri Anggraini',
    role: 'AP Processor',
    userType: FINANCE_USER_TYPE,
    roleId: 5,
    email: 'putri.anggraini@essa.co.id'
  },
  {
    id: 'arif',
    name: 'Arif Wibowo',
    role: 'AP Supervisor',
    userType: FINANCE_USER_TYPE,
    roleId: 6,
    email: 'arif.wibowo@essa.co.id'
  },
  {
    id: 'rahmat',
    name: 'Rahmat Hidayat',
    role: 'Tax Reviewer',
    userType: FINANCE_USER_TYPE,
    roleId: 5,
    email: 'rahmat.hidayat@essa.co.id'
  },
  {
    id: 'surya',
    name: 'Surya Nugraha',
    role: 'Administrator',
    userType: ADMIN_USER_TYPE,
    roleId: 4,
    email: 'surya.nugraha@essa.co.id'
  }
]
const DEMO_PERSONA_KEY = 'essa_demo_persona'

const HeaderSection = ({ userInfo: { userType } }) => {
  const userInfo = useSelector((state) => state.userInfo)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [confirmEntityChange, setConfirmEntityChange] = useState(false)
  // const currentEntity = getEntityId();
  //const normalizedEntity = !currentEntity || currentEntity === 'null' ? '1' : currentEntity;
  const [selectedEntity, setSelectedEntity] = useState(null) // actual selected value
  const [tempSelectedEntity, setTempSelectedEntity] = useState(null)
  const [entityOptions, setEntityOptions] = useState([])
  const [profileData, setProfileData] = useState([])
  const [notification, setNotification] = useState([])
  const [preview, setPreview] = useState(null)
  const [unReadcount, setUnreadCount] = useState(0)
  const profileRef = useRef(null)
  const notifyRef = useRef(null)
  const location = useLocation()
  const isDashboard =
    location.pathname === `/${userType}/dashboard` ||
    location.pathname === `/${userType}${INVOICE_DASHBOARD}`
  const navigate = useNavigate()
  const fullName = useSelector((state) => state?.userInfo?.fullName)
  const { t, i18n } = useTranslation(['dashboard', 'myprofile', 'sidebar', 'otp', 'popup'])
  const isArabic = i18n.language === 'ar'
  const userEmail = String(userInfo?.email || '').trim().toLowerCase()
  const isHeadOfSectionUser = userEmail.startsWith('hos@')
  const role =
    userType === 'admin'
      ? t('admin')
      : userType === 'finance'
        ? isHeadOfSectionUser
          ? 'Head of Section'
          : 'AP Team'
        : userType === 'vendor'
          ? t('vendor')
          : userType === 'business'
            ? t('business')
            : userType

  const displayName = (
    fullName?.trim() ||
    (isArabic ? profileData?.Vendor_Name_AR : profileData?.Vendor_Name_EN) ||
    profileData?.Name ||
    ''
  ).trim()
  const firstName = displayName.split(/\s+/)[0] || ''
  const initials = displayName
    ? displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
    : 'U'
  const roleLabel = userType === 'admin' ? 'Administrator' : role
  const headerRoleLabel = userType === 'admin' ? 'Platform Administrator' : roleLabel
  const storedPersonaId =
    typeof window === 'undefined' ? '' : localStorage.getItem(DEMO_PERSONA_KEY) || ''
  const activePersona =
    DEMO_PERSONAS.find((persona) => persona.id === storedPersonaId) ||
    DEMO_PERSONAS.find(
      (persona) =>
        persona.email.toLowerCase() === userEmail ||
        persona.name.toLowerCase() === displayName.toLowerCase()
    )

  const dispatch = useDispatch()

  useEffect(() => {
    // First fetch entity dropdown, then fetch profile and notifications
    getEntityDropdown()
      .then((entityRes) => {
        const entityOptions = entityRes?.data?.data?.map((entity) => ({
          label: isArabic
            ? entity?.entity_details?.Entity_Name_AR
            : entity?.entity_details?.Entity_Name,
          value: entity?.entity_details?.CoCd,
          entity_details: entity?.entity_details
        }))

        setEntityOptions(entityOptions)

        // Check localStorage for entity_id
        let storedEntity = localStorage.getItem('entity_id')
        let storedEntityDetails = localStorage.getItem('entity_details')
        if (storedEntity) {
          try {
            storedEntity = JSON.parse(storedEntity)
          } catch {
            // fallback if not JSON
          }
        }
        if (storedEntityDetails) {
          try {
            storedEntityDetails = JSON.parse(storedEntityDetails)
          } catch {
            // fallback if not JSON
          }
        }
        const defaultEntity = storedEntity || entityOptions?.[0]?.value
        const defaultEntityDetails = storedEntityDetails || entityOptions?.[0]?.entity_details
        setSelectedEntity(defaultEntity)

        if (!storedEntity && defaultEntity !== undefined) {
          localStorage.setItem('entity_id', JSON.stringify(defaultEntity))
        }
        if (!storedEntityDetails && defaultEntityDetails !== undefined) {
          localStorage.setItem('entity_details', JSON.stringify(defaultEntityDetails))
        }
        // Now fetch profile and notifications
        fetchProfileDetails()
        getProfileImg()
        fetchNotifications()
      })
      .catch((err) => console.error('Error fetching Entity dropdown data:', err))

    fetchNotifications()
  }, [isDashboard, isArabic])

  useEffect(() => {
    socket.on('new_notification', (data) => {
      setNotification((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      socket.off('new_notification')
    }
  }, [])

  const toggleSidebarHandler = () => {
    dispatch(toggleSidebar())
  }

  const profileOptions = [
    { label: t('sidebar:myProfile'), value: '1', img: myProfile },
    { label: t('myprofile:resetPassword'), value: '2', img: resetPassword },
    { label: t('addExtension'), value: '3', img: extension },
    { label: t('logout'), value: '4', img: logout }
  ]
  const filteredOptions = profileOptions.filter((option) => {
    if (['2', '3'].includes(option.value)) {
      return userType === 'vendor'
    }
    return true // show other options (like '1' and '4') for all users
  })

  const toggleProfileDropdown = () => {
    setIsProfileOpen((prev) => !prev)
  }

  const notificationDropdown = () => {
    setIsNotificationOpen((prev) => !prev)
  }

  const fetchProfileDetails = () => {
    getProfileDetails({ entity_id: getEntityId() })
      .then((res) => {
        setProfileData(res?.data?.data)
        dispatch({
          type: SET_USER_INFO,
          payload: {
            ...userInfo,
            taxPercentage: res?.data?.data?.Taxble_Basis || '', // add or update Taxble_Basis,
            paymentTerms: res?.data?.data?.payment_terms_details?.Description_En || ''
          }
        })
      })
      .catch((err) => {
        console.error(err)
      })
  }

  const getProfileImg = () => {
    getProfileImage()
      .then((res) => {
        const imageUrl = res?.data?.data?.Image
        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
          fetchImage(imageUrl).then((blobUrl) => {
            if (blobUrl) setPreview(blobUrl)
          })
        } else {
          setPreview(null)
        }
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || 'Failed to fetch profile image')
      })
  }

  const fetchNotifications = () => {
    getNotifications({
      entity_id: getEntityId()
    })
      .then((res) => {
        const notifications = res?.data?.data?.data || []

        // Filter unread notifications where Is_Read is false
        const unread = notifications.filter((item) => item.Is_Read === false)

        setNotification(notifications)
        setUnreadCount(unread.length)
      })
      .catch((err) => {
        console.log('err', err)
      })
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifyRef.current && !notifyRef.current.contains(event.target)) {
        setIsNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRedirectClick = () => {
    navigate(`/${userType}${FAQS}?id=1`) // your internal route
  }

  const handleEntityChange = (e) => {
    const newValue = e.target.value
    if (newValue !== selectedEntity) {
      setTempSelectedEntity(newValue)
      setConfirmEntityChange(true)
    }
  }

  const handleConfirmSubmit = () => {
    setSelectedEntity(tempSelectedEntity)
    setConfirmEntityChange(false)
    setTempSelectedEntity(null)
    localStorage.setItem('entity_id', tempSelectedEntity || '')
    const selectedEntityDetails = entityOptions.find(
      (option) => option.value === tempSelectedEntity
    )?.entity_details
    localStorage.setItem('entity_details', JSON.stringify(selectedEntityDetails || {}))
    window.location.reload() // Reload to apply the new entity
  }
  const handleClick = (opt) => {
    if (opt.value === '4') {
      const secondaryToken = sessionStorage.getItem('secondaryToken')
      const backupUserType =
        sessionStorage.getItem('backupUserType') || localStorage.getItem('backupUserType')
      if (secondaryToken) {
        sessionStorage.removeItem('secondaryToken')
        const restoredUserType = backupUserType || 'business'
        dispatch({
          type: SET_USER_INFO,
          payload: {
            userType: restoredUserType
          }
        })
        navigate(`/${restoredUserType}${INVOICE_DASHBOARD}`)
        sessionStorage.removeItem('vendorId')
        sessionStorage.removeItem('backupUserType')
        window.location.reload()
      } else {
        logoutFromApp()
      }
    }

    if (opt.value === '1') {
      navigate(`/${userType}/my-profile`)
      setIsProfileOpen(false)
    }
    if (opt.value === '2') {
      navigate(`/${userType}/my-profile/reset-password`)
      setIsProfileOpen(false)
    }
    if (opt.value === '3') {
      navigate(`/${userType}/my-profile`, { state: { isExtension: true } })
      setIsProfileOpen(false)
    }
  }

  const handleSwitchPersona = (persona) => {
    if (activePersona?.id === persona.id) {
      setIsProfileOpen(false)
      return
    }
    persistEssaRole(persona.roleId)
    localStorage.setItem(DEMO_PERSONA_KEY, persona.id)
    setAuthSession({ userType: persona.userType })
    dispatch({
      type: SET_USER_INFO,
      payload: {
        ...userInfo,
        userType: persona.userType,
        fullName: persona.name,
        email: persona.email,
        roleId: persona.roleId
      }
    })
    setIsProfileOpen(false)
    window.location.assign(`/${persona.userType}${INVOICE_DASHBOARD}`)
  }

  return (
    <header className="app-header">
      <button
        type="button"
        aria-label="Toggle navigation"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={toggleSidebarHandler}
        className="header-icon-button">
        <Menu size={18} strokeWidth={1.75} />
      </button>
      <div className="header-welcome">
        <span className="header-welcome-icon">
          <ClipboardCheck size={14} strokeWidth={1.75} />
        </span>
        <div>
          <p className="header-welcome-text">
            EAPA{' '}
            <span className="header-welcome-user">
              · {t('welcome')}
              {firstName ? `, ${firstName}` : ''}
            </span>
          </p>
          <p className="header-roles" title={roleLabel}>
            {roleLabel}
          </p>
        </div>
      </div>
      <div className="header-spacer" />
      <button
        type="button"
        aria-label="Help & FAQs"
        onClick={handleRedirectClick}
        className="header-icon-button">
        <CircleHelp size={17} strokeWidth={1.75} />
      </button>
      <div ref={profileRef} className="user-menu-container">
        <button
          type="button"
          onClick={toggleProfileDropdown}
          className="user-menu-button"
          aria-haspopup="menu"
          aria-expanded={isProfileOpen}>
          <span className="user-avatar">{initials}</span>
          {displayName ? <span className="user-name">{displayName}</span> : null}
          <ChevronDown size={13} strokeWidth={1.75} className="user-menu-chevron" />
        </button>
        {isProfileOpen && (
          <div role="menu" className="user-dropdown">
            <div className="user-info">
              <p className="user-info-name">{displayName || 'User'}</p>
              <p className="user-info-email">{userInfo?.email || ''}</p>
              <p className="user-info-title">{headerRoleLabel}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => handleClick({ value: '4' })}
              className="sign-out-button">
              <LogOut size={14} strokeWidth={1.75} /> Sign out
            </button>
          </div>
        )}
      </div>
      <CustomModal
        open={confirmEntityChange}
        onClose={() => setConfirmEntityChange(false)}
        modalStyles={{ width: 400 }}
        closeIcon
        header={t('popup:confirmSubmission')}
        //title={'Confirm Submission'}
        description={t('popup:confirmChangeEntity')}>
        {/* <p className="modalTxt">{t('popup:confirmChangeEntity')}</p> */}
        <div className="d-flex justify-content-space-between mb-2">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="confimationBtns me-3"
            onClick={() => setConfirmEntityChange(false)}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            customClass="confimationBtns "
            onClick={handleConfirmSubmit}
          />
        </div>
      </CustomModal>
    </header>
  )
}
const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(HeaderSection)
