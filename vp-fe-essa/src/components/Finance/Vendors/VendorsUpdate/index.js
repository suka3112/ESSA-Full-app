import React, { useState } from 'react'
import helpIcon from '../../../../assets/icons/helpIcon.svg'
import styles from './VendorsUpdate.module.scss'
import { NormalButton } from 'components/Common/NormalButton'
import invoiceIcon from '../../../../assets/icons/invoiceIcon.svg'
import emailReport from '../../../../assets/icons/emailReport.svg'
import download from '../../../../assets/icons/downloadIcon2.svg'
import addIcon from '../../../../assets/icons/addIconWhite.svg'
import TableComponent from 'components/Common/TableComponent'
import { useNavigate } from 'react-router-dom'
import SearchInput from 'components/Common/SearchInput'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { TableSelectBox } from 'components/Common/TableComponent/TableSelectBox'
import { HeaderBar } from 'components/Common/HeaderBar'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import EmailReportComp from 'components/Vendor/EmailReport'
import { UtilIcon, UtilIconFaq } from 'components/Common/UtilIcon'
import { useTranslation } from 'react-i18next'

export const VendorsUpdateComp = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('vendors')

  const [emailReportState, setEmailReportState] = useState(false)
  const [downloadReport, setDownloadReport] = useState(false)

  const handleEmailReport = () => {
    setEmailReportState(true)
  }

  const handleDownload = () => {
    setDownloadReport(true)
  }

  const handleCloseDownload = () => {
    setDownloadReport(false)
  }

  return (
    <LeftPageContainer>
      <div className={styles.poContainer}>
        <HeaderBar title={t('vendorsUpdates')} slug="Home / Vendors  / Vendors Updates">
          <UtilIconFaq name="emailReport" onClick={() => setEmailReportState(true)} />
          <UtilIconFaq name="download2" onClick={handleDownload} />
        </HeaderBar>
      </div>
      {/* Filters */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <div className="d-flex justify-content-between p-3 align-items-end">
          <SearchInput placeholder="Search" />
          <div className="d-flex gap-4">
            <TableSelectBox label={t('status')} options={['All', 'active', 'Inactive']} />
            <TableSelectBox
              label={t('vendorNameOrCode')}
              options={['Aaliyah', 'Amir', 'John Doe', 'Jane Doe']}
            />
          </div>
        </div>
        {/* <TableComponent /> */}
      </div>
      <EmailReportComp open={emailReportState} onClose={() => setEmailReportState(false)} />
      <DownloadReportComp
        open={downloadReport}
        onClose={handleCloseDownload}
        title="Vendors Update.pdf"
      />
    </LeftPageContainer>
  )
}
