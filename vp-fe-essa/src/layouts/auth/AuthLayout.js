import '../../assets/scss/layouts/AuthLayout.scss'
import fbIcon from '../../assets/icons/facebookIcon.svg'
import xIcon from '../../assets/icons/xIcon.svg'
import linkedInIcon from '../../assets/icons/linkedInIcon.svg'
import yTIcon from '../../assets/icons/youtubeIcon.svg'
import instIcon from '../../assets/icons/instaIcon.svg'
import { useSelector } from 'react-redux'
import VideoPlayer from '../../components/Common/VideoPlayer'
import vendorVideo from '../../assets/videos/vendor_banner.mp4'
import { AUTH_SETUP } from 'constants/userType'
import { AUTH_CALLBACK, ENTRA_COMPLETE, LOGIN } from 'constants/url'
import Modal from '@mui/material/Modal'
import { useState } from 'react'
import { playIcon } from 'constants/imageConstants'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useBrand } from '../../contexts/BrandContext'

export const AuthLayout = ({ children }) => {
  const location = useLocation()
  const { brandConfig } = useBrand()
  const pathname = location.pathname.replace(/\/$/, '')
  const isCenteredAuthPage = [
    `/${AUTH_SETUP}${LOGIN}`,
    `/${AUTH_SETUP}${ENTRA_COMPLETE}`,
    `/${AUTH_SETUP}${AUTH_CALLBACK}`
  ].includes(pathname)

  const userInfo = useSelector((state) => state.userInfo)
  const [openVideo, setOpenVideo] = useState(false)

  const handleOpenVideo = () => setOpenVideo(true)
  const handleCloseVideo = () => setOpenVideo(false)
  const { t } = useTranslation(['login', 'footer'])

  const renderBanner = () => {
    // if (userInfo.userType !== VENDOR_USER_TYPE) {
    //   return <img src={daikinImg} alt="daikinHero" className="mt-5 rounded-[10px]" />
    // } else {
    return (
      <>
        <div className="mt-[2vh] relative max-w-[800px] rounded-[11px]">
          <img
            src={brandConfig.images.thumbnail}
            alt="thumbnail"
            className="w-full h-[45vh] rounded-md rounded-[11px] overflow-hidden"
          />
          <div
            className={
              'video-icons inset-0 flex items-center justify-center bg-black/30 cursor-pointer rounded-[11px]'
            }
            onClick={handleOpenVideo}>
            <img src={playIcon} alt="play" />
          </div>

          <Modal open={openVideo} onClose={handleCloseVideo}>
            <div className="flex items-center justify-center h-full p-4">
              <VideoPlayer
                src={vendorVideo}
                className="max-h-[600px] w-100 "
                thumbnail={brandConfig.images.thumbnail}
                onClose={handleCloseVideo}
              />
            </div>
          </Modal>
        </div>
      </>
    )
    // }
  }

  if (isCenteredAuthPage) {
    return <div className="auth-layout-container auth-layout--centered">{children}</div>
  }

  return (
    <div className="auth-layout-container grid grid-cols-12 gap-[25px]">
      <div className="col-span-6 max-[1023px]:col-span-6 auth-layout-content">
        <img
          src={brandConfig.logos.auth}
          alt={`${brandConfig.displayName} logo`}
          className="auth-layout-logo"
        />
        <p className="daikin-text relative max-w-[800px]">{brandConfig.brandStatement}</p>
        {renderBanner()}
      </div>
      <div className="col-span-6 mr-[15%] ml-[10%] max-[1023px]:col-span-6 auth-layout-content max-[1023px]:content-start relative">
        {children}
      </div>
      <div className="footer-container">
        <div className="footer-left-content">
          <ul>
            <li>{brandConfig.footer.copyrightText}</li>
            <li>
              <a
                href={brandConfig.website.legalNotice}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-item">
                {t('footer:legalNotice')}
              </a>
            </li>
            <li>
              <a
                href={brandConfig.website.cookieNotice}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-item">
                {t('footer:cookieNotice')}
              </a>
            </li>
            <li>
              <a
                href={brandConfig.website.dataProtection}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-item">
                {t('footer:dataPrivacy')}
              </a>
            </li>
            <li>
              <a
                href={brandConfig.website.corporateEthics}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-item">
                {t('footer:corporateEthics')}
              </a>
            </li>
          </ul>
        </div>

        <div className="footer-right-content">
          <ul>
            <span
              onClick={() => window.open(brandConfig.website.main, '_blank')}
              style={{ cursor: 'pointer', fontWeight: 500 }}
              className="footer-item">
              {brandConfig.footer.websiteDisplay}
            </span>
            <div
              style={{
                borderRight: '1.5px solid',
                height: '15px',
                alignSelf: 'center'
              }}
            />
            <a href={brandConfig.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
              <img src={fbIcon} alt="facebook" />
            </a>
            <a href={brandConfig.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
              <img src={xIcon} alt="x" />
            </a>
            <a href={brandConfig.socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
              <img src={linkedInIcon} alt="linked In" />
            </a>
            <a href={brandConfig.socialMedia.youtube} target="_blank" rel="noopener noreferrer">
              <img src={yTIcon} alt="Youtube" />
            </a>
            <a href={brandConfig.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
              <img src={instIcon} alt="Instagram" />
            </a>
          </ul>
        </div>
      </div>
    </div>
  )
}
