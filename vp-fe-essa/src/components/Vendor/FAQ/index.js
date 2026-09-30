// FAQ.js
import React, { useState, useEffect, startTransition, Suspense } from 'react'
import DOMPurify from 'dompurify'
import { Typography, useMediaQuery } from '@mui/material'
import { Container, LeftPanel, RightPanel, StyledTabs, StyledTab } from './FAQ.style'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import { HeaderBar } from 'components/Common/HeaderBar'
import { Box } from '@mui/material'
import { connect } from 'react-redux'
import Accordion from 'components/Common/Accordion'
import { NormalButton } from 'components/Common'
import CustomModal from 'components/Common/Modal'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import SuccessPopup from 'components/Common/SuccessPopup'
import AddFAQs from './AddFAQs'
import { deleteIcon } from 'constants/imageConstants'
import { ADMIN_USER_TYPE } from 'constants/userType'
import {
  deleteFaqQuestion,
  getFaqHeaders,
  getFaqQuestions,
  createFaqHeader,
  deleteFaqHeader,
  updateFaqQuestion,
  updateFaqHeader
} from '../../../api/Faq'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PageLoader } from 'components/Common/PageLoader'
import { showToast } from 'redux/actions/toastActions'
import { toast } from 'react-toastify'
import SVGIcon from 'components/Common/SVGIcon'

