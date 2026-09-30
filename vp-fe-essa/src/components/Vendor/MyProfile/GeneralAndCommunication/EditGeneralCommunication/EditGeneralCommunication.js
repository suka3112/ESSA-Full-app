import React, { useEffect, useState, startTransition } from 'react'
import styles from './EditGeneralCommunication.module.scss'
import Avatar from 'assets/images/user-avatar-white.png'
import editIcon from '../../../../../assets/icons/editPencilIcon.svg'
import DeleteIcon from 'assets/icons/deleteIcon.svg'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { NormalButton } from 'components/Common/NormalButton'
import nextIcon from '../../../../../assets/icons/nextIconWhite.svg'
import { useNavigate } from 'react-router-dom'
import { SelectBox } from 'components/Common/SelectBox'
import {
  ADMIN_USER_TYPE,
  BUSINESS_USER_TYPE,
  FINANCE_USER_TYPE,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE
} from 'constants/userType'
import { useTranslation } from 'react-i18next'
import { connect, useSelector } from 'react-redux'
import {
  industryTypeOptions,
  taxableOptions,
  whtApplicableOptions,
  whtRateOptions
} from 'services/helpers/constants/common'
import {
  fetchCities,
  fetchCountries,
  fetchIndustryKeys,
  fetchRegions,
  fetchTaxabilityBasis,
  fetchWhtRate
} from 'api/UserRegister'
import { showToast } from '../../../../../redux/actions/toastActions'
import FileUpload from '../../../../Common/FileUpload'
import styled from 'styled-components'
import { Box } from '@mui/material'
import { Validator } from 'services/validation/formValidations'
import { deleteProfilePicture, editInlineStatus, editProfileImage } from 'api/MyProfile'
import { fileUpload } from 'api/FileUpload'
import ToggleSwitch from 'components/Common/ToggleSwitch'
import { toast } from 'react-toastify'
import useTableFeatures from 'hooks/useTableFeatures'
import { getVendorsList } from 'api/Vendors'
import DetailItem from 'components/Common/DetailItemCard'
import CustomModal from 'components/Common/Modal'

