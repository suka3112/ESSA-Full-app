import React from 'react'
import CustomModal from '../Modal'
import { NormalButton } from '..'
import './style.scss'
import successGif from '../../../assets/gif/tickGreen.gif'
import { width } from '@mui/system'
import { useTranslation } from 'react-i18next'

const SuccessPopup = ({ open, successMsg, onClose, subText,modalStyles={},close=true }) => {
  const { t } = useTranslation(['purchase_order'])
  return (
    <div className="successPopup">
      <CustomModal open={open} onClose={onClose} modalStyles={modalStyles} closeIcon>
        <div className="successGif">
          <img src={successGif} alt="success gif" />
        </div>
        <p className="successMsg my-4 text-center">{successMsg}</p>
        <div className='closebtnWrapper'>
          {subText && <p className="subText mb-4 text-center text-[#2A2A2A] text-[20px] font-normal">{subText}</p>}
          {close &&  <NormalButton label={t('close')} outlineBtn customClass="px-3 closeButton" onClick={onClose} />}
        </div>
      </CustomModal>
    </div>
  )
}

export default SuccessPopup
