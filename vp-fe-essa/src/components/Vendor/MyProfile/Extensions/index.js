import { NormalButton } from 'components/Common'
import TableComponent from 'components/Common/TableComponent'
import React, { useCallback, useEffect, useState } from 'react'
import './style.scss'
import CustomModal from 'components/Common/Modal'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import { SelectBox } from 'components/Common/SelectBox'
import { useTranslation } from 'react-i18next'
import {
  getCRPersons,
  getExtensionDetails,
  addExtensionApi,
  getEntityExtentionDropdown,
  getTrackUpdates
} from 'api/MyProfile'
import dayjs from 'dayjs'
import { showToast } from '../../../../redux/actions/toastActions'
import { connect, useSelector } from 'react-redux'
import { Validator } from 'services/validation/formValidations'
import SuccessPopup from 'components/Common/SuccessPopup'
import useTableFeatures from 'hooks/useTableFeatures'
import { getEntityId } from 'services/utilities'
import TableLayout from 'components/Common/TableComponent/TableLayout'
import { toast } from 'react-toastify'
import TrackYourUpdatesPopup from '../TrackYourUpdatesPopup'

const ExtensionsComp = ({ showToast, addExtension, setaddExtension }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    reset
  } = useForm()

  const { t,i18n } = useTranslation(['extension', 'myprofile', 'popup', 'toast'])
 const isArabic = i18n.language === 'ar'
  //const [addExtension, setaddExtension] = useState(false)
  const [extensionData, setextensionData] = useState(null)
  const [crPersonsOptions, setCrPersonsOptions] = useState([])
  const [entityOptions, setEntityOptions] = useState([])
  const [extensionSuccessPopup, setExtensionSuccessPopup] = useState(false)
  const [openTUPopup, setOpenTUPopup] = useState(false)
  const [trackUpdatesData, setTrackUpdatesData] = useState(null)
  const [trackUpdatesLoading, setTrackUpdatesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const vendorUserType = useSelector((state) => state?.userInfo?.Vendor_Role)

  const {
    page,
    rowsPerPage,
    search,
    order,
    orderBy,
    setPageMeta,
    setLoader,
    handleSearchValue,
    tableProps
  } = useTableFeatures()

  const modalStyles = {
    maxWidth: '456px'
  }


  useEffect(() => {
    fetchExtensionList()
  }, [page, rowsPerPage, search, order, orderBy])

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchExtensionList = () => {
    setLoader(true)
    let query = {
      entity_id: getEntityId(),
      page: page,
      limit: rowsPerPage,
      sort: order,
      sort_column: orderBy
    }

    // Clean up empty values
    Object.keys(query).forEach((key) => {
      if (!query[key] || query[key] === 'All') delete query[key]
    })
    getExtensionDetails(query)
      .then((res) => {
        setextensionData(res?.data?.data?.results)
        setPageMeta(res?.data?.data?.pageMeta)
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        setLoader(false)
      })
  }

  const fetchDropdownData = useCallback(() => {

    Promise.all([getEntityExtentionDropdown()])
      .then(([entityRes]) => {


        const entityOptions = entityRes?.data?.data?.map((entity) => ({
          label: isArabic ? entity?.Entity_Name_AR : entity?.Entity_Name,
          value: entity?.CoCd
        }))

        setEntityOptions(entityOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }, [])
  const fetchCRDropdownData = (id) => {
    let query = {
      entity_id: id
    }
    Promise.all([getCRPersons(query), getEntityExtentionDropdown()])
      .then(([crPersonsRes, entityRes]) => {
        const crPersonsOptions = crPersonsRes?.data?.data?.map((person) => ({
          label: person.Name,
          value: person.Employee_Id
        }))

        const entityOptions = entityRes?.data?.data?.map((entity) => ({
          label: entity?.Entity_Name,
          value: entity?.CoCd
        }))

        setCrPersonsOptions(crPersonsOptions)
        setEntityOptions(entityOptions)
      })
      .catch((err) => console.error('Error fetching dropdown data:', err))
  }

  const handleAddExtension = () => {
    reset()
    setaddExtension(true)
  }

  const handleCancelSubmit = () => {
    reset()
    setaddExtension(false)
  }

  const onSubmit = (data) => {
    setLoading(true)
    let body = {
      entityId: data?.entity,
      crId: data?.crPerson,
      reason: data?.reason
    }
    addExtensionApi(body)
      .then((res) => {
        setaddExtension(false)
        fetchExtensionList()
        setExtensionSuccessPopup(true)
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || t('toast:failedToAddExtension'))
      })
      .finally(() => {
        setLoading(false)
      })
  }

  const trackUpdates = (cocdId) => {
    setOpenTUPopup(true)
    setTrackUpdatesLoading(true)
    let body = {
      "is_extension": true
    }

    let query = {
      entity_id: cocdId
    }

    getTrackUpdates(body, query)
      .then((res) => {
        setTrackUpdatesData({
          id: res?.data?.data?.ID,
          application_number: res?.data?.data?.Application_Number,
          status: res?.data?.data?.Status
        })
      })
      .catch((err) => {
        console.error(err)
        toast.error(t('toast:failedToFetchTrackUpdates'))
      })
      .finally(() => {
        setTrackUpdatesLoading(false)
      })
  }

  const headers = [
    { key: 'entity', label: t('myprofile:entity'), sortable: true, sortKey: 'entity' },
    { key: 'crPerson', label: t('crPerson.text'), sortable: true, sortKey: 'cr_id' },
    { key: 'submittedDate', label: t('myprofile:submittedDate'), sortable: true, sortKey: 'Extension_request_date' },
    { key: 'approved', label: t('myprofile:approved'), sortable: true, sortKey: 'Extension_granted_date' },
    { key: 'status', label: t('myprofile:status'), sortable: true, sortKey: 'statusus' }
  ]

  const formattedExtensionData = extensionData
    ? extensionData?.map((item) => ({
      entity: (
        <span
          className="clickable-entity"
          onClick={() => trackUpdates(item?.CoCd)}
        >
          {item?.entity_details?.Entity_Name || 'Unknown Entity'}
        </span>
      ),
      crPerson: item?.CR_details?.Employee_Name,
      submittedDate: item?.Extension_request_date
        ? dayjs(item?.Extension_request_date).format('DD/MM/YYYY')
        : '',
      approved: item?.Extension_granted_date
        ? dayjs(item?.Extension_granted_date).format('DD/MM/YYYY')
        : '',
      status: item?.statusus?.Status_classification || ''
    }))
    : []

  const alphaNumericValidator = new Validator()
    .validateAtLeastOneCharacter()
    .validateNotOnlySymbols()
    .validateMinLength(3)
    .validateMaxLength(255)
    .build()

  return (
    <div className="extensionContainer">
      <div className="subHeader">
        <div className="headerTitle fs-5">{t('extensionDetails')}</div>
        {vendorUserType === "Admin" &&
          <NormalButton
            isPrimary
            label={t('addNewExtension')}
            customClass="addBtn !h-[40px]"
            onClick={handleAddExtension}
          />
        }
      </div>

      <TableLayout
        tableHeaders={headers}
        tableData={formattedExtensionData}
        {...tableProps}
      />

      <CustomModal open={addExtension} onClose={handleCancelSubmit} closeIcon>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="entity"
            control={control}
            rules={{
              required: t('selectEntity.error')
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="select-container">
                <div className="d-flex">
                  <div>
                    <label className="selectLabel">{t('selectEntity.text')}</label>
                    <span className="required">*</span>
                  </div>
                </div>
                <SelectBox
                  className="custom-select-box mt-1"
                  error={error}
                  label="Select Entity"
                  onChange={(e) => {
                    onChange(e.target.value);
                    fetchCRDropdownData(e.target.value)
                  }}
                  options={entityOptions}
                  value={value}
                  name="entity"
                  isRequired
                  placeholder={t('selectEntity.text')}
                />
              </div>
            )}
          />
          <Controller
            name="crPerson"
            control={control}
            rules={{ required: t('crPerson.error') }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <div className="selectContainer">
                <div className="d-flex mt-2">
                  <div>
                    <label className="selectLabel">{t('crPerson.text')}</label>
                    <span className="required">*</span>
                  </div>
                </div>
                <SelectBox
                  className="custom-select-box mt-1 mb-0"
                  error={error}
                  label="CR Person"
                  options={crPersonsOptions}
                  onChange={(e) => onChange(e.target.value)}
                  value={value}
                  name="crPerson"
                  isRequired
                  placeholder={t('crPerson.text')}
                />
              </div>
            )}
          />
          <div className="my-3">
            <Controller
              name="reason"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value) return true
                  return alphaNumericValidator('Reason for Extension', value)
                }
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <InputBox
                  titleLabel={t('reason.text')}
                  className="signInInput inputBox mb-0"
                  name="reason"
                  type="text"
                  // register={register}
                  tooltipIcon
                  tooltipMessage={t('reason.tooltip')}
                  error={error}
                  onChange={onChange}
                  value={value || ''}
                  maxLength={255}
                />
              )}
            />
          </div>
          <div className="my-4 w-100">
            <NormalButton
              label={t('myprofile:submitForReview')}
              isPrimary
              customClass="w-100"
              type="submit"
              isLoading={loading}
            />
          </div>
        </form>
      </CustomModal>
      {extensionSuccessPopup && (
        <SuccessPopup
          open={extensionSuccessPopup}
          successMsg={t('requestSubmitted')}
          subText={t('popup:newEntityRequestSuccess')}
          onClose={() => setExtensionSuccessPopup(false)}
        />
      )}

      {openTUPopup && (
        <CustomModal
          open={openTUPopup}
          modalStyles={modalStyles}
          onClose={() => {
            setOpenTUPopup(false)
            setTrackUpdatesData(null)
            setTrackUpdatesLoading(false)
          }}
        >
          {trackUpdatesLoading ? (
            <div className="text-center p-4">
              <div className="spinner-border text-primary" role="status">
              </div>
              <p className="mt-2">Loading track updates...</p>
            </div>
          ) : (
            <TrackYourUpdatesPopup
              trackUpdatesData={trackUpdatesData}
              setOpenTUPopup={setOpenTUPopup}
            />
          )}
        </CustomModal>
      )}
    </div>
  )
}

const mapDispatchToProps = {
  showToast
}

export default connect('', mapDispatchToProps)(ExtensionsComp)
