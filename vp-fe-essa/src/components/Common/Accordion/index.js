import {
  Accordion as _Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Checkbox,
  FormControlLabel
} from '@mui/material'
import PropTypes from 'prop-types'
import { color } from 'services/colors'
import Icon from 'services/icon'
import styled from 'styled-components'
import { useState } from 'react'
import CustomModal from 'components/Common/Modal'
import { NormalButton } from 'components/Common'
import { connect } from 'react-redux'
import { editIcon, deleteIcon } from 'constants/imageConstants'
import { ADMIN_USER_TYPE } from 'constants/userType'
import { width } from '@mui/system'
import { useTranslation } from 'react-i18next'

// STYLES
const Accordions = styled(_Accordion)`
  box-shadow: none !important;
  border-radius: 0 !important;
  border: none !important;
  border-top: 1px solid #e0e0e0 !important;
  margin-bottom: 8px;
  padding: 0;
  &:first-of-type {
    border-top: none !important;
  }
  &:only-of-type {
    border-bottom: 1px solid #e0e0e0 !important;
  }
  .css-1f1pi2l-MuiButtonBase-root-MuiAccordionSummary-root.Mui-expanded {
    min-height: 0px !important;
  }


  .MuiAccordionSummary-content {
  margin : 12px 0px 8px 0px !important;
   min-height: 0px !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
`

const Title = styled(Typography)`
  font-weight: 400 !important;
  font-size: 1.25rem !important;
  color: #2D2C2C;
  display: flex;
  align-items: center;
`

const AccordionDetail = styled(AccordionDetails)`
  display: block;
  padding: 0 16px 16px 16px;
  width: 100%;
`

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const ExpandIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  .MuiAccordionSummary-expandIcon {
    transform: none !important; // Prevent rotation on the entire wrapper
  }
`

const Accordion = ({
  question,
  children,
  deleteQnA,
  onEdit,
  defaultExpanded,
  onChange,
  checkbox,
  mainParentChecked,
  handleMainParentChange,
  expanded,
  userInfo: { userType }
}) => {
  const { t, i18n } = useTranslation(['faq', 'otp'])
  const isArabic = i18n.language === 'ar'

  const [isExpanded, setIsExpanded] = useState(defaultExpanded || false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleExpandChange = (event, newExpanded) => {
    setIsExpanded(newExpanded)
    if (onChange) onChange(event, newExpanded)
  }

  return (
    <Accordions
      defaultExpanded={defaultExpanded}
      expanded={expanded ?? isExpanded}
      onChange={handleExpandChange}>
      <AccordionSummary>
        <Title style={{direction: isArabic ? "ltr" : ""}}>{question?.question}</Title>
        <IconWrapper>
          {userType === ADMIN_USER_TYPE && (
            <>
              <img
                src={deleteIcon}
                alt="delete"
                width={17}
                height={17}
                onClick={() => setShowDeleteModal(true)}
                style={{ cursor: 'pointer',marginRight: 8 }}
              />
              <img
                src={editIcon}
                alt="Edit"
                width={18}
                height={18}
                style={{ cursor: 'pointer' }}
                onClick={() => onEdit && onEdit(question)}
              />
            </>
          )}
          <ExpandIconWrapper>
            <Icon
              iconName={isExpanded ? 'Remove' : 'Add'}
              iconColor={color.brandColor.primary['300']}
            />
          </ExpandIconWrapper>
        </IconWrapper>
      </AccordionSummary>
      <AccordionDetail>{children}</AccordionDetail>
      {/* Delete confirmation modal for FAQ question */}
      {showDeleteModal && (
        <CustomModal modalStyles={{width:"550px"}} open={showDeleteModal} onClose={() => setShowDeleteModal(false)} closeIcon>
           <div className='flex flex-col justify-between h-[120px] w-full'>
                            <p className="modalTxt mb-4 text-center">{t('deleteConfirm')}</p>
                            <div className="w-full flex justify-between gap-4 mt-auto mb-2">
                              <NormalButton label={t('otp:cancel')} customClass="w-[200px]" outlineBtn  onClick={() => setShowDeleteModal(false)} />
                              <NormalButton label={t('otp:confirm')} customClass="w-[200px]" isPrimary onClick={() => {
                deleteQnA(question?.ID)
                setShowDeleteModal(false)
              }} />
                            </div>
                          </div>

        </CustomModal>
      )}
    </Accordions>
  )
}

Accordion.propTypes = {
  title: PropTypes.string,
  onChange: PropTypes.func,
  children: PropTypes.node,
  defaultExpanded: PropTypes.bool,
  expanded: PropTypes.bool,
  mainParentChecked: PropTypes.bool,
  handleMainParentChange: PropTypes.func,
  checkbox: PropTypes.bool,
  deleteQnA: PropTypes.func,
  onEdit: PropTypes.func
}

Accordion.defaultProps = {
  title: ''
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})

// Map actions to props
const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(Accordion)
