import React, { startTransition, useEffect, useState } from 'react'
import { Box, Typography, Divider } from '@mui/material'
import { HeaderBar } from 'components/Common/HeaderBar'
import styled from 'styled-components'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { useNavigate } from 'react-router-dom'
import FileUpload from 'components/Common/FileUpload'
import { connect } from 'react-redux'
import PencilIcon from 'assets/icons/Pencil.svg'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import {
  vendorSampleImg,
  phoneIcon,
  emailIcon
} from 'constants/imageConstants'
import Avatar from 'assets/images/user-avatar-white.png'
import editIcon from 'assets/icons/editPencilIcon.svg'
import { BUSINESS_USER_TYPE } from 'constants/userType'
import { useTranslation } from 'react-i18next'
import { editProfileImage, getProfileDetails, getProfileImage } from 'api/MyProfile'
import { fileUpload } from 'api/FileUpload'
import { showToast } from 'redux/actions/toastActions'
import { fetchImage } from 'services/helperFunctions'
import { toast } from 'react-toastify'

const BoxWrapper = styled(Box)`
  background-color: white;
  border-radius: 8px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
  border:1px solid rgb(152, 162, 179);
  display: flex;
`

const IconSec = styled.div`
  display: flex;
`
const EmailDownloadIcon = styled.img`
  height: 40px;
  width: 40px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: white;
  padding: 5px;
  margin-right: 10px;
`

const HeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`

const ProfileImage = styled.img`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.1);
  // border: 2px solid var(--brand-primary-color, $primary-color);
`

const ContactWrapper = styled(Box)`
  display: flex;
  gap: 40px;
  align-items: center;
`

const IconWrapper = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BadgeLabel = styled.span`
  background-color: #d9ecff;
  color: var(--brand-primary-color, $primary-color);
  padding: 0px 15px;
  border-radius: 16px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  font-size: 0.9rem;
  font-weight: bold;
  margin-left: 8px;
  margin-top: 3px;
  display: flex;
  align-items: center;
  height: 25px;
`

const StyledDivider = styled(Divider)`
  width: 100%;
  margin-top: 60px;
`
const EditImgIcon = styled.img`
  // height: 30px;
  // width: 25px;
  position: absolute;
  top: 10px;
  right: 10px;
  transform: translate(0, 0);
  cursor: pointer;
  opacity: 1;
  transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
  cursor: pointer;
`

const ProfileContainer = styled(Box)`
  background-color: var(--brand-primary-color, $primary-color);
  padding: 15px;
  border-radius: 7px 0px 0px 7px;
  position: relative;
  width: fit-content;
  transition: all 0.5s ease;
  cursor: pointer;

  &:hover::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.2); /* White overlay with 20% opacity */
    border-radius: 10px;
    pointer-events: none; /* Prevent overlay from blocking interactions */
  }

  &:hover ${EditImgIcon} {
    height: 100px;
    width: 100px;
    opacity: 1;
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
    transition: transform 0.5s ease-out, opacity 1s ease-out, height 0.75s ease, width 0.75s ease;
    cursor: pointer;
  }
`

const ContentBoxWrapper = styled(Box)`
  width: 100%;
  padding: 10px 10px 0px 35px;