const FAQComp = ({ userInfo: { userType }, showToast }) => {
  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    setError,
    reset
  } = useForm()

  const location = useLocation()
  const headerParams = new URLSearchParams(location.search)
  const headerId = headerParams.get('id')
  const { t, i18n } = useTranslation(['sidebar', 'faq', 'toast', 'enquiries', 'otp'])
  const [tabValue, setTabValue] = useState(0)
  const [addFAQHeader, setAddFAQHeader] = useState(false)
  const [addFAQ, setAddFAQ] = useState(false)
  const [editFaqData, setEditFaqData] = useState(null)
  const [successState, setSuccessState] = useState(false)
  const [isEditHeader, setIsEditHeader] = useState(false)
  const [editHeaderId, setEditHeaderId] = useState(null)
  const [editHeaderTitle_EN, setEditHeaderTitle_EN] = useState('')
  const [editHeaderTitle_AR, setEditHeaderTitle_AR] = useState('')
  const [deleteHeaderId, setDeleteHeaderId] = useState(null)
  const [showDeleteHeaderModal, setShowDeleteHeaderModal] = useState(false)
  const [headers, setHeaders] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  // const [error, setError] = useState(null)
  const isArabic = i18n.language === 'ar'

  const isSmallScreen = useMediaQuery('(max-width:1023px)')
  useEffect(() => {
    const fetchHeaders = async () => {
      try {
        setLoading(true)
        const response = await getFaqHeaders()
        setHeaders(response.data.data)
        if (response.data.data.length > 0) {
          // Get id from URL query
          const idFromQuery = headerParams.get('id')
          let tabIndex = 0
          if (idFromQuery) {
            const foundIndex = response.data.data.findIndex(
              (h) => String(h.ID) === String(idFromQuery)
            )
            if (foundIndex !== -1) {
              tabIndex = foundIndex
            }
          }
          setTabValue(tabIndex)
          fetchQuestions(response.data.data[tabIndex].ID)
        }
      } catch (err) {
        console.error('Error fetching headers:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchHeaders()
    // eslint-disable-next-line
  }, [])
  // // Fetch all FAQ headers on component mount
  // useEffect(() => {
  //   const fetchHeaders = async () => {
  //     try {
  //       setLoading(true)
  //       const response = await getFaqHeaders()
  //       setHeaders(response.data.data)
  //       if (response.data.data.length > 0) {
  //         // Automatically fetch questions for the first header (by ID)
  //         fetchQuestions(response.data.data[0].ID)
  //       }
  //     } catch (err) {
  //       console.error('Error fetching headers:', err)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }
  //   fetchHeaders()
  // }, [])

  // Fetch questions for a specific headerId
  const fetchQuestions = async (headerId) => {
    try {
      setLoading(true)
      const response = await getFaqQuestions(headerId)
      setQuestions(response.data.data)
    } catch (err) {
      console.error('Error fetching questions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Delete FAQ Header handler
  const handleDeleteHeader = (headerId) => {
    setDeleteHeaderId(headerId)
    setShowDeleteHeaderModal(true)
  }

  const confirmDeleteHeader = async () => {
    if (!deleteHeaderId) return
    try {
      setLoading(true)
      await deleteFaqHeader(deleteHeaderId)
      setShowDeleteHeaderModal(false)
      setDeleteHeaderId(null)
      // Refresh headers list
      const headersRes = await getFaqHeaders()
      setHeaders(headersRes.data.data)
      showToast(t('faq:deletedSuccess'), t('faq:deletedSuccess'), 'success')
      // Optionally, reset questions if the deleted header was selected
      if (headersRes.data.data.length > 0) {
        fetchQuestions(headersRes.data.data[0].ID)
        setTabValue(0)
      } else {
        setQuestions([])
      }
    } catch (err) {
      console.error('Error deleting FAQ header:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue)
    // When a tab is clicked, fetch questions for that header (by ID)
    if (headers[newValue]) {
      fetchQuestions(headers[newValue].ID)
    }
  }

  // Open edit header modal, prefill with header info
  const handleEditHeader = (headerIndex = tabValue) => {
    const header = headers[headerIndex]
    if (header) {
      setEditHeaderId(header.ID)
      setEditHeaderTitle_EN(header.title_EN || '')
      setEditHeaderTitle_AR(header.title_AR || '')
      setIsEditHeader(true)
    }
  }

  // Update header API call
  const handleUpdateHeader = async (e) => {
    e.preventDefault()
    if (!editHeaderId || !editHeaderTitle_EN || !editHeaderTitle_AR) return
    try {
      setLoading(true)
      await updateFaqHeader(editHeaderId, {
        title_EN: editHeaderTitle_EN,
        title_AR: editHeaderTitle_AR
      })
      setIsEditHeader(false)
      setEditHeaderId(null)
      setEditHeaderTitle_EN('')
      setEditHeaderTitle_AR('')
      showToast(t('faq:headerUpdated'), t('enquiries:updatedSuccessfully'), 'success')
      // Refresh headers list
      const headersRes = await getFaqHeaders()
      setHeaders(headersRes.data.data)
    } catch (err) {
      setError('Failed to update FAQ header')
      console.error('Error updating FAQ header:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewFaqHeader = () => {
    setAddFAQHeader(true)
  }

  const handleCancel = () => {
    setAddFAQHeader(false)
  }

  // Add new FAQ header submit handler
  const onSubmitAddHeader = async (data) => {
    // Validate header titles for non-empty, non-space value
    const headerTitle_EN = data.faqHeader_English?.trim()
    const headerTitle_AR = data.faqHeader_Arabic?.trim()
    if (!headerTitle_EN) {
      setError('faqHeader_English', { type: 'manual', message: t('faq:headerTitleRequired') })
      return
    }
    if (!headerTitle_AR) {
      setError('faqHeader_Arabic', { type: 'manual', message: t('faq:headerTitleRequired') })
      return
    }
    try {
      setLoading(true)
      const response = await createFaqHeader({ title_EN: headerTitle_EN, title_AR: headerTitle_AR })
      setSuccessState(true)
      setAddFAQHeader(false)

      const headersRes = await getFaqHeaders()
      setHeaders(headersRes.data.data)
      reset()
    } catch (err) {
      setError('faqHeader_English', { type: 'manual', message: t('faq:failedToAddFAQHeader') })
      console.error('Error adding FAQ header:', err)
    } finally {
      setLoading(false)
    }
  }

  // Open AddFAQs for add or edit
  const handleAddFAQ = () => {
    setEditFaqData(null)
    setAddFAQ(true)
  }

  // Open AddFAQs for edit, prefill with question data
  const handleEditFAQ = (faq) => {
    setEditFaqData(faq)
    setAddFAQ(true)
  }

  // Add or update FAQ
  const handleCloseAddFaq = () => {
    setAddFAQ(false)
    setEditFaqData(null)
    // setSuccessState(true)
    // After adding/updating question, refresh the questions list for the selected header
    if (headers[tabValue]) {
      fetchQuestions(headers[tabValue].ID)
    }
  }

  // Update FAQ handler
  const handleUpdateFaq = async (data) => {
    if (!editFaqData) return
    try {
      setLoading(true)
      await updateFaqQuestion(editFaqData.ID, data)
      showToast(t('faq:questionAndAnswerUpdate'), t('enquiries:updatedSuccessfully'), 'success')
      handleCloseAddFaq()
    } catch (err) {
      toast.error(err?.message || t('faq:failedToUpdateFAQ'))
      console.error('Error updating FAQ:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteQnA = (questionId) => {
    deleteFaqQuestion(questionId)
      .then(() => {
        showToast(t('faq:deletedSuccess'), t('faq:deletedSuccess'), 'success')
        // After deletion, refresh the questions list for the selected header
        if (headers[tabValue]) {
          fetchQuestions(headers[tabValue].ID)
        }
      })
      .catch((err) => {
        toast.error(err?.message || t('faq:failedToDeleteQuestion'))
        console.error('Error deleting question:', err)
      })
  }

  const modalStyles = {
    padding: '40px',
    width: '450px'
  }

  if (loading && headers.length === 0) {
    return (
      <div className="no-data-container-view">
        <PageLoader />
      </div>
    )
  }

  return (
    <LeftPageContainer>
      <HeaderBar title={t('faqs')} slug={`${t('home')} / ${t('faqs')}`}>
        {userType === ADMIN_USER_TYPE && (
          <NormalButton
            label={t('faq:addNewFAQsHeader')}
            isPrimary
            customClass="px-3"
            onClick={handleAddNewFaqHeader}
          />
        )}
      </HeaderBar>
      <Container>
        {/* Left Panel - Tabs */}
        <LeftPanel className="mb-4 max-w-full" style={{ paddingLeft: isArabic ? '20px' : '' }}>
          <StyledTabs
            className={'max-w-full'}
            variant="scrollable"
            orientation={isSmallScreen ? 'horizontal' : 'vertical'}
            value={tabValue}
            onChange={handleTabChange}
            aria-label="Vertical tabs">
            {headers?.map((header, index) => (
              <StyledTab
                className="max-[1023px]:!mr-2 max-[1023px]:!mt-0 text-capitalize"
                key={header.faq_header_id}
                label={
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={1}
                    width="100%">
                    <span style={{ textAlign: 'start' }}>
                      {isArabic ? header.title_AR : header.title_EN}
                    </span>
                    {userType === ADMIN_USER_TYPE && (
                      <Box display="flex" alignItems="center" gap={1} ml="unset">
                        <img
                          src={deleteIcon}
                          alt="delete"
                          width={16}
                          height={16}
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteHeader(header.ID)
                          }}
                        />
                        {index === tabValue ? (
                          <SVGIcon
                            useThemeColor={false}
                            name="whiteEdit"
                            size={16}
                            onClick={() => startTransition(() => handleEditHeader(index))}
                          />
                        ) : (
                          <SVGIcon
                            name="edit"
                            size={16}
                            onClick={() => startTransition(() => handleEditHeader(index))}
                          />
                        )}
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
            {/* Delete Header Confirmation Modal */}
            {showDeleteHeaderModal ? (
              <Suspense fallback={<div>Loading...</div>}>
                <CustomModal
                  open={showDeleteHeaderModal}
                  onClose={() => setShowDeleteHeaderModal(false)}
                  closeIcon
                  modalStyles={{ width: '550px' }}>
                  <div className="flex flex-col justify-between h-[120px] w-full">
                    <p className="modalTxt mb-4 text-center">{t('faq:deleteConfirm')}</p>
                    <div className="w-full flex justify-between gap-4 mt-auto mb-2">
                      <NormalButton
                        label={t('otp:cancel')}
                        customClass="w-[200px]"
                        outlineBtn
                        onClick={() => setShowDeleteHeaderModal(false)}
                      />
                      <NormalButton
                        label={t('otp:confirm')}
                        customClass="w-[200px]"
                        isPrimary
                        onClick={confirmDeleteHeader}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </CustomModal>
              </Suspense>
            ) : null}
          </StyledTabs>
        </LeftPanel>

        {/* Right Panel - Custom Accordions */}
        <RightPanel>
          {userType === ADMIN_USER_TYPE && (
            <div className="d-flex justify-content-end mt-3">
              <NormalButton
                label={t('faq:addQuestionsAndAns')}
                outlineBtn
                customClass=" px-4 mb-3 me-3"
                onClick={handleAddFAQ}
              />
            </div>
          )}
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <PageLoader />
            </div>
          ) : questions?.length > 0 ? (
            questions?.map((question, index) => {
              const displayQuestion = isArabic ? question.question_AR : question.question_EN
              const displayAnswer = isArabic ? question.answer_AR : question.answer_EN
              const questionWithDisplay = { ...question, question: displayQuestion }

              return (
                <Accordion
                  question={questionWithDisplay}
                  deleteQnA={deleteQnA}
                  key={index}
                  onEdit={() => handleEditFAQ(question)}>
                  {/* Render rich text content safely with DOMPurify */}
                  <Typography
                    className="ql-editor"
                    variant="body1"
                    paragraph
                    dangerouslySetInnerHTML={{ __html: displayAnswer }}
                    sx={{
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-line',
                      direction: isArabic ? 'ltr' : '',
                      textAlign: isArabic ? 'end' : '',
                      paddingRight: isArabic ? '0px' : '',
                      paddingLeft: !isArabic ? '0px' : ''
                    }}
                  />
                </Accordion>
              )
            })
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              <Typography variant="h5">{t('faq:noQuestionsAvailableForThisHeader')}</Typography>
            </div>
          )}
        </RightPanel>
      </Container>
      {addFAQHeader ? (
        <Suspense fallback={<div>Loading...</div>}>
          <CustomModal
            open={addFAQHeader}
            onClose={handleCancel}
            closeIcon
            modalStyles={{ ...modalStyles, width: '500px' }}>
            <form onSubmit={handleSubmit(onSubmitAddHeader)}>
              <p className="modalTxt mb-4 text-left">{t('faq:addNewFAQs')}</p>
              <InputBox
                titleLabel={t('faq:addNewFAQsHeader') + ' (English)'}
                className="signInInput inputBox mb-3"
                name="faqHeader_English"
                type="text"
                register={register}
                isRequired
                rules={{
                  required: t('faq:tiltleIsRequired')
                }}
              />
              {errors.faqHeader_English && (
                <p className="text-danger mt-1">{errors.faqHeader_English.message}</p>
              )}
              <InputBox
                titleLabel={t('faq:addNewFAQsHeader') + ' (Arabic)'}
                className="signInInput inputBox mb-3"
                name="faqHeader_Arabic"
                type="text"
                register={register}
                isRequired
                rules={{
                  required: t('faq:tiltleIsRequired')
                }}
              />
              {errors.faqHeader_Arabic && (
                <p className="text-danger mt-1">{errors.faqHeader_Arabic.message}</p>
              )}
              <div className="my-4 w-100">
                <NormalButton
                  label={t('faq:addNewHeader')}
                  isPrimary
                  type="submit"
                  customClass="w-100"
                  disabled={loading}
                />
              </div>
            </form>
          </CustomModal>
        </Suspense>
      ) : null}
      {isEditHeader ? (
        <Suspense fallback={<div>Loading...</div>}>
          <CustomModal
            open={isEditHeader}
            onClose={() => setIsEditHeader(false)}
            closeIcon
            modalStyles={{ ...modalStyles, width: '500px' }}>
            <form onSubmit={handleUpdateHeader}>
              <p className="modalTxt mb-4 text-left">{t('faq:updateHeader')}</p>
              <InputBox
                titleLabel={t('faq:header') + ' (English)'}
                className="signInInput inputBox mb-3"
                name="header_en"
                type="text"
                value={editHeaderTitle_EN}
                onChange={(e) => setEditHeaderTitle_EN(e.target.value)}
                isRequired
              />
              <InputBox
                titleLabel={t('faq:header') + ' (Arabic)'}
                className="signInInput inputBox mb-3"
                name="header_ar"
                type="text"
                value={editHeaderTitle_AR}
                onChange={(e) => setEditHeaderTitle_AR(e.target.value)}
                isRequired
              />
              <div className="my-4 w-100">
                <NormalButton
                  label={t('faq:updateHeader')}
                  isPrimary
                  customClass="w-100"
                  type="submit"
                  disabled={loading}
                />
              </div>
            </form>
          </CustomModal>
        </Suspense>
      ) : null}
      {successState ? (
        <Suspense fallback={<div>Loading...</div>}>
          <SuccessPopup
            open={successState}
            successMsg={t('faq:faqAddedSuccessFully')}
            onClose={() => setSuccessState(false)}
          />
        </Suspense>
      ) : null}
      {addFAQ ? (
        <Suspense fallback={<div>Loading...</div>}>
          <AddFAQs
            open={addFAQ}
            onClose={handleCloseAddFaq}
            headerId={headers[tabValue]?.ID}
            headerTitle={headers[tabValue]?.title}
            initialData={editFaqData}
            onUpdate={handleUpdateFaq}
            showToast={showToast}
          />
        </Suspense>
      ) : null}
    </LeftPageContainer>
  )
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo // Getting userInfo from Redux store
})
const mapDispatchToProps = {
  showToast
}

export default connect(mapStateToProps, mapDispatchToProps)(FAQComp)