const EditGeneralCommunicationComp = ({
  setIsEditable,
  onNextClick,
  myProfile,
  showToast,
  profileImg,
  fetchProfileDetails,
  handleTabChange,
  setShowTUButton,
  updateEditedData,
  handleFinalSubmit,
  editedData,
  profileLoading,
  isVendorsProfilePage,
  userInfo: { userType }
}) => {
  const {
    register,
    formState: { errors },
    control,
    setValue,
    handleSubmit,
    watch,
    getValues,
    trigger,
    reset
  } = useForm({ defaultValues: editedData.general || {} })
  const [preview, setPreview] = useState(profileImg || Avatar)
  const whtApplicableValue = useWatch({ control, name: 'Wht_Applicable' })
  const EditImgIcon = styled.img`
    position: absolute;
    top: 0;
    ${(props) => (props.langDirection ? 'left: 0;' : 'right: 0;')}
    transform: translate(0, 0);
    cursor: pointer;
    opacity: 1;
    //transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
    cursor: pointer;
    padding: 5px;
    filter: brightness(0) invert(1);
  `
  const DeleteImgIcon = styled.img`
    position: absolute;
    top: 0;
    display: none;
    ${(props) => (props.langDirection ? 'left: 0;' : 'right: 0;')}
    transform: translate(0, 0);
    cursor: pointer;
    opacity: 1;
    transition: transform 0.5s ease-in-out, opacity 0.5s ease-in-out;
    cursor: pointer;
    padding: 5px;
    filter: brightness(0) invert(1);
  `

  const ProfileContainer = styled(Box)`
    padding: 10px;
    position: relative;
    transition: all 0.5s ease;
    cursor: pointer;
    height: 105px;
    width: 100px;
    border-radius: 10px;
    background-color: $primary-color;
    display: flex;

    &:hover::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4); /* White overlay with 20% opacity */
      border-radius: 10px;
      pointer-events: none; /* Prevent overlay from blocking interactions */
    }

    &:hover ${EditImgIcon} {
      height: 50px;
      width: 50px;
      opacity: 1;
      transform: translate(-50%, -50%);
      top: 50%;
      left: 30%;
      //transition: transform 0.5s ease-out, opacity 1s ease-out, height 0.5s ease, width 0.5s ease;
      cursor: pointer;
    }
    &:hover ${DeleteImgIcon} {
      height: 50px;
      width: 50px;
      display: inline;
      opacity: 1;
      transform: translate(-50%, -50%);
      top: 50%;
      left: 70%;
      transition: transform 0.5s ease-out, opacity 1s ease-out, height 0.5s ease, width 0.5s ease;
      cursor: pointer;
    }
  `
  const ProfileImage = styled.img`
    object-fit: contain;
    width: 100%;
    height: 100%;
    border-radius: 12px;
    over-flow: hidden;
  `

  const navigate = useNavigate()

  const { t, i18n } = useTranslation([
    'profile_general_details_comp',
    'myprofile',
    'otp',
    'reset-password',
    'general_details_comp',
    'toast',
    'vendors'
  ])
  const isArabic = i18n.language === 'ar'

  const vendorDetails = myProfile
  const uploadVendorCode = useSelector(
    (state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code
  )

  const { setLoader } = useTableFeatures()

  const [showFileInput, setShowFileInput] = useState(false)
  const [confirmProfileDelete, setConfirmProfileDelete] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [dropdownData, setDropdownData] = useState(null)
  const [cityAndRegionData, setcityAndRegionData] = useState(null)

  const selectedCountry = watch('Country')
  //const whtApplicableWatch = watch('wht_applicable');

  // Clear the value when whtApplicableValue is "No"
  useEffect(() => {
    if (whtApplicableValue === 'No') {
      setValue('Wht_Rate', null)
      setValue('Taxble_Basis', null)
    }
  }, [whtApplicableValue, setValue])

  useEffect(() => {
    if (Object.keys(editedData.general || {}).length > 0) {
      reset(editedData.general)
    }
  }, [editedData.general])

  const handleEditClick = () => {
    startTransition(() => {
      setShowFileInput(true)
    })
  }

  const handleClose = () => {
    startTransition(() => {
      setShowFileInput(false)
    })
  }

  useEffect(() => {
    fetchDropdownValues()
  }, [])

  const handleResetclick = (email) => {
    navigate(`/vendor/my-profile/reset-password?email=${email}`)
  }

  const fetchDropdownValues = () => {
    Promise.all([fetchCountries(), fetchIndustryKeys(), fetchWhtRate(), fetchTaxabilityBasis()])
      .then(([countriesRes, industryKeysRes, whtRes, taxabilityBasisRes]) => {
        const countryList = Array.isArray(countriesRes.data.data) ? countriesRes.data.data : []
        const industryKeyList = Array.isArray(industryKeysRes.data.data)
          ? industryKeysRes.data.data
          : []
        const whtList = Array.isArray(whtRes.data.data) ? whtRes.data.data : []
        const taxabilityBasisList = Array.isArray(taxabilityBasisRes.data.data)
          ? taxabilityBasisRes.data.data
          : []
        const formattedData = {
          countries: countryList.map((item) => ({
            label: item.name,
            value: item.isoCode
          })),
          industryKeys: industryKeyList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          })),
          whtRates: whtList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          })),
          taxabilityBasis: taxabilityBasisList.map((item) => ({
            label: item.Description_En,
            value: item.Code
          }))
        }
        setDropdownData(formattedData)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (selectedCountry) {
      fetchLocationDataByCountry(selectedCountry)
    }
  }, [selectedCountry])

  const fetchLocationDataByCountry = (selectedCountry) => {
    let query = { id: selectedCountry }

    Promise.all([fetchCities(query), fetchRegions(query)])
      .then(([citiesRes, regionsRes]) => {
        const citiesList = Array.isArray(citiesRes.data.data) ? citiesRes.data.data : []
        const regionsList = Array.isArray(regionsRes.data.data) ? regionsRes.data.data : []

        const formattedData = {
          cities: citiesList.map((item) => ({
            label: item.name,
            value: item.name
          })),
          regions: regionsList.map((item) => ({
            label: item?.name,
            value: item?.isoCode
          }))
        }
        setcityAndRegionData(formattedData)
      })
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    if (vendorDetails && !editedData?.general) {
      setValue('Street_House_No', vendorDetails?.Street_House_No || null)
      setValue('Postal_Code', vendorDetails?.Postal_Code)
      // setValue('Wht_Applicable', vendorDetails?.Wht_Applicable === true ? 'Yes' : 'No' || '')
      setValue('Wht_Applicable', vendorDetails?.Wht_Applicable ? 'Yes' : 'No' || '')
      setValue('Fax', vendorDetails?.Fax || null)
    }
  }, [vendorDetails, setValue])

  useEffect(() => {
    if (vendorDetails && !editedData?.general) {
      const industryKey = dropdownData?.industryKeys?.find(
        (opt) => opt.value === vendorDetails?.Industry_Key
      )
      const industryType = industryTypeOptions.find(
        (opt) => opt.value === vendorDetails?.Industry_Type
      )
      const whtRate = whtRateOptions.find((opt) => opt.value === vendorDetails?.Wht_Rate)
      const taxableBasis = taxableOptions.find((opt) => opt.value === vendorDetails?.Taxble_Basis)
      const country = dropdownData?.countries?.find((opt) => opt.value === vendorDetails?.Country)
      if (industryKey) setValue('Industry_Key', industryKey.value)
      if (industryType) setValue('Industry_Type', industryType.value)
      if (whtRate) setValue('Wht_Rate', whtRate.value)
      if (taxableBasis) setValue('Taxble_Basis', taxableBasis.value)
      if (country) setValue('Country', country.value)
    }
  }, [dropdownData])

  useEffect(() => {
    if (vendorDetails && !editedData?.general) {
      const city = cityAndRegionData?.cities?.find((opt) => opt.value === vendorDetails?.City)
      const region = cityAndRegionData?.regions?.find((opt) => opt.label === vendorDetails?.Region)
      if (city) setValue('City', city.value)
      if (region) setValue('Region', region.value)
    }
  }, [cityAndRegionData])

  const onSubmit = async (data) => {
    const {
      City,
      Country,
      Region,
      Postal_Code,
      Wht_Applicable,
      Fax,
      Industry_Type,
      Industry_Key,
      Street_House_No,
      Taxble_Basis,
      Wht_Rate
    } = data
    let body = {
      City: City === '' ? null : City,
      Country: Country === '' ? null : Country,
      Region: Region === '' ? null : Region,
      Postal_Code: Postal_Code === '' ? null : Postal_Code,
      Fax: Fax === '' ? null : Fax,
      Industry_Type: Industry_Type === '' ? null : Industry_Type,
      Industry_Key: Industry_Key === '' ? null : Industry_Key,
      Street_House_No: Street_House_No === '' ? null : Street_House_No,
      Taxble_Basis: Taxble_Basis === '' ? null : Taxble_Basis,
      Wht_Rate: Wht_Rate === '' ? null : Wht_Rate,
      Wht_Applicable: Wht_Applicable === 'Yes' ? true : false
    }

    await updateEditedData('general', body)

    await handleFinalSubmit(body)
  }
  const handleToggleStatus = async (vendor, newStatus) => {
    try {
      setLoader(true)
      let query = {
        ID: vendor?.bankDetails?.Vendor_Id,
        Is_PO_Inline: newStatus === 'active' ? true : false
      }
      editInlineStatus(query)
        .then((res) => {
          showToast(
            'Success',
            `${t('general_details_comp:inlineLevelUpdated')} ${
              newStatus ? t('vendors:active') : t('vendors:inactive')
            }`,
            'success'
          )
          //toast.success(`${t('general_details_comp:inlineLevelUpdated')} ${' '}${newStatus ? 'Active' : 'Inactive'}`)
          // getVendorsList()
        })
        .catch((err) => {
          console.error('Error updating status:', err)
          toast.error(err.response?.data?.message || t('vendors:failedToUpdateStatus'))
        })
    } finally {
      setLoader(false)
    }
  }

  const handleProfileDelete = () => {
    setIsDeleteLoading(true)
    deleteProfilePicture()
      .then(() => {
        setPreview('')
        showToast('Success', 'Profile picture deleted successfully.', 'success')
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
        setIsDeleteLoading(false)
        setConfirmProfileDelete(false)
      })
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]

    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setPreview(imageUrl)
      setShowFileInput(false)

      const fd = new FormData()
      fd.append('image', file)
      const vendorCodeUpload = uploadVendorCode || null
      const moduleName = 'PROFILE PICTURE'
      fd.append('vendor_code', vendorCodeUpload)
      fd.append('module', moduleName)

      try {
        // Step 1: Upload file and get URL
        const uploadRes = await fileUpload(fd)
        const uploadedUrl = uploadRes?.data?.data?.url

        // Step 2: Send uploaded URL to update profile image
        const payload = { imageUrl: uploadedUrl }
        const updateRes = await editProfileImage(payload)

        showToast(t('toast:successTitle'), `${updateRes?.data?.message}`, 'success')
      } catch (err) {
        // showToast('Error.', `${err?.response?.data?.message || err.message}`, 'error');
        toast.error(err?.response?.data?.message || err.message)
      }
    }
  }

  const handleNextClick = async () => {
    const currentFormValues = getValues()
    updateEditedData('general', currentFormValues)
    onNextClick()
  }

  const streetValidator = new Validator()
    .validateNotEmptySpace()
    .validateNotOnlySymbols()
    .validateNotOnlyNumbers()
    .validateMinLength(3)
    .validateMaxLength(70)
    .build()

  const postalCodeValidator = new Validator()
    .validateNotEmptySpace()
    .validatePostalCode()
    .validateMinLength(2)
    .validateMaxLength(10)
    .validateNoSymbols()
    .build()

  const faxValidator = new Validator()
    .validateNotEmptySpace()
    .validateFaxNumber()
    .validateMinLength(5)
    .validateMaxLength(30)
    .validateNoSymbols()
    .build()

  return (
    <div className={styles.gcDetailsContainer}>
      <div className={styles.formHeader}>
        <div className="mb-4 fs-5">{t('myprofile:generalAndCommunicationDetails')}</div>
        <div className="d-flex align-items-center gap-4">
          <span
            className={styles.resetPassword}
            onClick={() => {
              handleResetclick(vendorDetails?.Email)
            }}>
            {t('reset-password:reset_pwd')}
          </span>
          <NormalButton
            style={{ width: '108px', height: '40px' }}
            rightIconClassName={'rtl:rotate-180'}
            label={t('myprofile:next')}
            isPrimary
            onClick={handleNextClick}
            rightIcon={nextIcon}
          />
        </div>
      </div>
      <div className={styles.gcDetailsUser}>
        <div
          className={`${styles.gapcustom} ${
            isArabic ? styles.verticalDividerArabic : styles.verticalDivider
          } col-7`}>
          <ProfileContainer>
            {profileLoading ? (
              <p className="m-auto" style={{ color: '#fff' }}>
                Loading...
              </p>
            ) : (
              <ProfileImage
                src={preview}
                alt="Profile"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = Avatar
                }}
              />
            )}
            {userType !== FINANCE_USER_TYPE && userType !== BUSINESS_USER_TYPE && (
              <>
                <EditImgIcon src={editIcon} onClick={handleEditClick} />
                <DeleteImgIcon
                  src={DeleteIcon}
                  onClick={() => {
                    setConfirmProfileDelete(true)
                  }}
                />
                {showFileInput && (
                  <FileUpload openOnRender onFileChange={handleFileChange} onClose={handleClose} />
                )}
              </>
            )}
            {/* <EditImgIcon src={editIcon} langDirection={isArabic} onClick={handleEditClick} />
            {showFileInput && <FileUpload openOnRender onClose={handleClose} />} */}
          </ProfileContainer>
          <div className={styles.gapItem}>
            <DetailItem label={t('vendorName.text')} value={vendorDetails?.Vendor_Name_EN} />
            <DetailItem label={t('vendorCode.text')} value={vendorDetails?.Vendor_SAP_Code} />
            <DetailItem
              label={t('vendors:vendorNameArabic.text')}
              value={vendorDetails?.Vendor_Name_AR}
            />
            <DetailItem label={t('phoneNumber.text')} value={vendorDetails?.Phone} />
          </div>
        </div>
        <div className={`${styles.gapItem} col-5`}>
          <DetailItem label={t('email_primary.text')} value={vendorDetails?.Email} />
          <DetailItem
            label={t('diakinEntityName.text')}
            value={vendorDetails?.entity_details?.Entity_Name}
          />
          <DetailItem label={t('abcIndicator.text')} value={vendorDetails?.ABC_Indicator} />
          {userType === ADMIN_USER_TYPE && (
            <>
              <DetailItem
                label={'Invoice PO Based'}
                value={
                  <div className="d-flex">
                    <ToggleSwitch
                      // customclassName="!w-12"
                      defaultValue={vendorDetails?.Is_Active}
                      onToggle={(newStatus) => handleToggleStatus(vendorDetails, newStatus)}
                    />
                    <span className="text-sm ml-2 font-medium">Inline Level</span>
                  </div>
                }
              />
              {/* <DetailItem label={"Non PO Access"} value={<ToggleSwitch
                  defaultValue={vendorDetails?.Non_PO_Access}
                  onToggle={(newStatus) => handleNonPOAccess(vendorDetails, newStatus)}
                />} /> */}
            </>
          )}
        </div>
      </div>
      <hr />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.gcDetailsInputs}>
          <div>
            <div className="mb-2">
              <InputBox
                titleLabel={t('streetHouseNo.text')}
                className="signInInput inputBox mb-0"
                name="Street_House_No"
                type="text"
                register={register}
                rules={{
                  required: t('streetHouseNo.error'),
                  validate: (value) => streetValidator(t('streetHouseNo.text'), value)
                }}
                error={errors.Street_House_No}
                isRequired
                tooltipMessage={t('streetHouseNo.tooltip')}
                tooltipIcon
                maxLength={70}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="City"
                control={control}
                rules={{
                  required: t('city.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('city.text')}
                      value={value}
                      onChange={onChange}
                      options={cityAndRegionData?.cities}
                      name="City"
                      isRequired
                      tooltipMessage={t('city.tooltip')}
                      tooltipIcon
                    />
                  </div>
                )}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Industry_Key"
                control={control}
                rules={{
                  required: t('industryKey.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('industryKey.text')}
                      value={value}
                      onChange={onChange}
                      options={dropdownData?.industryKeys}
                      name="Industry_Key"
                      isRequired
                      tooltipMessage={t('industryKey.tooltip')}
                      tooltipIcon
                    />
                  </div>
                )}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Taxble_Basis"
                control={control}
                rules={{
                  required: t('taxableBasis.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('taxableBasis.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      name="Taxble_Basis"
                      isRequired={true}
                      tooltipMessage={t('taxableBasis.tooltip')}
                      tooltipIcon
                      options={dropdownData?.taxabilityBasis}
                      // disabled={whtApplicableValue === 'No'}
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div>
            <div className="mb-2">
              <InputBox
                titleLabel={t('postalCode.text')}
                className="signInInput inputBox mb-0"
                name="Postal_Code"
                type="text"
                register={register}
                rules={{
                  required: t('postalCode.error'),
                  validate: (value) => postalCodeValidator(t('postalCode.text'), value)
                }}
                error={errors.Postal_Code}
                isRequired
                tooltipMessage={t('postalCode.tooltip')}
                tooltipIcon
                maxLength={10}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Region"
                control={control}
                rules={{
                  required: t('region.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('region.text')}
                      value={value}
                      onChange={onChange}
                      options={cityAndRegionData?.regions}
                      name="Region"
                      isRequired
                      tooltipMessage={t('region.tooltip')}
                      tooltipIcon
                    />
                  </div>
                )}
              />
            </div>
            <div className="mb-2">
              <InputBox
                titleLabel={t('fax.text')}
                className="signInInput inputBox mb-0"
                name="Fax"
                type="text"
                register={register}
                rules={{
                  validate: (value) => {
                    if (!value) return true
                    return faxValidator(t('fax.text'), value)
                  }
                }}
                error={errors.Fax}
                tooltipIcon
                tooltipMessage={t('fax.tooltip')}
                maxLength={30}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Wht_Rate"
                control={control}
                rules={{
                  required: whtApplicableValue === 'Yes' ? t('whtRate.error') : false
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('whtRate.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      name="Wht_Rate"
                      isRequired={whtApplicableValue === 'Yes' || whtApplicableValue === null}
                      tooltipIcon
                      options={dropdownData?.whtRates}
                      tooltipMessage={t('whtRate.tooltip')}
                      disabled={whtApplicableValue === 'No'}
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Country"
                control={control}
                rules={{
                  required: t('country.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('country.text')}
                      value={value}
                      options={dropdownData?.countries}
                      name="Country"
                      isRequired
                      tooltipMessage={t('country.tooltip')}
                      tooltipIcon
                      // onChange={(event) => {
                      //   const selectedValue = event?.target?.value
                      //   onChange(selectedValue)
                      //   handleSetSelectedCountry(selectedValue)
                      // }}
                      onChange={onChange}
                    />
                  </div>
                )}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Industry_Type"
                control={control}
                rules={{
                  required: t('industrytype.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('industrytype.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={industryTypeOptions}
                      name="Industry_Type"
                      isRequired
                      tooltipIcon
                      tooltipMessage={t('industrytype.tooltip')}
                    />
                  </div>
                )}
              />
            </div>
            <div className={`${styles.userInputs} mb-2`}>
              <Controller
                name="Wht_Applicable"
                control={control}
                rules={{
                  required: t('whtApplicable.error')
                }}
                defaultValue=""
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mb-0"
                      error={error}
                      titleLabel={t('whtApplicable.text')}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={whtApplicableOptions}
                      name="Wht_Applicable"
                      isRequired
                      tooltipIcon
                      tooltipMessage={t('whtApplicable.tooltip')}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
        {
          <div className="d-flex justify-content-end mt-4">
            <NormalButton
              label={t('otp:cancel')}
              outlineBtn
              customClass={`${styles.submitBtn} me-3`}
              type="button"
              onClick={() => setIsEditable(false)}
            />
            <NormalButton
              label={isVendorsProfilePage ? 'Update' : t('myprofile:submitForReview')}
              trackBtn
              customClass={styles.submitBtn}
              type="submit"
            />
          </div>
        }
      </form>
      <CustomModal
        open={confirmProfileDelete}
        onClose={() => setConfirmProfileDelete(false)}
        modalStyles={{ width: 400 }}
        closeIcon
        header={t('popup:confirmSubmission')}
        //title={'Confirm Submission'}
        description={t('popup:deleteProfileConfirmation')}>
        {/* <p className="modalTxt">{t('popup:confirmChangeEntity')}</p> */}
        <div className="d-flex justify-content-space-between mb-2">
          <NormalButton
            label={t('otp:cancel')}
            outlineBtn
            customClass="confimationBtns me-3"
            onClick={() => setConfirmProfileDelete(false)}
          />
          <NormalButton
            label={t('otp:confirm')}
            isPrimaryModal
            isLoading={isDeleteLoading}
            disabled={isDeleteLoading}
            customClass="confimationBtns "
            onClick={handleProfileDelete}
          />
        </div>
      </CustomModal>
    </div>
  )
}

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
  userInfo: state.userInfo
})

const mapDispatchToProps = { showToast }

export default connect(mapStateToProps, mapDispatchToProps)(EditGeneralCommunicationComp)
