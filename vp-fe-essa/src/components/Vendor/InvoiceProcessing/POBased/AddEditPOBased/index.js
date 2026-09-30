import React, { useEffect, useState } from 'react'
import styles from './AddEditPOBased.module.scss'
import 'assets/scss/createInvoice.scss'
import { NormalButton } from 'components/Common/NormalButton'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import nextIcon from '../../../../../assets/icons/nextIconWhite.svg'
import saveIcon from '../../../../../assets/icons/saveIconWhite.svg'
import TableComponent from 'components/Common/TableComponent'
import FileUploadInput from 'components/Common/FileUploadInput'
import { InvoicePreviewPO } from '../InvoicePreview'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import SuccessPopup from 'components/Common/SuccessPopup'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import DateRangePicker from 'components/Common/DateRangePicker1'
import { useTranslation } from 'react-i18next'
import { createPOInvoice, populatePOInvoice, poInvoiceUpdate } from 'api/POBased'
import { FAQS, INVOICE_PO_BASED } from 'constants/url'
import AppTooltip from 'components/Common/AppTooltip'
import { deleteIcon, editInputIcon, uploadAddIcon } from 'constants/imageConstants'
import dayjs from 'dayjs'
import { attachmentTypeOptions } from 'services/helpers/constants/common'
import { getEntityId } from 'services/utilities'
import { formatDecimalInput, handleDecimalKeyDown } from 'services/helperFunctions'
import { fileUpload, deleteFiles } from 'api/FileUpload'
import { PageLoader } from 'components/Common/PageLoader'
import useTableFeatures from 'hooks/useTableFeatures'
import { showToast } from '../../../../../redux/actions/toastActions'
import { connect, useSelector } from 'react-redux'
import { ADMIN_USER_TYPE, VENDOR_USER_TYPE } from 'constants/userType'
import { toast } from 'react-toastify'
import CustomModal from 'components/Common/Modal'
import { Validator } from 'services/validation/formValidations'
import { fetchVendorNameOrCode } from 'api/UserRegister'
import { TooltipWrapper } from 'components/Common/TooltipWrapper'
import { setDashboardData } from 'redux/actions/dashboardAction'
import SVGIcon from 'components/Common/SVGIcon'

