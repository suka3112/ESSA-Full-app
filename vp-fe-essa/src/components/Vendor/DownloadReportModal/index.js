import { NormalButton } from 'components/Common'
import CustomModal from 'components/Common/Modal'
import React, { useState } from 'react'
import downloadIcon from '../../../assets/icons/downloadIconWhite.svg'
import styles from './DownloadReportModal.module.scss'
import TableComponent from 'components/Common/TableComponent'
import { useTranslation } from 'react-i18next'
import DateRangePicker from '../../Common/DateRangePicker1'
import { SelectBox } from 'components/Common/SelectBox'
import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'react-toastify'

const DownloadReportComp = ({
  open,
  onClose,
  title,
  NewTableComp,
  value,
  setValue,
  advancedPayment,
  advancePaymentContent,
  headers,
  tableData,
  showPagination, pdfComponent,
  hideDatePicker = false,
  onClickSubmit,
  header = null,
  viewGrDetails = false
}) => {
  const { control, watch } = useForm()
  const exportDoc = watch('exportDoc', 'PDF')
  const tableRef = useRef(null)
  const [isLoading,setIsLoading] = useState(false)
  const { t } = useTranslation(['enquiries', 'purchase_order', 'otp', 'login'])
  const modalStyles = {
    //minWidth: '85%',
    padding: '0px !important',
    borderRadius: 0,
    //maxHeight: '90vh',
    width: '80%',
    height: '80%'
  }

  const exportOptions = [
    { label: 'csv', value: 'CSV' },
    { label: 'pdf', value: 'PDF' }
  ]

const MAX_PDF_ROWS = 1000 // set a safe threshold; tune as needed

const handleDownload = async () => {
  if (!pdfComponent) return

  // Try to detect number of rows in the passed PDF component
  const dataLength = pdfComponent?.props?.data?.length ?? 0

  if (dataLength > MAX_PDF_ROWS) {
    // Fallback to CSV export or inform the user
    if (onClickSubmit) {
      toast.info(
        `Data is large (${dataLength} rows). Falling back to CSV export to avoid memory issues.`
      )
      // reuse existing CSV handler
      onClickSubmit()
    } else {
      toast.error(
        'Data too large to generate PDF in the browser. Please export CSV or use server-side PDF generation.'
      )
    }
    return
  }

  setIsLoading(true)
  try {
    // Generate PDF as a blob
    const blob = await pdf(pdfComponent).toBlob()

    // Create a temporary link for download
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${title}.pdf`
    document.body.appendChild(link)
    link.click()

    // Clean up
    URL.revokeObjectURL(link.href)
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error generating PDF:', error)
    toast.error('Error generating PDF. Try exporting CSV or a smaller dataset.')
  } finally {
    setIsLoading(false)
  }
}



  return (
    <div>
      <CustomModal open={open} onClose={onClose} modalStyles={modalStyles} IsPadding={0}>
        <div className={styles.titleContainer}>
          <div>
            <p className={styles.title}>{`${title}.${exportDoc.toLowerCase()}`}</p>
          </div>
          {advancedPayment ? (
            <div className={styles.dateContainer}>
              <NormalButton onClick={onClickSubmit} label={t('login:submit')} isPrimary customClass="px-3" />
              <NormalButton onClick={onClose} label={t('otp:close')} outlineBtn customClass="px-3" />
            </div>
          ) : (
            <div className={styles.dateContainer}>
              <div className={`${styles.column}`}>
                <label>{t('purchase_order:format')}</label>
                <div>
                  <Controller
                    name="exportDoc"
                    control={control}
                    defaultValue="PDF"
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <div className="select-container w-[166px]">
                        <SelectBox
                          className={`${styles.exportSelectBox} mb-0`}
                          error={error}
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          options={exportOptions}
                          name="exportDoc"
                          height="36px"
                          minWidth="100px"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
              {!hideDatePicker && (
                <div className={`${styles.column} me-3`}>
                  <label htmlFor="date">{t('selectDate')}</label>
                  <div style={{ width: '240px', height: '36px', marginTop: '2px' }}>
                    <DateRangePicker value={value} setValue={setValue} type="range" />
                  </div>
                </div>
              )}
              <NormalButton
                onClick={() => {
                  if (exportDoc === 'PDF') {
                    handleDownload()
                  } else {
                    onClickSubmit()
                  }
                }}
                label={t('purchase_order:download')}
                leftIcon={downloadIcon}
                isPrimary
                disabled={isLoading}
                isLoading={isLoading}
                customClass={`px-3 min-h-[44px] fw-medium fs-6 ${styles.downloadBtn}`}
              />
              <NormalButton
                onClick={onClose}
                label={t('otp:close')}
                outlineBtn
                customClass={`px-3 min-h-[40px] text-base font-medium fs-6 ${styles.closeBtn}`}
              />
            </div>
          )}
        </div>
        <div>{advancePaymentContent}</div>
        <div ref={tableRef} className={styles.tableContainer}>
          {
            header ? header : null
          }
          {viewGrDetails && (
            <div className={styles.userInputContainerOuter}>
              <div className={styles.userInputContainer}>
                {/* Left Column */}
                <div className={`${styles.verticalDivider} col-4`}>
                  <div className={styles.userInputContainerInner}>
                    <div className={styles.inputQues}>
                      <label>Good Receipt Number:</label>
                      <label>{t('purchase_order:poNumber.tooltip')}:</label>
                      <label>Quantity Received:</label>
                      <label>Remarks:</label>
                    </div>
                    <div className={styles.inputAns}>
                      <label>123/1233, 23456</label>
                      <label>123/1233</label>
                      <label>750</label>
                    </div>
                  </div>
                </div>

                {/* Middle Column */}
                <div className={`${styles.verticalDivider} col-4`}>
                  <div className={styles.userInputContainerInner}>
                    <div className={styles.inputQues}>
                      <label>Company Code:</label>
                      <label>Fiscal Year:</label>
                    </div>
                    <div className={styles.inputAns}>
                      <label>DKN-UAE</label>
                      <label>2024</label>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="col-4">
                  <div className={styles.userInputContainerInner}>
                    <div className={styles.inputQues}>
                      <label>Receipt Date:</label>
                      <label>Creation Date:</label>
                    </div>
                    <div className={styles.inputAns}>
                      <label>05-01-2025</label>
                      <label>05-01-2025</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {NewTableComp ? (
            NewTableComp
          ) : (
            <TableComponent
              tableHeaders={headers}
              tableData={tableData}
              showPagination={showPagination}
            />
          )}
        </div>
      </CustomModal>
    </div>
  )
}

export default DownloadReportComp
