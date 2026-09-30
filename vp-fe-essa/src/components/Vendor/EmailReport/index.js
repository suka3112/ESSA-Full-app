import DateRangePicker from 'components/Common/DateRangePicker1'
import CustomModal from 'components/Common/Modal'
import React from 'react'
import styles from './EmailReport.module.scss'
import { NormalButton } from 'components/Common'
import { useTranslation } from 'react-i18next'
import { fontWeight, height } from '@mui/system'

const EmailReportComp = ({ open, onClose, value, setValue, onSend, disable = false }) => {
  const { t, i18n } = useTranslation('enquiries')
  const isArabic = i18n.language === 'ar';

  const modalStyles = {
    minWidth: '315px',
    minHeight: disable ? 'auto' : '200px',
    padding: '24px'
  }

  return (
    <div>
      <CustomModal
        open={open}
        onClose={onClose}
        header={t('emailReport.text')}
        closeIcon
        modalStyles={modalStyles}
        titleStyles={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1A1A1A',
          textAlign: isArabic ? 'right' : 'center',
          paddingTop: isArabic ? '15px' : ''
        }}>
        <div className={styles.emailReport}>
          {!disable && (
            <>
              <label className={styles.label}>{t('selectDate')}</label>
              {/* <input
                  type="date"
                  id="date"
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-blue-500"
                /> */}
              <DateRangePicker pickerHeight={'35px'} value={value} setValue={setValue} type="range" />
            </>
          )}
          <NormalButton
            onClick={onSend}
            isPrimary
            label={t('sendReport')}
            customClass={ !disable ? styles.sendReportBtn : styles.disabledsendReportBtn  }
          />
        </div>
      </CustomModal>
    </div>
  )
}

export default EmailReportComp
