import React, { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import styles from './ViewPOBased.module.scss'
import TableComponent from 'components/Common/TableComponent'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { HeaderBar } from 'components/Common/HeaderBar'
import { NormalButton } from 'components/Common/NormalButton'
import { connect } from 'react-redux'
import { ADMIN_USER_TYPE, BUSINESS_USER_TYPE, VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { useTranslation } from 'react-i18next'
import { getPOInvoiceDetails } from 'api/POBased'
import dayjs from 'dayjs'
import SuccessPopup from 'components/Common/SuccessPopup'
import utc from 'dayjs/plugin/utc'
import { PageLoader } from 'components/Common/PageLoader'
import DetailItem from 'components/Common/DetailItemCard'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
dayjs.extend(utc)

const ViewPOBasedComp = ({ userInfo: { userType } }) => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { t, i18n } = useTranslation([
    'po_based_report',
    'non_po_based_invoices',
    'logistics_invoice',
    'purchase_order',
    'sidebar',
    'po_based_invoices',
    'advance_payment',
    'non_po_based_report'
  ])
  const isArabic = i18n.language === 'ar'
  const [emailSuccessPopup, setEmailSuccessPopup] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [totalValues, setTotalValues] = useState({
    netValue: 0,
    taxValue: 0,
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const invoiceNumber = searchParams.get('id') || id
  const isDraft = invoiceData?.status?.Status_classification === 'Draft'

const getAttachmentLabelWithTranslation = (value, t) => {
  switch (value) {
    case 'invoice':
      return t('non_po_based_invoices:invoice');
    case 'delivery note':
      return t('non_po_based_invoices:delivery_note');
    case 'shipping documents':
      return t('non_po_based_invoices:shipping_documents');
    case 'others':
      return t('non_po_based_invoices:others');
    default:
      return value;
  }
};

const translatedOptions = attachmentTypeOptions?.map(option => ({
  label: getAttachmentLabelWithTranslation(option?.value, t),
  value: option?.value
}));

  // Fetch invoice details on mount
  useEffect(() => {
    if (invoiceNumber) {
      fetchInvoiceById()
    }
  }, [invoiceNumber])

  const fetchInvoiceById = () => {
    setLoading(true)
    const query = {
      id: invoiceNumber
    }
    getPOInvoiceDetails(query)
      .then((res) => {
        setInvoiceData(res?.data?.data);
        const userData = res?.data?.data;
        const invAmt = Number(userData?.InvAmt - userData?.Tax_amount) || 0
        // setNetValue(invAmt)
        const taxAmt = Number(userData?.Tax_amount) || 0
        // setValue('InvAmt', Number(invAmt).toFixed(2))
        // setValue('tax_amount', Number(taxAmt).toFixed(2))
        setTotalValues({
          netValue: invAmt,
          taxValue: taxAmt,
          total: invAmt + taxAmt
        })
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const handleEdit = () => {
    navigate(`/${userType}/invoice-processing/po-based/1?id=${invoiceNumber}`, {
      state: { userData: invoiceData, isEdit: true }
    })
  }

  const headers = [
    // { key: 'lineItemNo', label: t('po_based_invoices:lineItemNumber.text') },
    { key: 'poLineItemNo', label: `${t('po_based_invoices:poLineItemNo')}` },
    { key: 'poNo', label: `${t('po_based_invoices:poNo')}` },
    { key: 'materialCode', label: t('materialCode.text') },
    { key: 'materialDescription', label: t('materialDescription.text') },
    { key: 'uom', label: t('uom.text') },
    { key: 'poQuantity', label: t('po_based_invoices:poQuantity.text') },
    { key: 'grQuantity', label: t('po_based_invoices:grQuantity.text') },
    { key: 'irQuantity', label: t('irQuantity.text') },
    { key: 'lineItemValue', label: t('lineItemValue.text') },
    { key: 'taxLineItem', label: t('po_based_invoices:taxLineItem.text') }
  ]

  const formattedTableData =
    invoiceData?.invoicedetails?.map((item) => ({
      poLineItemNo: item?.POLnNo || '--',
      poNo: item?.PONo || '--',
      materialCode: item?.Material_Code || '--',
      materialDescription: item?.Material_Description || '--',
      uom: item?.Unit_of_measure || '--',
      poQuantity:  item?.PO_Qty !== undefined && item?.PO_Qty !== null
        ? Number(item.PO_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
        : '0',
      grQuantity: item?.GR_Qty !== undefined && item?.GR_Qty !== null
        ? Number(item.GR_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
        : '0',
      irQuantity:  item?.Inv_Qty !== undefined && item?.Inv_Qty !== null
        ? Number(item.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
        : '0',
      lineItemValue: item?.UnitPrice || 0,
      taxLineItem: item?.Tax_Amt || 0
    })) || []

  if (loading) {
    return <LeftPageContainer> <div className="no-data-container-view">
      <PageLoader />

    </div> </LeftPageContainer>
  }

  if (error) {
    return <LeftPageContainer>{error}</LeftPageContainer>
  }

  return (
    <LeftPageContainer>
      {emailSuccessPopup && (
        <SuccessPopup
          open={emailSuccessPopup}
          successMsg={t('popup:emailReportSuccess')}
          onClose={() => setEmailSuccessPopup(false)}
        />
      )}
      {/* Header */}
      <div className={styles.poContainer}>
        <HeaderBar
          title={`${t('purchase_order:invoiceDetails')} - ${invoiceData?.InvNo}`}
          slug={`${t('sidebar:home')}  / ${t('sidebar:invoiceProcessing')} / ${t(
            'sidebar:poBased'
          )} / ${t('purchase_order:invoiceDetails')}`}
          statusTag={invoiceData?.status?.ID ? invoiceData?.status?.Status_classification : ' '}>
          {(userType === VENDOR_USER_TYPE || userType === ADMIN_USER_TYPE) && (
            <>
              <div>
                {isDraft && (
                  <NormalButton label={t('advance_payment:edit')} isPrimary customClass="px-3" onClick={handleEdit} />
                )}
              </div>
            </>
          )}
        </HeaderBar>
      </div>

      {/* User Input Section */}
      <div className={styles.userInputContainer}>
        <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
          <div className={styles.userInputContainerInner}>
            <div className={styles.inputAns}>
              {userType === ADMIN_USER_TYPE || userType === BUSINESS_USER_TYPE ? <>
                <DetailItem label={`${t('advance_payment:vendorCode')}`} value={invoiceData?.vendorDetails?.Vendor_SAP_Code || '--'} />
                <DetailItem label={`${t('advance_payment:vendorName')}`} customClass={styles.valueWidth} value={invoiceData?.vendorDetails?.Vendor_Name_EN || '--'} valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}  />
              </> : ''}
              <DetailItem label={`${t('vendorInvoiceNumber.text')}`} value={invoiceData?.InvNo || '--'} />
              {/* <DetailItem label={`${t('logistics_invoice:invoiceRefNo')}`} value={invoiceData?.Invoice_acc_doc_number || 'N/A  '} /> */}
              <DetailItem label={t('po_based_invoices:submittedDate.text')} value={invoiceData?.Submitted_Date
                ? dayjs.utc(invoiceData?.CreatedDt).format('DD/MM/YYYY')
                : '--'} />
              <DetailItem label={`${t('invoiceDate.text')}`} value={invoiceData?.InvDt ? dayjs.utc(invoiceData?.InvDt).format('DD/MM/YYYY') : '--'} />
              <DetailItem label={`${t('poNumber.text')}`} value={invoiceData?.totalPoNo?.join(", ") || '--' } valueStyle={{direction: isArabic ? "ltr" : ""}}/>
            </div>

          </div>
        </div>
         <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-4`}>
          <div className={styles.userInputContainerInner}>
            <div className={styles.inputAns}>
              <DetailItem label={t('invoiceAccDocumentNumber.text')} value={invoiceData?.Invoice_acc_doc_number || '--'} />
              {!isDraft && <DetailItem label={`${t('invoicePostingDate.text')}`} value={
                invoiceData?.Posting_Date
                  ? dayjs.utc(invoiceData?.Posting_Date).format('DD/MM/YYYY')
                  : '--'
              } />}
              <DetailItem label={`${t('currency.text')}`} value={invoiceData?.InvCurr || '--'} />
              <DetailItem label={`${t('non_po_based_report:paymentStatus.text')}`} value={invoiceData?.Payment_Status || '--'} />
              <DetailItem label={`${t('non_po_based_report:createdBy.text')}`} value={invoiceData?.created_person?.Name || '--'} />
            </div>

          </div>
        </div>
        <div className={`col-4`}>
          <div className={styles.userInputContainerInner}>
            <div className={styles.inputAns}>
              <DetailItem label={`${t('non_po_based_invoices:totalInvoiceAmount.text')}`} value={
                invoiceData?.InvAmt && invoiceData?.Tax_amount
                  ? (Number(invoiceData?.InvAmt) - Number(invoiceData?.Tax_amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : invoiceData?.InvAmt
                    ? Number(invoiceData?.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })
                    : '0.00'
              } />
              <DetailItem label={`${t('non_po_based_invoices:totalTaxAmount.text')}`} value={
                invoiceData?.Tax_amount !== undefined && invoiceData?.Tax_amount !== null
                  ? Number(invoiceData?.Tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })
                  : '0.00'
              } />
              <DetailItem customClass={styles.valueWidth} label={`${t('non_po_based_invoices:paymentTerms.text')}`} value={invoiceData?.Payment_Terms || '--'}  valueStyle={{direction: isArabic ? "ltr" : "", textAlign: isArabic ? "end" : ""}}/>
              <DetailItem label={`${t('non_po_based_report:invoiceDueDate.text')}`} value={invoiceData?.Invoice_Due_Date
                ? dayjs.utc(invoiceData?.Invoice_Due_Date).format('DD/MM/YYYY')
                : '--'} />
              <DetailItem label={`${t('po_based_invoices:paymentAdvice')}`} value={invoiceData?.Payment_Advice || '--'} />
            </div>
          </div>

        </div>
      </div>
      <div className={`${styles.attachmentContainer}`}>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:SNo')}</label>
          {invoiceData?.upload_files?.map((item, index) => (
            <label>{index + 1}</label>
          ))}
        </div>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:AttachmentType')}</label>
          {invoiceData?.upload_files?.length > 0 ? (
            invoiceData.upload_files.map((file, index) => (
              // <label key={index}>
              //   {file.Attachment_type?.charAt(0).toUpperCase() + file.Attachment_type?.slice(1)}
              // </label>
               <label key={index}>
      {translatedOptions.find(opt => opt.value === file.Attachment_type)?.label || file.Attachment_type}
    </label>
            ))
          ) : (
            <label>--</label>
          )}
        </div>

        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:DocumentName')}</label>
          {invoiceData?.upload_files?.length > 0 ? (
            invoiceData.upload_files.map((file, index) => {
              const splitName = file.Upload_files?.split('/').pop()
              const fileName = file?.File_name?.trim() ? file.File_name : splitName;
              return (
                <label key={index}>
                <a key={index} href={file?.Upload_files} target="_blank" rel="noopener noreferrer">
                  <p className={`cursor-pointer fileLink`} style={{direction: isArabic ? "ltr" : ""}}>{fileName || '--'}</p>
                </a>
                </label>
              )
            })
          ) : (
            <label>--</label>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white table-border overflow-hidden rounded-lg">
        <TableComponent width={'150%'} tableHeaders={headers} tableData={formattedTableData} showTotalData={true} totalData={totalValues} />
      </div>
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

const mapDispatchToProps = {}

export default connect(mapStateToProps, mapDispatchToProps)(ViewPOBasedComp)