const AddEditPOBasedComp = ({
  setDashboardData,
  userInfo: { userType, isPoInline, taxPercentage },
  showToast
}) => {
  const {
    register,
    formState: { errors },
    control,
    getValues,
    handleSubmit,
    setValue,
    setError,
    watch,
    clearErrors
  } = useForm({
    defaultValues: {
      tax_percentage: taxPercentage
      // attachment_type: 'invoice'
    }
  })
  // const isPoInline = false
  const { order, orderBy, setLoader } = useTableFeatures()
  const location = useLocation()
  const userData = location?.state?.userData
  const poNumbers = location?.state?.poNumbers
  const navigate = useNavigate()
  const { editMode } = useParams()
  const { t, i18n } = useTranslation([
    'po_based_invoices',
    'non_po_based_invoices',
    'non_po_based_report',
    'purchase_order',
    'sidebar',
    'logistics_invoice',
    'general_details_comp',
    'popup',
    'advance_payment',
    'toast',
    'soa'
  ])
  const isArabic = i18n.language === 'ar'
  const searchParams = new URLSearchParams(location.search)
  const invoiceNumber = searchParams.get('id')

  const selectedTax = watch('tax_percentage')
  const [nextClick, setNextClick] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [btnLoader, setBtnLoader] = useState({
    file: false,
    save: false,
    submit: false
  })
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [saved, setSaved] = useState(false)
  const [invoiceList, setInvoiceList] = useState([])
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [selectedRows, setSelectedRows] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [editInvAmt, setEditInvAmt] = useState(false)
  const [editTaxAmt, setEditTaxAmt] = useState(false)
  const [currentAttachment, setCurrentAttachment] = useState({
    type: '',
    file: null
  })
  const [taxPercentageTouched, setTexPercentageTouched] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState(null)
  const [netValue, setNetValue] = useState(0)
  const [enteredQuantities, setEnteredQuantities] = useState({})

  // Add new state for PoInline calculated totals
  const [poInlineTotals, setPoInlineTotals] = useState({
    invoice: 0,
    tax: 0,
    total: 0
  })

  // *** NEW: Add state to track manual InvAmt edit ***
  const [isInvAmtManuallyEdited, setIsInvAmtManuallyEdited] = useState(false)

  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const [totalValues, setTotalValues] = useState({
    netValue: 0,
    taxValue: 0,
    total: 0
  })
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )

  const getAttachmentLabelWithTranslation = (value, t) => {
    switch (value) {
      case 'invoice':
        return t('non_po_based_invoices:invoice')
      case 'delivery note':
        return t('non_po_based_invoices:delivery_note')
      case 'shipping documents':
        return t('non_po_based_invoices:shipping_documents')
      case 'others':
        return t('non_po_based_invoices:others')
      default:
        return value
    }
  }

  const translatedOptions = attachmentTypeOptions?.map((option) => ({
    label: getAttachmentLabelWithTranslation(option?.value, t),
    value: option?.value
  }))

  useEffect(() => {
    if (isEdit && userData) {
      const poNumber = userData?.invoicedetails?.[0]?.PONo
      setValue('vendor_invoice_number', userData?.InvNo || '')
      setValue('selectedDate', dayjs(userData?.InvDt).utc().format('DD/MM/YYYY') || '')
      setSelectedDate(dayjs(userData?.InvDt).utc() || dayjs())
      setValue('selectedPoNo', poNumber || '')
      setValue('InvCurr', userData?.InvCurr || '')
      setValue('tax_percentage', userData?.Tax_percentage)
      const invAmt = Number(userData?.InvAmt - userData?.Tax_amount) || 0
      setNetValue(invAmt)
      const taxAmt = Number(userData?.Tax_amount) || 0
      setValue('InvAmt', Number(invAmt).toFixed(2))
      setValue('tax_amount', Number(taxAmt).toFixed(2), {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      })
      setTotalValues({
        netValue: invAmt,
        taxValue: taxAmt,
        total: invAmt + taxAmt
      })
      setValue('Payment_Terms', userData?.Payment_Terms || '')
      //setValue('lineItemNo',userData?.invoicedetails?.POLnNo || 'N/A')
      if (userType !== VENDOR_USER_TYPE) {
        setValue('vendor_name', userData?.vendorDetails?.Vendor_Name_EN || '')
        //setValue('vendor_code', userData?.vendorDetails?.Vendor_SAP_Code || '')
      }
      if (userData?.invoicedetails) {
        setInvoiceList(userData?.invoicedetails)
        // If isEdit and isPoInline, select all rows and recalculate PoInline totals
        if (isPoInline) {
          const allRowIds = userData.invoicedetails.map((item) => item.POLnNo)
          setSelectedRows(allRowIds)
          // Set enteredQuantities from Enter_Qty for each row if present
          const eq = {}
          userData.invoicedetails.forEach((item) => {
            if (item.Enter_Qty !== undefined && item.Enter_Qty !== null) {
              eq[item.POLnNo] = item.Enter_Qty
            }
          })
          setEnteredQuantities(eq)
        }
      }
      if (userData?.upload_files) {
        const files = userData.upload_files.map((file, index) => ({
          id: file.ID || index + 1,
          attachment_type: file.Attachment_type,
          document_name: file.Upload_files.split('/').pop() || `Document ${index + 1}`,
          file_url: file.Upload_files,
          file_type: file.Attachment_type
        }))
        setUploadedFiles(files)
      }
    }
  }, [userData, setValue, isEdit, isPoInline])

  useEffect(() => {
    const vendorCode = vendorCodeOptions?.find((opt) => opt.value === userData?.vendorDetails?.ID)
    if (vendorCode) {
      setValue('vendor_code', vendorCode.value || '')
    }
  }, [invoiceNumber, vendorCodeOptions, userData])

  useEffect(() => {
    if (location.state?.isEdit !== undefined) {
      setIsEdit(location.state.isEdit)
    }
  }, [location.state])

  // *** REMOVED: Old useEffect that recalculated on taxPercentageTouched ***
  // This was causing the issue - it recalculated InvAmt on tax change

  useEffect(() => {
    setIsEdit(editMode === '1')
  }, [editMode])
  const taxPercentageforTaxAmt = watch('tax_percentage')

  const [delayedTaxPercentage, setDelayedTaxPercentage] = useState(taxPercentageforTaxAmt)

  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     setDelayedTaxPercentage(taxPercentage);
  //   }, 100);

  //   return () => clearTimeout(timeout);
  // }, [taxPercentage]);

  useEffect(() => {
    if (!isEdit && poNumbers) {
      fetchInvoiceList()
    }
  }, [isEdit, poNumbers, order, orderBy])

  useEffect(() => {
    if (userType !== VENDOR_USER_TYPE) {
      fetchDropdownData()
    }
  }, [userType])

  const fetchDropdownData = () => {
    let query = {
      entity_id: getEntityId()
    }
    Promise.all([fetchVendorNameOrCode(query)])
      .then(([vendorCodeRes]) => {
        const vendorCodeOptions = vendorCodeRes?.data?.data?.map((item) => ({
          label: item?.Vendor_SAP_Code,
          value: item?.ID,
          vendorName: item?.Vendor_Name_EN
        }))
        setVendorCodeOptions(vendorCodeOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const fetchInvoiceList = () => {
    setLoader(true)
    const query = {
      sort: order,
      sort_column: orderBy
    }
    const body = {
      PONo: poNumbers
    }
    populatePOInvoice(body, query)
      .then((res) => {
        setInvoiceList(res?.data?.data?.list || [])

        const data = res?.data?.data
        const totalNetValue = res?.data?.data?.totalNetValue?.data || 0
        setNetValue(totalNetValue)
        const taxAmount = (totalNetValue * selectedTax) / 100
        const totalAmount = totalNetValue + taxAmount

        setTotalValues({
          netValue: totalNetValue,
          taxValue: taxAmount,
          total: totalAmount
        })

        setValue('Payment_Terms', `${data?.headersDetails?.Payment_Terms}` || '')
        setValue('InvCurr', data?.headersDetails?.PO_currency || '')
        setValue('InvAmt', totalNetValue.toFixed(2))
        setValue('tax_amount', taxAmount.toFixed(2), {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: false
        })
      })
      .catch((err) => {
        console.error('Error fetching invoice list:', err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const validateInvoiceAmount = () => {
    const invAmtValue = Number(getValues('InvAmt')) || 0
    if (invAmtValue <= 0.0) {
      const message =
        t('non_po_based_invoices:totalInvoiceAmount.zeroError') ||
        'Total Invoice Amount must be greater than 0'

      setError('InvAmt', { type: 'manual', message })
      toast.error(message)
      return false
    }
    clearErrors('InvAmt')
    return true
  }

  const validateTaxPercentageAndTaxAmount = () => {
    const taxPercentage = Number(getValues('tax_percentage')) || 0
    const taxAmount = Number(getValues('tax_amount')) || 0

    if (taxPercentage !== 0 && taxAmount === 0) {
      toast.error('Tax amount required')
      return false
    }

    return true
  }

  const onSubmit = async (data, status = 'draft') => {
    if (!validateInvoiceAmount()) {
      setLoading(false)
      return
    }

    setLoading(true)
    const invoiceDate = selectedDate ? selectedDate.format('YYYY-MM-DD') : ''
    const totalInvAmt = Number(data?.InvAmt) + Number(data?.tax_amount) || 0
    let poDetails
    try {
      if (isPoInline) {
        // Only selected rows
        poDetails = invoiceList
          .filter((item) => selectedRows.includes(item.POLnNo))
          .map((item) => {
            const enteredQty = Number(enteredQuantities[item.POLnNo])
            // If no entered quantity, use GR_Qty as default
            const finalQty =
              enteredQty >= 0 && enteredQty <= Number(item.GR_Qty)
                ? enteredQty
                : Number(item.GR_Qty || 0)
            return {
              ...item,
              GR_Qty: finalQty, // override gr_Qty with entered value or default
              Enter_Qty: finalQty,
              Tax_Amt: selectedTax ? (item?.UnitPrice * selectedTax) / 100 : 0
            }
          })
        if (poDetails.length === 0) {
          toast.error(t('toast:selectAtLeastOneRow'))
          // showToast(t('toast:errorTitle'), t('toast:selectAtLeastOneRow'), 'error')
          setLoader(false)
          return
        }
      } else {
        // All rows
        poDetails = invoiceList.map((item) => ({
          ...item,
          // gr_Qty: 0, // set gr_Qty to 0 if not PoInline
          Tax_Amt: selectedTax ? (item?.UnitPrice * selectedTax) / 100 : 0
        }))
      }
      const body = {
        ...(userType === ADMIN_USER_TYPE && { Vendor_id: data?.vendor_code }),
        Vendor_id: data?.vendor_code,
        CoCd: getEntityId(),
        InvNo: data.vendor_invoice_number,
        InvDt: invoiceDate,
        Payment_Terms: data?.Payment_Terms,
        InvCurr: data?.InvCurr,
        Tax_percentage: data?.tax_percentage || 0,
        InvAmt: totalInvAmt || 0,
        Tax_amount: data?.tax_amount || 0,
        Invoice_Status_Id: status === 'draft' ? 101 : 100,
        PO_Details: poDetails,
        ...(userType === ADMIN_USER_TYPE && { vendor_name: data?.vendor_name })
      }
      body.upload_file = uploadedFiles.map(({ file_url, file_type, document_name }) => ({
        upload_files: file_url,
        attachment_type: file_type,
        originalName: document_name
      }))
      let response
      if (status === 'draft') {
        if (invoiceNumber) {
          response = await poInvoiceUpdate({
            ID: invoiceNumber,
            ...body
          })
        } else {
          response = await createPOInvoice(body, {})
        }
        if (response && response.data && response.data.data) {
          const newInvoiceId = response.data.data.ID
          setShowSuccessPopup(true)
          setSuccessMsg(t('popup:invoiceSavedSuccessfully'))
          setSaved(true)
          if (!invoiceNumber && newInvoiceId) {
            navigate(`${location.pathname}?id=${newInvoiceId}`, {
              replace: true
            })
          }
        }
      }
      if (status === 'submitted') {
        setShowSuccessPopup(false)
        let response
        if (invoiceNumber) {
          response = await poInvoiceUpdate({ ...body, ID: invoiceNumber })
        } else {
          response = await createPOInvoice(body, {})
        }
        if (response && response.data && response.data.data) {
          showToast(t('toast:successTitle'), t('popup:invoiceSubmittedSuccessfully'), 'success')
          navigate(`/${userType}${INVOICE_PO_BASED}`)
        }
      }
    } catch (err) {
      console.error('Error submitting invoice:', err)
      toast.error(`${err?.response?.data?.message || err?.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFile = async () => {
    try {
      // Call the deleteFiles API if the file has an ID (meaning it was previously uploaded)
      if (fileToDelete?.id && typeof fileToDelete.id === 'number') {
        await deleteFiles({
          id: fileToDelete.id,
          url: fileToDelete.file_url
        })
      }
      // Update the local state
      const updated = uploadedFiles.filter((file) => file.id !== fileToDelete?.id)
      setUploadedFiles(updated)
      setFileToDelete(null)
      setIsModalOpen(false)
      showToast(t('toast:successTitle'), t('toast:fileDeleted'), 'success')
    } catch (error) {
      console.error('Error deleting file:', error)
      toast.error(t('toast:fileDeleteFailed'))
    }
  }

  const handleFileUpload = async (e) => {
    setBtnLoader((prev) => ({ ...prev, file: true }))
    e.preventDefault()
    const { file, type } = currentAttachment

    if (!file || !type) {
      toast.error(t('toast:attachTypeAndFileRequired'))
      setBtnLoader((prev) => ({ ...prev, file: false }))
      return
    }

    const filesArray = Array.isArray(file) ? file : [file]
    const typeCount = uploadedFiles.filter((f) => f.attachment_type === type).length
    if (typeCount + filesArray.length > 2) {
      const typeLabel = getAttachmentLabelWithTranslation(type, t)
      toast.error(t('toast:onlyTwoFilesPerType', { type: typeLabel }))
      setBtnLoader((prev) => ({ ...prev, file: false }))
      return
    }

    const vendorCode = uploadVendorCode
    const selectedVendorId = getValues('vendor_code')
    const selectedVendor = vendorCodeOptions.find((v) => v.value === selectedVendorId)
    const adminVendorCode = selectedVendor?.label || ''

    const vendorCodeUpload = userType === VENDOR_USER_TYPE ? vendorCode : adminVendorCode
    const module = 'PO BASED' // static value
    const attachmentType = type

    let newFiles = []
    try {
      for (let i = 0; i < filesArray.length; i++) {
        const singleFile = filesArray[i]
        const fd = new FormData()
        fd.append('image', singleFile)
        fd.append('vendor_code', vendorCodeUpload)
        fd.append('module', module)
        fd.append('attachment_type', attachmentType)

        const res = await fileUpload(fd)
        const url = res.data?.data?.url
        newFiles.push({
          id: uploadedFiles.length + newFiles.length + 1,
          attachment_type: type,
          document_name: singleFile.name,
          file_url: url,
          file_type: type
        })
      }
      setUploadedFiles([...uploadedFiles, ...newFiles])
      setValue('attachments', '')
      setValue('attachment_type', '')
      setCurrentAttachment({ type: '', file: null })
      clearErrors('attachments')
    } catch (err) {
      console.error(err)
    } finally {
      setBtnLoader((prev) => ({ ...prev, file: false }))
    }
  }

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    //.validateNoSymbols()
    .validateMinLength(3)
    .validateMaxLength(16)
    .build()

  const numericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(16)
    .validateOnlyNumbers()
    .build()

  const handleNext = () => {
    if (!validateInvoiceAmount()) {
      return
    }

    if (!validateTaxPercentageAndTaxAmount()) {
      return
    }

    handleSubmit((data) => {
      if (data.attachments?.length && currentAttachment?.file && uploadedFiles.length === 0) {
        setError('attachments', {
          type: 'manual',
          message: t('credit_notes:pleaseUploadSelectedFile')
        })
        return
      }

      setNextClick(true)
    })()
  }

  const handleSave = () => {
    if (!validateInvoiceAmount()) {
      return
    }

    if (!validateTaxPercentageAndTaxAmount()) {
      return
    }
    setNextClick(false)
    handleSubmit((data) => onSubmit(data, 'draft'))()
  }

  const handleSubmitInvoice = () => {
    if (!validateInvoiceAmount()) {
      return
    }

    if (!validateTaxPercentageAndTaxAmount()) {
      return
    }
    handleSubmit((data) => onSubmit(data, 'submitted'))()
    setNextClick(false)
  }

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false)
    setNextClick(true)
  }

  const poOptions =
    isEdit && userData?.invoicedetails?.[0]?.PONo
      ? [
          {
            label: userData.invoicedetails[0].PONo,
            value: userData.invoicedetails[0].PONo
          }
        ]
      : poNumbers?.map((po) => ({ label: po, value: po })) || []

  // Recompute formattedData when invoiceList or selectedTax changes
  const formattedData = React.useMemo(
    () =>
      invoiceList?.map((item) => {
        const id = item?.POLnNo
        return {
          id,
          lineItemNo: item?.POLnNo || '--',
          poNo: item?.PONo || '--',
          poLineItemNo: item?.POLnNo || '--',
          materialCode: item?.Material_Code || '--',
          materialDescription: item?.Material_Description || '--',
          uom: item?.Unit_of_measure || '--',
          poQuantity:
            item?.Qty !== undefined && item?.Qty !== null
              ? Number(item?.Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
              : 0,
          grQuantity:
            item?.GR_Qty !== undefined && item?.GR_Qty !== null
              ? Number(item?.GR_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
              : 0,
          ...(isPoInline
            ? {
                enteredQuantity: (
                  <InputBox
                    name={`enteredQuantity_${id}`}
                    type="number"
                    className="pl-3 border border-gray-300 rounded-md w-full"
                    value={
                      enteredQuantities[id] !== undefined && enteredQuantities[id] !== null
                        ? enteredQuantities[id]
                        : isEdit
                        ? item?.Enter_Qty
                        : Number(item?.GR_Qty) - Number(item?.Inv_Qty) || ''
                    }
                    onChange={(e) => {
                      const value = e.target.value
                      setEnteredQuantities((prev) => ({
                        ...prev,
                        [id]: value
                      }))
                    }}
                    min={1}
                    max={Number(item?.GR_Qty)}
                    error={
                      enteredQuantities[id] !== undefined &&
                      enteredQuantities[id] !== '' &&
                      (Number(enteredQuantities[id]) <= 0 ||
                        Number(enteredQuantities[id]) > Number(item?.GR_Qty))
                        ? t('qtyRangeValidate', { grQty: item?.GR_Qty })
                        : ''
                    }
                  />
                )
              }
            : {}),
          irQuantity:
            item?.Inv_Qty !== undefined && item?.Inv_Qty !== null
              ? Number(item?.Inv_Qty).toLocaleString('en-US', { maximumFractionDigits: 3 })
              : 0,
          lineItemValue:
            item?.UnitPrice !== undefined && item?.UnitPrice !== null && !isNaN(item.UnitPrice)
              ? parseFloat(item.UnitPrice).toFixed(2)
              : '0.00',
          taxLineItem: selectedTax ? ((item?.UnitPrice * selectedTax) / 100).toFixed(2) : '0.00'
        }
      }) || [],
    [invoiceList, selectedTax, taxPercentageTouched, isPoInline, enteredQuantities, selectedRows]
  )

  const totalNetValue = netValue

  const taxAmount = (totalNetValue * selectedTax) / 100
  //headers
  const headers = [
    {
      key: 'poLineItemNo',
      label: t('poLineItemNo'),
      sortable: true,
      sortKey: 'POLnNo'
    },
    { key: 'poNo', label: t('poNo'), sortable: true, sortKey: 'PONo' },

    {
      key: 'materialCode',
      label: t('materialCode.text'),
      sortable: true,
      sortKey: 'Material_Code'
    },
    {
      key: 'materialDescription',
      label: t('materialDescription.text'),
      sortable: true,
      sortKey: 'Material_Description'
    },
    {
      key: 'uom',
      label: t('uom.text'),
      sortable: true,
      sortKey: 'Unit_of_measure'
    },
    {
      key: 'poQuantity',
      label: t('poQuantity.text'),
      sortable: true,
      sortKey: 'Qty'
    },
    {
      key: 'grQuantity',
      label: t('grQuantity.text'),
      sortable: true,
      sortKey: 'GR_Qty'
    },
    ...(isPoInline ? [{ key: 'enteredQuantity', label: t('enterQuantity'), sortable: false }] : []),
    {
      key: 'irQuantity',
      label: t('irQuantity.text'),
      sortable: true,
      sortKey: 'Inv_Qty'
    },
    { key: 'lineItemValue', label: t('lineItemValue.text'), sortable: false }
    // { key: "taxLineItem", label: t("taxLineItem.text"), sortable: false },
  ]

  // *** NEW: Reset manual edit flag when selection or quantities change ***
  useEffect(() => {
    // This effect resets the manual edit flag whenever the user changes row selections or quantities
    // This ensures that when user changes selection, we go back to auto-calculation mode
    setIsInvAmtManuallyEdited(false)
  }, [selectedRows, enteredQuantities])

  // *** UPDATED: Separate effect for row/quantity changes (full recalculation) ***
  useEffect(() => {
    if (isPoInline) {
      let invoice = 0
      invoiceList.forEach((item) => {
        if (selectedRows.includes(item.POLnNo)) {
          let qty
          if (
            enteredQuantities[item.POLnNo] !== undefined &&
            enteredQuantities[item.POLnNo] !== null &&
            enteredQuantities[item.POLnNo] !== ''
          ) {
            qty = Number(enteredQuantities[item.POLnNo])
            if (!(qty > 0 && qty <= Number(item.GR_Qty))) {
              qty = Number(item.GR_Qty) - Number(item.Inv_Qty)
            }
          } else {
            qty = Number(item.GR_Qty) - Number(item.Inv_Qty)
          }
          if (qty > 0) {
            invoice += qty * Number(item.UnitPrice || 0)
          }
        }
      })

      // Calculate tax based on current invoice amount
      const tax = (invoice * Number(selectedTax)) / 100

      setPoInlineTotals({
        invoice,
        tax,
        total: invoice + tax
      })

      // Only update InvAmt if NOT manually edited
      if (!isInvAmtManuallyEdited) {
        setValue('InvAmt', Number(invoice).toFixed(2))
      }
      // Always update tax based on current InvAmt (whether manual or calculated)
      const currentInvAmt = isInvAmtManuallyEdited ? Number(getValues('InvAmt')) : invoice
      const recalculatedTax = (currentInvAmt * Number(selectedTax)) / 100
      setValue('tax_amount', Number(recalculatedTax).toFixed(2), {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      })
    }
  }, [isPoInline, selectedRows, enteredQuantities, invoiceList, setValue, isInvAmtManuallyEdited])

  // *** NEW: Separate effect for tax percentage changes (tax-only recalculation) ***
  useEffect(() => {
    if (isPoInline && selectedTax !== undefined) {
      // When tax changes, recalculate tax based on current InvAmt
      const currentInvAmt = Number(getValues('InvAmt')) || 0
      const recalculatedTax = (currentInvAmt * Number(selectedTax)) / 100

      // Update poInlineTotals with new tax
      setPoInlineTotals((prev) => ({
        ...prev,
        tax: recalculatedTax,
        total: currentInvAmt + recalculatedTax
      }))

      setValue('tax_amount', Number(recalculatedTax).toFixed(2), {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      })
    } else if (!isPoInline && selectedTax !== undefined) {
      // For non-PoInline case
      const currentInvAmt = Number(getValues('InvAmt')) || netValue
      const recalculatedTax = (currentInvAmt * Number(selectedTax)) / 100
      setValue('tax_amount', Number(recalculatedTax).toFixed(2), {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      })

      setTotalValues((prev) => ({
        ...prev,
        taxValue: recalculatedTax,
        total: currentInvAmt + recalculatedTax
      }))
    }
  }, [selectedTax, isPoInline, setValue, getValues, netValue])

  useEffect(() => {
    // This runs after all synchronous code has executed
    const value = watch('tax_percentage')
    setDelayedTaxPercentage(value)
  })

  return (
    <>
      <LeftPageContainer>
        {loading ? (
          <div className="no-data-container-view">
            <PageLoader />
          </div>
        ) : (
          <>
            <div className={styles.poContainer}>
              <label className={styles.homeText}>
                {`${t('sidebar:home')} / ${t('sidebar:invoiceProcessing')} / ${t(
                  'sidebar:poBased'
                )} / ${
                  isEdit
                    ? t('logistics_invoice:editInvoice.text')
                    : t('purchase_order:createInvoice')
                }`}
              </label>
              <div className={styles.subHeader}>
                <div className="cursor-pointer">
                  <SVGIcon
                    name="backArrow"
                    alt="back"
                    onClick={() => navigate(-1)}
                    size={25}
                    className="cursor-pointer"
                  />
                  <h5>
                    {isEdit
                      ? t('logistics_invoice:editInvoice.text')
                      : t('purchase_order:createInvoice')}
                  </h5>
                  {saved && (
                    <div className={`px-2 ${styles.savedPill}`}>{t('purchase_order:saved')}</div>
                  )}
                </div>
                <div>
                  {/* {!isEdit ? ( */}
                  <>
                    <NormalButton
                      label={t('next')}
                      isPrimary
                      type={'button'}
                      customClass="px-3"
                      rightIcon={nextIcon}
                      onClick={handleNext}
                      rightIconClassName={'rtl:rotate-180'}
                    />
                    {!saved && (
                      <NormalButton
                        label={t('save')}
                        isPrimary
                        customClass="px-3"
                        rightIcon={saveIcon}
                        onClick={handleSave}
                        type="button"
                      />
                    )}
                  </>
                  <TooltipWrapper tooltipMessage={t('soa:help')}>
                    <SVGIcon
                      size={25}
                      className="cursor-pointer"
                      name="help"
                      alt="help"
                      onClick={() => navigate(`/${userType}${FAQS}?id=3`)}
                    />
                  </TooltipWrapper>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmitInvoice} type="submit">
              <div className={`${styles.userInputContainer}`}>
                <div style={{ borderInlineEnd: '1px solid #929398' }} className="col-6">
                  {userType !== VENDOR_USER_TYPE && (
                    <>
                      <div className="formGroup">
                        <div className="labelWidth">
                          <label>
                            {t('POInvoiceVendorCode.text')} <span className="required">*</span>{' '}
                            <AppTooltip message={t('POInvoiceVendorCode.tooltip')} />
                          </label>
                        </div>

                        <div style={{ paddingRight: '20px' }}>
                          <Controller
                            name="vendor_code"
                            control={control}
                            rules={{ required: t('POInvoiceVendorCode.error') }}
                            defaultValue=""
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <SelectBox
                                className={`formInput custom-select-box mb-0`}
                                error={error}
                                value={value}
                                onChange={(e) => {
                                  onChange(e.target.value)
                                  const selectedVendor = vendorCodeOptions.find(
                                    (v) => v.value == e.target.value
                                  )
                                  if (selectedVendor) {
                                    setValue('vendor_name', selectedVendor.vendorName || '')
                                  } else {
                                    setValue('vendor_name', '')
                                  }
                                }}
                                options={vendorCodeOptions}
                                placeholder={t('POInvoiceVendorCode.tooltip')}
                              />
                            )}
                          />
                        </div>
                      </div>

                      <div className="formGroup">
                        <div className="labelWidth">
                          <label>
                            {t('POInvoiceVendorName.text')} <span className="required">*</span>{' '}
                            <AppTooltip message={t('POInvoiceVendorName.tooltip')} />
                          </label>
                        </div>
                        <label
                          style={{
                            width: isArabic ? '250px ' : '270px',
                            paddingRight: isArabic ? '20px' : ''
                          }}>
                          <p>{watch('vendor_name')}</p>
                        </label>
                      </div>
                    </>
                  )}
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('vendor_invoice_number.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('vendor_invoice_number.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <InputBox
                        placeholder={t('logistics_invoice:enterReferenceNo')}
                        className={`inputBox mb-0 formInput`}
                        name="vendor_invoice_number"
                        type="text"
                        register={register}
                        rules={{
                          required: t('vendor_invoice_number.error'),
                          maxLength: {
                            value: 16,
                            message: t('toast:invoiceNoLessThan17Char')
                          },
                          validate: (value) =>
                            alphaNumericValidator(t('logistics_invoice:enterReferenceNo'), value)
                        }}
                        error={errors.vendor_invoice_number}
                        clearErrors={clearErrors}
                      />
                    </div>
                  </div>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('invoice_date.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('invoice_date.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <DateRangePicker
                        className={` border-none mb-0 formInput`}
                        value={selectedDate}
                        setValue={setSelectedDate}
                        maxDate={dayjs()}
                        minHeight="45px"
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('poSelection.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('poSelection.text')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      {poOptions.length < 2 ? (
                        <InputBox
                          className={` inputBox mb-0 formInput`}
                          name="selectedPoNo"
                          type="text"
                          value={poOptions[0]?.label || ''}
                          // register={register}
                          readOnly
                        />
                      ) : (
                        <Controller
                          name="selectedPoNo"
                          control={control}
                          // rules={{ required: t('poSelection.error') }}
                          defaultValue=""
                          render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <div className="select-container">
                              <SelectBox
                                className={`formInput custom-select-box mb-0 `}
                                error={error}
                                label={t('poSelection.text')}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                options={poOptions}
                                disableOptions
                                name="selectedPoNo"
                                isRequired
                                placeholder={t('poSelection.text')}
                                height="30px"
                                bgColor="#D3D3D3"
                              />
                            </div>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('currency.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('currency.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <InputBox
                        placeholder="Enter Currency"
                        className={`inputBox mb-0 formInput`}
                        name="InvCurr"
                        type="text"
                        register={register}
                        value={getValues('InvCurr')}
                        //error={errors.InvCurr}
                        disabled={true}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-6 pl-4" style={{ paddingRight: isArabic ? '20px' : '' }}>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('tax_percentage.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('tax_percentage.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <Controller
                        name="tax_percentage"
                        defaultValue=""
                        control={control}
                        rules={{ required: t('tax_percentage.error') }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <div className="select-container">
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              label="Tax Percentage"
                              value={value}
                              onChange={(e) => {
                                onChange(e.target.value)
                                setTexPercentageTouched((prev) => !prev)
                              }}
                              options={[
                                { label: '0%', value: 0 },
                                { label: '5%', value: 5 },
                                { label: '14%', value: 14 },
                                { label: '15%', value: 15 }
                              ]}
                              name="tax_percentage"
                              isRequired
                              placeholder="Select"
                              height="30px"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>

                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('non_po_based_invoices:totalInvoiceAmount.text')}{' '}
                        <span className="required">*</span>{' '}
                        <AppTooltip
                          message={t('non_po_based_invoices:totalInvoiceAmount.tooltip')}
                        />
                      </label>
                    </div>
                    <div>
                      {!editInvAmt && (
                        <div className="d-flex align-items-center" style={{ paddingRight: '20px' }}>
                          <label className={styles.currencyTxt}>
                            {isPoInline
                              ? Number(poInlineTotals.invoice).toLocaleString('en-US', {
                                  minimumFractionDigits: 2
                                })
                              : isEdit
                              ? watch('InvAmt')
                                ? Number(watch('InvAmt')).toLocaleString('en-US', {
                                    minimumFractionDigits: 2
                                  })
                                : '0.00'
                              : Number(totalNetValue).toLocaleString('en-US', {
                                  minimumFractionDigits: 2
                                })}
                          </label>
                          <img
                            style={{ width: '16px' }}
                            src={editInputIcon}
                            onClick={() => setEditInvAmt(true)}
                            className="ms-1 cursor-pointer mb-1"
                          />
                        </div>
                      )}
                      {editInvAmt && (
                        <div style={{ paddingRight: '20px' }}>
                          <Controller
                            name="InvAmt"
                            control={control}
                            rules={{
                              required: t('non_po_based_invoices:totalInvoiceAmount.error'),
                              validate: (value) => {
                                const num = Number(value)
                                if (isNaN(num) || num <= 0) {
                                  return (
                                    t('non_po_based_invoices:totalInvoiceAmount.zeroError') ||
                                    'Total Invoice Amount must be greater than 0'
                                  )
                                }
                                return true
                              }
                            }}
                            render={({ field: { onChange, value }, fieldState: { error } }) => (
                              <InputBox
                                placeholder={t('non_po_based_report:enterInvoiceValue')}
                                className={`inputBox mb-0 formInput`}
                                name="InvAmt"
                                type="text"
                                value={value || ''}
                                onChange={(e) => {
                                  const formattedValue = formatDecimalInput(e.target.value, 2)
                                  onChange(formattedValue)
                                  setIsInvAmtManuallyEdited(true)
                                }}
                                onKeyDown={(e) => {
                                  handleDecimalKeyDown(e, 2)
                                }}
                                onInput={(e) => {
                                  if (e.target.value.length > 18) {
                                    e.target.value = e.target.value.slice(0, 18)
                                  }
                                }}
                                error={error}
                              />
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('totalTaxAmountCalc.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('totalTaxAmountCalc.tooltip')} />
                      </label>
                    </div>
                    <div>
                      <Controller
                        name="tax_amount"
                        control={control}
                        rules={{
                          required: t('taxAmtRequired'),
                          validate: (value) => {
                            const invoiceAmount = Number(watch('InvAmt'))
                            const taxPercentage = Number(watch('tax_percentage'))
                            // Always use the value being validated (editTaxAmt) or calculated (isPoInline/taxAmount)
                            let totalTaxAmount = Number(
                              editTaxAmt ? value : isPoInline ? poInlineTotals.tax : taxAmount
                            )
                            if (
                              isNaN(totalTaxAmount) ||
                              isNaN(invoiceAmount) ||
                              isNaN(taxPercentage)
                            ) {
                              return t('invalidTaxCalculation')
                            }
                            // Round both to two decimals for comparison
                            const roundedTax = Number(totalTaxAmount).toFixed(2)
                            const calculatedMaxTax = (invoiceAmount * taxPercentage) / 100
                            const roundedMaxTax = Number(calculatedMaxTax).toFixed(2)
                            return parseFloat(roundedTax) <= parseFloat(roundedMaxTax)
                              ? true
                              : t('taxAmountExceeds', {
                                  taxPercentage,
                                  roundedMaxTax
                                })
                          }
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) =>
                          editTaxAmt ? (
                            <div style={{ paddingRight: '20px' }}>
                              <InputBox
                                key={delayedTaxPercentage}
                                placeholder={t('non_po_based_report:enterTaxAmount')}
                                className={`inputBox mb-0 formInput`}
                                name="tax_amount"
                                type="text"
                                error={error}
                                value={isPoInline ? poInlineTotals.tax.toFixed(2) : value || ''}
                                onChange={(e) => {
                                  const formattedValue = formatDecimalInput(e.target.value, 2)
                                  onChange(formattedValue)
                                }}
                                onKeyDown={(e) => {
                                  handleDecimalKeyDown(e, 2)
                                  if (
                                    e.target.value &&
                                    e.target.value.length >= 18 &&
                                    e.key !== 'Backspace' &&
                                    e.key !== 'Delete' &&
                                    e.key !== 'ArrowLeft' &&
                                    e.key !== 'ArrowRight'
                                  ) {
                                    e.preventDefault()
                                  }
                                }}
                                onInput={(e) => {
                                  if (e.target.value.length > 18) {
                                    e.target.value = e.target.value.slice(0, 18)
                                  }
                                }}
                                // disabled={isPoInline}
                              />
                            </div>
                          ) : (
                            <>
                              <input
                                type="hidden"
                                {...register('tax_amount')}
                                value={isPoInline ? poInlineTotals.tax : taxAmount}
                              />
                              <div
                                className="d-flex align-items-center"
                                style={{ paddingRight: '20px' }}>
                                <label className={styles.currencyTxt}>
                                  {isPoInline
                                    ? Number(poInlineTotals.tax).toLocaleString('en-US', {
                                        minimumFractionDigits: 2
                                      })
                                    : isEdit
                                    ? watch('tax_amount')
                                      ? Number(watch('tax_amount')).toLocaleString('en-US', {
                                          minimumFractionDigits: 2
                                        })
                                      : '0.00'
                                    : Number(watch('tax_amount')).toLocaleString('en-US', {
                                        minimumFractionDigits: 2
                                      })}
                                </label>
                                <img
                                  style={{ width: '16px' }}
                                  src={editInputIcon}
                                  onClick={() => setEditTaxAmt(true)}
                                  className="ms-1 cursor-pointer mb-1"
                                />
                              </div>
                              {error && (
                                <p
                                  className="text-danger"
                                  style={{
                                    width: isArabic ? '245px' : '270px'
                                  }}>
                                  {error.message}
                                </p>
                              )}
                            </>
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className="formGroup">
                    <div className="labelWidth">
                      <label>
                        {t('paymentTerms.text')} <span className="required">*</span>{' '}
                        <AppTooltip message={t('paymentTerms.tooltip')} />
                      </label>
                    </div>
                    <div style={{ paddingRight: '20px' }}>
                      <InputBox
                        placeholder="Enter payment terms"
                        className={`inputBox mb-0 formInput`}
                        name="Payment_Terms"
                        type="text"
                        value={getValues('Payment_Terms')}
                        register={register}
                        //error={errors.Payment_Terms}
                        disabled={true}
                        inputStyle={{
                          direction: isArabic ? 'ltr' : '',
                          textAlign: isArabic ? 'end' : ''
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${styles.attachmentContainer}`}>
                <div className="d-flex align-items-center ">
                  <div className="w-[50%]">
                    <div className="d-flex  align-items-center">
                      <div className="labelWidth">
                        <label className={styles.inputLabel}>
                          {t('attachment_type.text')} <span className="required">*</span>
                          <AppTooltip message={t('attachment_type.tooltip')} />
                        </label>
                      </div>
                      <Controller
                        name="attachment_type"
                        control={control}
                        defaultValue=""
                        rules={{
                          required:
                            uploadedFiles?.length === 0
                              ? t('advance_payment:attachmentTypeRequired')
                              : ''
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                          <div className="select-container">
                            <SelectBox
                              className={`formInput custom-select-box mb-0`}
                              error={error}
                              label="Attachment Type"
                              value={value || ''}
                              onChange={(event) => {
                                const selectedValue = event.target.value
                                if (!selectedValue) return

                                setCurrentAttachment((prev) => ({
                                  ...prev,
                                  type: selectedValue
                                }))
                                onChange(selectedValue)
                              }}
                              options={translatedOptions}
                              name="attachment_type"
                              isRequired
                              placeholder={t('general_details_comp:select')}
                              height="34px"
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                  <div className="w-[50%]">
                    <div className="d-flex pl-4 justify-content-between">
                      <div>
                        <div
                          className="d-flex align-items-center"
                          style={{ gap: isArabic ? '0.5rem' : '1rem' }}>
                          <div className="d-flex">
                            <label className={styles.inputLabel}>
                              {t('invoiceFileUpload.text')} <span className="required">*</span>
                              <AppTooltip
                                message={t('non_po_based_invoices:fileUpload.tooltip2')}
                              />
                            </label>
                          </div>
                          <div>
                            <Controller
                              name="attachments"
                              control={control}
                              rules={{
                                required:
                                  uploadedFiles?.length === 0
                                    ? t('advance_payment:fileUploadRequired')
                                    : ''
                              }}
                              render={({ field: { onChange, value }, fieldState: { error } }) => (
                                <>
                                  <FileUploadInput
                                    name="attachments"
                                    // error={error}
                                    files={value}
                                    multiple={true}
                                    onChange={(event) => {
                                      //const selectedFile = event.target.files?.[0]
                                      const selectedFile = Array.from(event.target.files || [])
                                      if (!selectedFile) return
                                      if (selectedFile.length > 2) {
                                        setError('attachments', {
                                          type: 'manual',
                                          message: t('toast:onlyTwoFilesAllowed')
                                        })
                                        event.target.value = null
                                        return
                                      }

                                      const isDuplicate = selectedFile.some((file) =>
                                        uploadedFiles.some(
                                          (uploaded) =>
                                            uploaded.document_name === file.name &&
                                            uploaded.attachment_type === currentAttachment?.type
                                        )
                                      )

                                      if (isDuplicate) {
                                        toast.error(t('toast:duplicateFileExists'))
                                        event.target.value = null
                                        return
                                      }
                                      // Check if attachment type is credit note and validate PDF files only
                                      const currentAttachmentType = getValues('attachment_type')
                                      if (currentAttachmentType === 'invoice') {
                                        const nonPdfFiles = selectedFile.filter(
                                          (f) => f.type !== 'application/pdf'
                                        )

                                        if (nonPdfFiles.length > 0) {
                                          toast.error(t('toast:onlyPDFFilesAllowed'))
                                          event.target.value = null
                                          return
                                        }
                                      }

                                      clearErrors('attachments')
                                      setCurrentAttachment((prev) => ({
                                        ...prev,
                                        file: selectedFile
                                      }))
                                      onChange(selectedFile)
                                      event.target.value = null
                                    }}
                                    className={'formInput'}
                                  />
                                  {error && (
                                    <p style={{ fontSize: '11px', color: '#d50000' }}>
                                      {error.message}
                                    </p>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ paddingRight: isArabic ? '20px' : '' }}>
                        <NormalButton
                          isPrimary
                          label={btnLoader.file ? t('uploading') : t('upload')}
                          leftIcon={uploadAddIcon}
                          customClass="px-3 uploadBtnBorder uploadBtnStyle"
                          onClick={handleFileUpload}
                          // isLoading={btnLoader.file}
                          disabled={btnLoader.file}
                          type="button"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Header row */}
                {uploadedFiles?.length > 0 && (
                  <>
                    <hr />
                    <div className={`d-flex ${styles.attachmentRow} text-start`}>
                      <div className={`${styles.colSn} ${styles.headerText}`}>
                        <label className="fw-semibold">{t('advance_payment:SNo')}</label>
                      </div>
                      <div className={`${styles.colType} ${styles.headerText}`}>
                        <label className="fw-semibold">{t('advance_payment:AttachmentType')}</label>
                      </div>
                      <div className={`${styles.colName} ${styles.headerText}`}>
                        <label className="fw-semibold">{t('advance_payment:DocumentName')}</label>
                      </div>
                      <div className={`${styles.colAction} ${styles.headerText}`}>
                        <label className="fw-semibold">{t('advance_payment:action')}</label>
                      </div>
                    </div>
                  </>
                )}
                {/* Uploaded file rows */}
                {uploadedFiles?.map((file, index) => (
                  <div
                    key={file.id || index}
                    className={`d-flex ${styles.attachmentRow} text-start pt-3`}>
                    <div className={`${styles.colSn} ${styles.fileText}`}>
                      <label>{index + 1}</label>
                    </div>
                    <div className={`${styles.colType} ${styles.fileText}`}>
                      <label>
                        {
                          // file.attachment_type?.charAt(0).toUpperCase() +
                          // file.attachment_type?.slice(1)
                          translatedOptions.find((opt) => opt.value === file.attachment_type)
                            ?.label || file.attachment_type
                        }
                      </label>
                    </div>
                    <div className={`${styles.colName} ${styles.fileText} ${styles.docLink}`}>
                      <label style={{ direction: isArabic ? 'ltr' : '' }}>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none cursor-pointer">
                          {file.document_name}
                        </a>
                      </label>
                    </div>
                    <div className={`${styles.colAction}`}>
                      <img
                        src={deleteIcon}
                        alt="delete"
                        className="btn btn-link text-danger p-0"
                        onClick={() => {
                          setFileToDelete(file)
                          setIsModalOpen(true)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </form>
            <div className="table-border overflow-hidden rounded-lg overflow-hidden">
              <TableComponent
                className="edit-invoice-table"
                width={'150%'}
                // noSorting
                checkboxRequired={isPoInline ? true : false}
                tableHeaders={headers}
                tableData={formattedData}
                showTotalData={true}
                showPagination={true}
                onSelectionChange={setSelectedRows}
                selectedRows={selectedRows}
                totalData={
                  isPoInline
                    ? {
                        netValue: poInlineTotals?.invoice,
                        taxValue: poInlineTotals?.tax,
                        total: poInlineTotals?.total
                      }
                    : {
                        ...totalValues,
                        netValue: watch('InvAmt'),
                        taxValue: watch('tax_amount'),
                        total: Number(watch('InvAmt')) + Number(watch('tax_amount'))
                      }
                }
              />
            </div>
            {nextClick &&
              (() => {
                // Only filter by selectedRows if isPoInline is true
                let pdfData
                if (isPoInline) {
                  pdfData =
                    selectedRows.length > 0
                      ? formattedData.filter((row) => selectedRows.includes(row.id))
                      : formattedData
                  // For pdfData, replace enteredQuantity InputBox with plain text
                  pdfData = pdfData.map((row) => {
                    if (row.enteredQuantity && React.isValidElement(row.enteredQuantity)) {
                      // Show the entered value or GR_Qty as plain text
                      const value =
                        enteredQuantities[row.id] ||
                        invoiceList.find((i) => i.POLnNo === row.id)?.GR_Qty ||
                        ''
                      return {
                        ...row,
                        enteredQuantity: <span>{value}</span>
                      }
                    }
                    return row
                  })
                } else {
                  pdfData = formattedData
                }
                return (
                  <InvoicePreviewPO
                    open={nextClick}
                    setNextClick={setNextClick}
                    handleSave={handleSave}
                    handleSubmit={handleSubmitInvoice}
                    saved={saved}
                    tableData={
                      <div className="table-border overflow-hidden rounded-lg">
                        <TableComponent
                          width={'150%'}
                          // checkboxRequired={isPoInline ? true : false}
                          tableHeaders={headers}
                          // noSorting
                          tableData={pdfData}
                          showTotalData={true}
                          showPagination={true}
                          onSelectionChange={setSelectedRows}
                          totalData={
                            isPoInline
                              ? {
                                  netValue: poInlineTotals?.invoice,
                                  taxValue: poInlineTotals.tax,
                                  total: poInlineTotals?.total
                                }
                              : totalValues
                          }
                        />
                      </div>
                    }
                    formData={{
                      ...getValues(),
                      invoice_date: selectedDate?.format('YYYY-MM-DD HH:mm:ss'),
                      purchaseOrderData: invoiceList,
                      vendor_code: vendorCodeOptions.find(
                        (opt) => opt.value === Number(getValues('vendor_code'))
                      )?.label
                    }}
                    uploadedFiles={uploadedFiles}
                  />
                )
              })()}
            {showSuccessPopup && (
              <SuccessPopup
                open={showSuccessPopup}
                onClose={handleCloseSuccessPopup}
                successMsg={successMsg}
              />
            )}
          </>
        )}
      </LeftPageContainer>
      {/* Modal for confirmation */}
      <CustomModal
        open={isModalOpen}
        modalStyles={{ width: 400 }}
        header={t('popup:confirmSubmission')}
        description={t('deleteConfirmation')}
        onClose={() => setIsModalOpen(false)}
        closeIcon>
        {/* <p className="modalTxt">{t("deleteConfirmation")}</p> */}

        <div className="d-flex justify-content-between mb-2">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="confimationBtns me-3"
            onClick={() => {
              setIsModalOpen(false)
              setFileToDelete(null)
            }}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            customClass="confimationBtns"
            onClick={handleRemoveFile}
          />
        </div>
      </CustomModal>
    </>
  )
}
const mapStateToProps = (state) => ({
  setDashboardData,
  userInfo: state.userInfo
})
const mapDispatchToProps = { showToast }
export default connect(mapStateToProps, mapDispatchToProps)(AddEditPOBasedComp)
