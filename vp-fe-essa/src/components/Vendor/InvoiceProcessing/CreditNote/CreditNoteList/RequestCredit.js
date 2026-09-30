import { NormalButton } from 'components/Common'
import React, { useEffect, useState } from 'react'
import styles from './CreditNoteList.module.scss'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import { useTranslation } from 'react-i18next'
import { fetchVendorNameOrCode } from 'api/UserRegister'
import { poNonPOInvoiceDropdown } from 'api/POBased';
import MultiSelectDropdown from 'components/Common/SelectBox/MultiSelectDropdown'
import { requestCreditNote } from 'api/CreditNote'
import AppTooltip from 'components/Common/AppTooltip'
import { getEntityId } from 'services/utilities'

// Accept props as an object and destructure setIsRequestCredit, setRequestSuccessPopup
const RequestCredit = ({ setIsRequestCredit, setRequestSuccessPopup }) => {
  const { t } = useTranslation(['credit_notes', 'popup', 'logistics_invoice', 'vendors', 'sidebar'])
  const {
    register,
    formState: { errors },
    control,
    handleSubmit, watch, getValues,
    reset
  } = useForm()

  const [invoiceType, setInvoiceType] = useState('') // 'PO' or 'NonPO'
  const [vendorCodeOptions, setVendorCodeOptions] = useState([])
  const [poData, setPOData] = useState([]);
  const selectedVendor = watch('selectVendor');
  const onSubmit = (data) => {
    const payload = {
      Vendor_Ids: [data.selectVendor],
      Invoice_List_ids: data.Invoice_List_ids,
    }

    requestCreditNote(payload)
      .then((res) => {
        if (res?.data?.status === 200) {
          reset()
          setPOData([])
          setInvoiceType('')
          setIsRequestCredit(false)
          setRequestSuccessPopup(true);
        }
      })
      .catch((err) => console.error('Error submitting form:', err))
  }
  useEffect(() => {
    fetchVendorData()
  }, [])
  const fetchVendorData = () => {

    Promise.all([fetchVendorNameOrCode({ entity_id: getEntityId() })])
      .then(([vendorCodeRes]) => {
        const vendorCodeOptions = vendorCodeRes?.data?.data?.map((item) => ({
          label: item?.Vendor_Name_EN,
          value: item?.ID,
          vendorName: item?.Vendor_Name_EN
        }))
        setVendorCodeOptions(vendorCodeOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }
  const fetchPONonPODropdown = (categoryId = 2) => {
    const vendorId = getValues('selectVendor');
    const query = {
      category: categoryId,
      vendor_id: vendorId,
    }
    poNonPOInvoiceDropdown(query).then((res) => {
      const result = res?.data?.data?.map((x) => ({
        label: x?.InvNo,
        value: x?.ID
      }))
      setPOData(result);
    })
  }
  return (
    <div>
      <form className={styles.modalContent} onSubmit={handleSubmit(onSubmit)}>
        {/* Vendor Selection */}
        <div>
          <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
            {t('selectVendors.text')} <span className="required">*</span><AppTooltip message={t("selectVendors.text")} />
          </label>
          <Controller
            name="selectVendor"
            control={control}
            defaultValue=""
            rules={{ required: t('selectVendors.error') }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="select-container">
                <SelectBox
                  className={`${styles.userInput} custom-select-box`}
                  error={error}
                  label={t('selectVendors.text')}
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  options={vendorCodeOptions} // Replace with actual vendor list
                  name="selectVendor"
                  isRequired
                />
              </div>
            )}
          />
        </div>

        {/* Invoice Type Selection */}
        <div className="my-4">
          <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
            {t('selectInvoice.text')} <span className="required">*</span><AppTooltip message={t("selectInvoiceType")} />
          </label>
          <Controller
            name="selectInvoice"
            control={control}
            defaultValue=""
            rules={{ required: t('selectInvoice.error') }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="select-container">
                <SelectBox
                  className={`${styles.userInput} custom-select-box`}
                  error={error}
                  label={t('selectInvoice.text')}
                  value={value || ''}
                  onChange={(e) => {
                    const selected = e.target.value
                    if (selected === "PO") {
                      fetchPONonPODropdown(1)
                    } else {
                      fetchPONonPODropdown(2)
                    }
                    onChange(selected)
                    setInvoiceType(selected) // set selected invoice type
                  }}
                  options={[
                    { label: t('poBasedInvoiceHeader.text'), value: 'PO' },
                    { label: t('nonPoBasedInvoiceHeader.text'), value: 'NonPO' }
                  ]}
                  name="selectInvoice"
                  isRequired
                  disabled={!selectedVendor}
                />
              </div>
            )}
          />
        </div>

        {/* Conditional Dropdown */}
        {invoiceType === 'PO' && (
          <div>
            <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>
              {t('poBasedInvoiceHeader.text')} <span className="required">*</span><AppTooltip message={t("selectInvoiceTooltip")} />
            </label>
            <Controller
              name="Invoice_List_ids"
              control={control}
              rules={{ required: 'Invoice selection is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <MultiSelectDropdown
                    placeholder="Select"
                    customClass={`${styles.userInput} custom-select-box`}
                    options={poData}
                    selectedValues={value || []}
                    onChange={onChange}
                    inputHeight={45}
                  />
                  {error && <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>}
                </div>
              )}
            />
          </div>
        )}

        {invoiceType === 'NonPO' && (
          <div className="mb-3">
            <label className={`${styles.inputTitle} d-flex gap-1 mb-2`}>{t('nonPoBasedInvoiceHeader.text')}<span className="required">*</span><AppTooltip message={t("selectInvoiceTooltip")} /></label>
            <Controller
              name="Invoice_List_ids"
              control={control}
              rules={{ required: 'Invoice selection is required' }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <div className="select-container">
                  <MultiSelectDropdown
                    placeholder="Select"
                    customClass={`${styles.userInput} custom-select-box`}
                    options={poData}
                    selectedValues={value || []}
                    onChange={onChange}
                    inputHeight={45}
                  />
                  {error && <p style={{ color: 'red', fontSize: '12px' }}>{error.message}</p>}
                </div>
              )}
            />
          </div>
        )}

        {/* Submit */}
        <NormalButton
          label={t('sendRequest')}
          isPrimary
          customClass={styles.inviteBtn}
          type="submit"
        />
      </form>
    </div>
  )
}

export default RequestCredit