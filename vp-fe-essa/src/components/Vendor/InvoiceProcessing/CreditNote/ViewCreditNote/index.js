import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './ViewPOBased.module.scss'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import DownloadReportComp from 'components/Vendor/DownloadReportModal'
import { HeaderBar } from 'components/Common/HeaderBar'
import { connect } from 'react-redux'
import { VENDOR_PORTAL, VENDOR_USER_TYPE } from 'constants/userType'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { getCreditNoteById, exportCreditNotes, getExportInvById } from 'api/CreditNote'
import EmailReportComp from 'components/Vendor/EmailReport'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { invoiceDetailsById } from 'api/POBased'
import { PageLoader } from 'components/Common/PageLoader'
import { formatUSDNumber, getEntityId } from 'services/utilities'
import useTableFeatures from 'hooks/useTableFeatures'
import CreditNoteViewPDF from 'components/PDF/CreditNoteViewPDF'
import { useTranslation } from 'react-i18next'
import { NormalButton } from 'components/Common'
import DetailItems from 'components/Common/DetailItemCard'
dayjs.extend(utc)
const ViewCreditNoteListComp = ({ userInfo: { userType } }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [downloadReport, setDownloadReport] = useState(false)
  const { t, i18n } = useTranslation(['credit_notes', 'sidebar', 'non_po_based_report', 'po_based_invoices', 'advance_payment'])
  const isArabic = i18n.language === 'ar'
  const [emailReportState, setEmailReportState] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creditNoteData, setCreditNoteData] = useState(null)
  const [tableData, setTableData] = useState([])
  const [emailReportDateRange, setEmailReportDateRange] = useState([dayjs().startOf('month'), dayjs()])

  // Fetch credit note details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const query = {
          entity_id: getEntityId(),
          id: id
        }
        const detailsRes = await getCreditNoteById(query)
        if (!detailsRes?.data?.data) {
          throw new Error(t('creditNoteNotFound'))
        }
        getCreditNoteDetailsTable(detailsRes?.data?.data?.Inv_id_List, detailsRes?.data?.data?.Inv_Type)
        setCreditNoteData(detailsRes.data.data)
      } catch (error) {
        toast.error(error.response?.data?.message || t('failedToLoadCreditNoteDetails'))
        console.error('API Error:', error)
        // navigate(-1)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, navigate])
  const {
    page,
    rowsPerPage,
    search,
    order, orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps,
  } = useTableFeatures();
  const handleDownload = async () => {
    try {
      setLoading(true)
      const response = await exportCreditNotes({
        credit_note_id: id,
        entity_id: getEntityId(),
        format: 'pdf'
      })
      downloadFile(response.data, `credit-note-${creditNoteData.credit_invoice_reference}.pdf`)
    } catch (error) {
      toast.error(error.response?.data?.message || t('failedToExportCreditNote'))
      console.error('Export Error:', error)
    } finally {
      setLoading(false)
      setDownloadReport(false)
    }
  }

  useEffect(() => {
    if (creditNoteData) {

      getCreditNoteDetailsTable(creditNoteData?.Inv_id_List, creditNoteData?.Inv_Type)
    }
  }, [page, rowsPerPage, order, orderBy])

  const getCreditNoteDetailsTable = (invNo, invType) => {
    setLoader(true);
    const invNoArray = invNo
      .replace(/[\[\]\s]/g, '')
      .split(',')
      .map(item => item.trim());
    const body = {
      InvNo: invNoArray,
      category: invType === "po" ? 1 : 2,
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }
    invoiceDetailsById(body).then((res) => {
      setTableData(res?.data?.data?.result?.results || []);
      setPageMeta(res?.data?.data?.result?.pageMeta);
    }).finally(() => {
      setLoader(false);
    })
  }
  const handleEmailReport = async (email) => {
    try {
      setLoading(true)
      await getExportInvById({
        credit_note_id: id,
        entity_id: getEntityId(),
        startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
        endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
        // email,
        format: 'pdf'
      })
      toast.success(t('creditNoteReportEmailedSuccessfully'))
      setEmailReportState(false)
    } catch (error) {
      toast.error(error.response?.data?.message || t('failedToEmailReport'))
      console.error('Email Error:', error)
    } finally {
      setLoading(false)
    }
  }
  const handleCloseDownload = () => {
    setDownloadReport(false)
  }
  const handleCsvDownload = () => {
    const query = {
      startDate: emailReportDateRange[0].format('YYYY-MM-DD'),
      endDate: emailReportDateRange[1].format('YYYY-MM-DD'),
      entity_id: getEntityId(),
      category: 4,
      mode: "report",
      format: "csv"
    }

    getExportInvById(query)
      .then((res) => {
        downloadFile(res.data, `credit_note.csv`)
        handleCloseDownload();
      })
      .catch((err) => {
        console.error(err)
      })
  }
  // Format table data
  const formattedTableData = tableData?.map((item) => ({
    ...item,
    date: item?.InvDt ? dayjs(item.InvDt).utc().format('DD/MM/YYYY') : "",
    invoiceValue: item.InvAmt ? formatUSDNumber(item?.InvAmt) : "",
    status: item?.status?.Status_classification,
    currency: item?.InvCurr,
    invoiceNo: item?.InvNo,
    taxValue: item?.Tax_amount ? formatUSDNumber(item?.Tax_amount) : ""
  }))

  const handleEdit = () => {
    navigate(`/${userType}/invoice-processing/credit-note/edit/${creditNoteData?.ID}`, { state: { userData: creditNoteData, editMode: true } })
  }

  const handleRedirectUrl = (row) => {
    if (creditNoteData?.Inv_Type === "po") {
      navigate(`/${userType}/invoice-processing/po-based-invoice/view/?id=${row?.ID}`)
    } else {
      navigate(`/${userType}/invoice-processing/non-po-based-invoice/view?no=${row?.ID}`)
    }
  }

  const tableHeaders = [
    { key: 'invoiceNo', label: t('invoiceNum'), sortable: true, sortKey: "InvNo" },
    { key: 'date', label: t("po_based_invoices:date"), sortable: true, sortKey: "InvDt" },
    { key: 'currency', label: t("currency.text"), sortable: true, sortKey: "InvCurr" },
    { key: 'invoiceValue', label: t("po_based_invoices:invoiceValue"), sortable: true, sortKey: "InvAmt" },
    { key: 'taxValue', label: t('non_po_based_report:taxValue.text'), sortable: true, sortKey: "Tax_amount" }
  ]
  const headerLabels = tableHeaders.map(h => h.label)

  if (loading && !creditNoteData) {
    return (
      <LeftPageContainer>
        <div className='no-data-container-view'>
          <PageLoader />
        </div>
      </LeftPageContainer>
    )
  }

  if (!creditNoteData) {
    return (
      <LeftPageContainer>
        <div className={styles.error}>Credit note not found</div>
      </LeftPageContainer>
    )
  }

   const documentSection = (
      <div className={styles.attachmentFinContainer}>
        <div className={`${styles.attachmentFinRow} ${styles.header}`}>
          <label className="fw-semibold">{t("srNo")}</label>
          <label className="fw-semibold">{t("po_based_invoices:attachment_type.text")}</label>
          <label className="fw-semibold">{t("po_based_invoices:documentName")}</label>
        </div>
  
        {creditNoteData?.upload_files?.length > 0 ? (
          creditNoteData.upload_files.map((file, index) => {
            const splitName = file.Upload_files?.split('/').pop();
            const fileName = file?.File_name?.trim() ? file.File_name : splitName;
            return (
              <div key={index} className={styles.attachmentFinRow}>
                <label>{index + 1}</label>
                <label>{file?.Attachment_type || "Document"}</label>
                <a
                  href={file.Upload_files}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={` text-decoration-none cursor-pointer`}
                >
                  {fileName || 'N/A'}
                </a>
              </div>
            );
          })
        ) : (
          <div className={styles.attachmentFinRow}>
            <label>1</label>
            <label>N/A</label>
            <label>N/A</label>
          </div>
        )}
      </div>
    );

  return (
    <LeftPageContainer>
      {/* Header */}
      <div className={styles.poContainer}>
        <HeaderBar
          title={`${t("creditNoteText")} - ${creditNoteData.InvNo}`}
          slug={`${t("home")} / ${t("invoiceProcessing")} / ${t("creditNoteText")} / ${creditNoteData.InvNo}`}
          statusTag={creditNoteData?.status?.ID ? creditNoteData?.status?.Status_classification : ' '}>

          {
            creditNoteData?.status?.ID === 77 && <NormalButton isPrimary customClass="px-3" label={t('advance_payment:edit')} onClick={() => { handleEdit() }} />
          }
        </HeaderBar>
      </div>

      {/* User Type Specific Views */}
      <div className={styles.userInputContainer}>
        <div className={`${isArabic ? styles.verticalDividerArabic : styles.verticalDivider} col-6`}>
          <div className={styles.userInputContainerInner} style={{gap: isArabic ? '30px' : '0px'}}>
            <div className={styles.inputAns}>
              {userType !== VENDOR_USER_TYPE && 
              <DetailItems label={t('po_based_invoices:POInvoiceVendorName.text')} value={creditNoteData?.vendorDetails?.Vendor_Name_EN || '--'} />
              }
              {userType !== VENDOR_USER_TYPE && 
              <DetailItems label={t('po_based_invoices:POInvoiceVendorCode.text')} value={creditNoteData?.vendorDetails?.Vendor_SAP_Code || '--'} />
              }
              <DetailItems label={t('creditNoteReference.text')} value={creditNoteData.InvNo || '--'} />
              <DetailItems label={t("invoiceText")} value={creditNoteData?.Inv_Type === "po" ? "PO Based Invoice" : "Non PO Based Invoice" } />
              <DetailItems label={creditNoteData?.Inv_Type === "non_po" ? t("nonPoBasedInvoiceHeader.text") : t("poBasedInvoiceHeader.text")} value={creditNoteData?.Inv_id_List ? creditNoteData.Inv_id_List.slice(1, -1) : "--"} />
            </div>
          </div>
        </div>
        <div className={` col-6`}>
          <div className={styles.userInputContainerInner} style={{paddingRight : isArabic ? '20px' : '0px', gap: isArabic ? '30px' : '0px'}}>
            <div className={styles.inputAns}>
              <DetailItems label={t("submissionDate.text")} value={creditNoteData?.Submitted_Date ? dayjs(creditNoteData.Submitted_Date).utc().format('DD/MM/YYYY') : '--'} />
              <DetailItems label={t("currency.text")} value={creditNoteData.InvCurr || '--'} />
              <DetailItems label={t("creditNoteAmount.text")} value={
                creditNoteData?.InvAmt !== undefined && creditNoteData?.InvAmt !== null && !isNaN(creditNoteData?.InvAmt)
                  ? Number(creditNoteData.InvAmt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0.00'} />
            </div>
          </div>
        </div>
      </div>

        {/* {documentSection} */}

         <div className={`${styles.attachmentContainer}`}>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:SNo')}</label>
          {creditNoteData?.upload_files?.map((item, index) => (
            <label>{index + 1}</label>
          ))}
        </div>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:AttachmentType')}</label>
          {creditNoteData?.upload_files?.length > 0 ? (
            creditNoteData.upload_files.map((file, index) => (
              <label key={index}>
                {file.Attachment_type?.charAt(0).toUpperCase() + file.Attachment_type?.slice(1)}
              </label>
            ))
          ) : (
            <label>--</label>
          )}
        </div>

        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:DocumentName')}</label>
          {creditNoteData?.upload_files?.length > 0 ? (
            creditNoteData.upload_files.map((file, index) => {
              const splitName = file.Upload_files?.split('/').pop()
              const fileName = file?.File_name?.trim() ? file.File_name : splitName;
              return (
                <label key={index}>
                <a key={index} href={file?.Upload_files} target="_blank" rel="noopener noreferrer">
                  <p className={`cursor-pointer fileLink`}>{fileName || '--'}</p>
                </a>
                </label>
              )
            })
          ) : (
            <label>--</label>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white table-border overflow-hidden rounded-lg mt-4">
        <TableLayout
          tableHeaders={tableHeaders}
          tableData={formattedTableData}
          handleRedirectUrl={handleRedirectUrl}
          {...tableProps}

          emptyMessage={t('noLineItemsFound')}
        />
      </div>

      {/* Modals */}
      <DownloadReportComp
        open={downloadReport}
        onClose={() => setDownloadReport(false)}
        onConfirm={handleDownload}
        onClickSubmit={handleCsvDownload}
        title={`credit-note-${creditNoteData.credit_invoice_reference}.pdf`}
        loading={loading}
        pdfComponent={<CreditNoteViewPDF data={tableData} headerLabels={headerLabels} />}
        NewTableComp={<TableLayout
          tableHeaders={tableHeaders}
          tableData={formattedTableData}
          {...tableProps}
          loading={loading}
          emptyMessage={t('noLineItemsFound')}
        />}
      />

      <EmailReportComp
        open={emailReportState}
        onClose={() => setEmailReportState(false)}
        onSend={handleEmailReport}
        value={emailReportDateRange}
        setValue={setEmailReportDateRange}
        defaultEmail={creditNoteData.vendor_email}
        loading={loading}
      />
    </LeftPageContainer>
  )
}

// Helper components
const DetailItem = ({ label, value }) => (
  <div className={styles.detailItem}>
    <span className={styles.detailLabel}>{label}</span>
    <span className={styles.detailValue}>{value || 'N/A'}</span>
  </div>
)

const AttachmentItem = ({ index, type, name, url }) => (
  <div className={styles.attachmentItem}>
    <span className={styles.attachmentIndex}>{index}.</span>
    <span className={styles.attachmentType}>{type}</span>
    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
      {name || 'View File'}
    </a>
  </div>
)

// File download helper
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo
})

export default connect(mapStateToProps)(ViewCreditNoteListComp)
