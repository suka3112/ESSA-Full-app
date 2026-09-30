import React from 'react'
import {
  HeaderBarBoxContainer,
  HeaderBarSubHeader,
  HeaderBarSubBox,
  HeaderBarSideButtonContainer,
  HeaderStatusTag
} from './HeaderBar.styles'
import backArrow from '../../../assets/icons/backArrow.svg'
import SVGIcon from 'components/Common/SVGIcon'

export const HeaderBar = ({
  title = 'Home',
  slug = 'Dashboard',
  statusTag,
  children,
  customBackHandler,
  showBackArrow = true,
  customClass,
  dasboardHeader = false
}) => {
  const goBack = () => {
    if (customBackHandler) {
      customBackHandler()
    } else {
      window.history.length > 1 ? window.history.back() : (window.location.href = '/')
    }
  }

  const hasChildren = React.Children.toArray(children).length > 0
  if (!showBackArrow && !statusTag && !hasChildren) {
    return null
  }

  return (
    <HeaderBarBoxContainer className={customClass}>
      <HeaderBarSubHeader style={{ minHeight: dasboardHeader ? '30px' : '45px' }}>
        <HeaderBarSubBox>
          {showBackArrow && <SVGIcon name="backArrow" size={25} alt="Back" className='cursor-pointer' onClick={goBack} />}
          {statusTag && (
            <HeaderStatusTag status={statusTag?.toLowerCase()}>{statusTag}</HeaderStatusTag>
          )}
        </HeaderBarSubBox>
        <HeaderBarSideButtonContainer>{children}</HeaderBarSideButtonContainer>
      </HeaderBarSubHeader>
    </HeaderBarBoxContainer>
  )
}
