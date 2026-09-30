import '../../assets/scss/layouts/AdminLayout.scss'
import fbIcon from '../../assets/icons/facebookIcon.svg'
import xIcon from '../../assets/icons/xIcon.svg'
import linkedInIcon from '../../assets/icons/linkedInIcon.svg'
import yTIcon from '../../assets/icons/youtubeIcon.svg'
import instIcon from '../../assets/icons/instaIcon.svg'
import { useTranslation } from 'react-i18next'
import { useBrand } from '../../contexts/BrandContext'

export const AdminLayout = ({ children }) => {
    const { t, i18n } = useTranslation('login')
    const { brandConfig } = useBrand()
  
  return (
    <div className="admin-layout-container flex ">
      <div className="col-span-2 w-[280px] sidebar flex flex-col">
        <div className="sidebar-layout">
          <div className="sidebar-content">
            <img src={brandConfig.logos.sidebar} alt={`${brandConfig.displayName} logo`} className="my-3 daikin-layout" />
            <p className="my-3 diakin-pitch">
              {brandConfig.brandPitch}
              </p>
            <p className="my-3 diakin-text">
              {brandConfig.brandStatement}
            </p>
            <div className="d-flex gap-2 mt-5 mb-5 pb-5">
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
            </div>
            <div></div>
          </div>
        </div>
          <div className="h-[35%]">
            <img
              className="w-full h-[370px] object-cover object-bottom"
              src={brandConfig.images.sidebarBackground}
              alt={brandConfig.displayName}
            />
          </div>
      </div>
      <div className="col-span-10 w-[calc(100vw-280px)]">{children}</div>
    </div>
  )
}

export default AdminLayout