`

const FinanceMyProfile = ({ userInfo: { userType }, showToast }) => {
  const navigate = useNavigate()
  const [showFileInput, setShowFileInput] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [preview, setPreview] = useState(null)
  const { t, i18n } = useTranslation([
    'reset-password',
    'user_management',
    'myprofile',
    'dashboard',
    'sidebar'
  ])
  const isArabic = i18n.language === 'ar'
  const role =
    userType === 'admin'
      ? t('dashboard:admin')
      : userType === 'finance'
        ? t('dashboard:finance')
        : userType === 'vendor'
          ? t('dashboard:vendor')
          : userType

  const handleEditClick = () => {
    startTransition(() => {
      setShowFileInput(true)
    })
  }
  useEffect(() => {
    fetchProfileDetails()
    getProfileImg()
  }, [])
  const handleClose = () => {
    setShowFileInput(false)
  }

  const fetchProfileDetails = () => {
    getProfileDetails()
      .then((res) => {
        setProfileData(res?.data?.data)
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
  const handleFileChange = async (e) => {
    const file = e.target.files[0]

    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setPreview(imageUrl)
      setShowFileInput(false)

      const fd = new FormData()
      fd.append('image', file)

      try {
        // Step 1: Upload file and get URL
        const uploadRes = await fileUpload(fd)
        const uploadedUrl = uploadRes?.data?.data?.url

        // Step 2: Send uploaded URL to update profile image
        const payload = { imageUrl: uploadedUrl }
        const updateRes = await editProfileImage(payload)
        showToast('success.', `${updateRes?.data?.message}`, 'success')
      } catch (err) {
        toast.error(err?.response?.data?.message || err.message || 'Failed to update profile image')
      }
    }
  }

  const formatPhone = (number, defaultCountry = 'IN') => {
    try {
      const phoneNumber = parsePhoneNumberFromString(number, defaultCountry)
      return phoneNumber ? phoneNumber.formatInternational() : number
    } catch {
      return number
    }
  }

  return (
    <>
      <LeftPageContainer>
        <HeaderWrapper>
          <HeaderBar
            title={t('myprofile:profile')}
            slug={`${t('sidebar:home')} / ${t('myprofile:profile')}`}
          />
        </HeaderWrapper>
        <BoxWrapper>
          <ProfileContainer>
            <ProfileImage src={preview || Avatar} alt={t('myprofile:profile')} onError={e => { e.target.onerror = null; e.target.src = Avatar; }} />
            {/* <EditImgIcon src={PencilIcon} onClick={handleEditClick} />
            {showFileInput && (
              <FileUpload openOnRender onFileChange={handleFileChange} onClose={handleClose} />
            )} */}
          </ProfileContainer>

          <ContentBoxWrapper>
            <Box className="d-flex justify-between">
              <Box className="d-flex">
                <Typography sx={{ fontWeight: 600, fontSize: '20px' }}>
                  {profileData?.Name}
                </Typography>{' '}
                <BadgeLabel>
                  {' '}
                  {userType === 'admin' || userType === 'finance' || userType === 'vendor'
                    ? role
                    : role.charAt(0).toUpperCase() + role.slice(1)}
                </BadgeLabel>
              </Box>
              <Box className="d-flex"></Box>
            </Box>
            <Typography fontWeight="500" fontSize="16px" marginBottom="10px" marginTop={'10px'}>
              {t('user_management:designation.text')}: <span style={{ fontWeight: 600 }}>{profileData?.employee?.Designation}</span>
            </Typography>
            <Typography fontWeight="500" fontSize="16px" marginBottom="0px">
              {t('user_management:department.text')}: <span style={{ fontWeight: 600 }}>{profileData?.employee?.Department}</span>
            </Typography>

            <Box>
              {/* <StyledDivider /> */}
              <hr style={{ marginTop: '50px' }} />
              <ContactWrapper>
                <IconWrapper>
                  <img src={phoneIcon} alt="Phone" />
                  <Typography fontWeight="600" fontSize="16px" style={{direction: isArabic ? 'ltr' : ''}}>
                    +{profileData?.Phone_Number}
                    {/* {formatPhone(profileData?.Phone_Number, profileData?.countryCode)} */}
                  </Typography>
                </IconWrapper>
                <IconWrapper>
                  <img src={emailIcon} alt="Email" />
                  <Typography fontWeight="600" fontSize="16px">
                    {profileData?.Email}
                  </Typography>
                </IconWrapper>
              </ContactWrapper>
            </Box>
          </ContentBoxWrapper>
        </BoxWrapper>
      </LeftPageContainer>
    </>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

// Map actions to props
const mapDispatchToProps = {
  showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(FinanceMyProfile)
