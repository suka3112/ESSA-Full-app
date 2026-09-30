import * as React from 'react'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
import { NormalButton } from '../../../Common/NormalButton'
import './style.scss'
import { useNavigate } from 'react-router-dom'
import { connect } from 'react-redux'
import { useTranslation } from 'react-i18next'
import CustomStepIcon from 'components/Common/CustomStepIcon'

function VerticalLinearStepperComp({ trackApplication, userInfo: { userType } }) {
  const navigate = useNavigate()
  const { t } = useTranslation(['login', 'myprofile'])

  let steps = [
    { status: 1, label: t('applicationSubmittedSuccessfully') },
    { status: 2, label: t('reviewInProgress') },
    { status: 3, label: t('awaitingForApproval') },
    { status: 4, label: t('myprofile:approved') }
  ]

  if (trackApplication?.registration_status === 5) {
    steps = steps.filter((step) => step.status !== 4) // Remove "Approved"
    steps.push({ status: 5, label: 'Rejected' }) // Add "Rejected"
  }

  const activeStep = steps.findIndex((step) => step.status === trackApplication?.registration_status) || 0;
  return (
    <div className="login-container progress-container">
      {trackApplication?.registration_status !== 4 && (
        <p className="applicationText mb-4">
          {t('yourApplicationStatus')}: <span className="submittedText hidden">{steps[activeStep]?.label}</span>
        </p>
      )}

      {/* Show Stepper only for statuses 1, 2, 3, and 5 */}
      {![4].includes(trackApplication?.registration_status) && (
        <Box sx={{ maxWidth: 400 }}>
          <Stepper activeStep={activeStep} orientation="vertical"
            sx={{
              '& .MuiStepConnector-vertical': {
                marginLeft: '10px',
              }
            }}
          >
            {steps.map((step) => (
              <Step key={step.status}>
                <StepLabel
                  StepIconComponent={CustomStepIcon}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color:
                        trackApplication?.registration_status === 5 &&
                        step.status === 5 &&
                        '#d50000'
                    },
                    '& .MuiStepIcon-root': {
                      color:
                        trackApplication?.registration_status === 5 &&
                        step.status === 5 &&
                        '#FF0000'
                    }
                  }}
                  StepIconProps={{
                    sx: {
                      color:
                        trackApplication?.registration_status === 5 &&
                        step.status === 5 &&
                        '#d50000'
                    }
                  }}>
                  {step.label}
                </StepLabel>
                <StepContent></StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      {/* Show 'Congratulations' message only for status 4 */}
      {trackApplication?.registration_status === 4 && (
        <div className="success-message">
          <h2>{t('congratulations')}</h2>
          <p className="my-4">
            {t('yourApplicationApproved')} <span className="submittedText">{t('myprofile:approved')}</span>.
          </p>
          <p>{t('credentialsSentToRegisteredEmail')}</p>
        </div>
      )}

      <div className="status-text mb-3">
        {trackApplication?.registration_status === 5 ? (
          <p style={{ color: '#FF0000' }}>
            {trackApplication?.comments || 'No comments available'}
          </p>
        ) : (
          <>
            {activeStep === 0 && (
              <>
                <p>{t('onceApprovedNotificationSentToEmail')}.</p>
                <span>{t('applicationCannotBeEditedUnderReview')}</span>
              </>
            )}
            {(activeStep === 1 || activeStep === 2) && (
              <p>
                {t('receiveCredentialsOnceApproved')}
              </p>
            )}
          </>
        )}
      </div>

      {/* Buttons */}
      {trackApplication?.registration_status !== 4 ? (
        <>
          {/* <NormalButton
            label={t('editYourApplication')}
            customClass="login-button my-5"
            isPrimary
            type="submit"
            style={{ display: activeStep === 0 ? 'block' : 'none' }}
            onClick={() =>
              navigate(`/${userType}/register?mode=edit&id=${trackApplication?.applicationId}`)
            }
          /> */}
          {/* {trackApplication?.registration_status !==5 &&
          <NormalButton
            label={t('viewYourApplication')}
            customClass="login-button my-5"
            isPrimary
            type="submit"
            style={{ display: activeStep === 3 ? 'block' : 'none' }}
          />
} */}
          <NormalButton
            label={t('goBack')}
            trackBtn
            customClass="login-button"
            // style={{ display: activeStep !== 2 ? 'block' : 'none' }}
            onClick={() => navigate(-1)}
          />
        </>
      ) : (
        <>
          {/* <NormalButton
            label={t('viewYourApplication')}
            customClass="login-button my-5"
            isPrimary
            type="button"
            onClick={() =>
              navigate(`/${userType}/register?mode=view&id=${trackApplication?.applicationId}`)
            }
          /> */}
          {trackApplication?.registration_status === 3 && (
            <div className="border-bottom mt-5"></div>
          )}
          <NormalButton
            label={t('goBack')}
            customClass="login-button"
            outlineBtn
            type="button"
            onClick={() => navigate(-1)}
          />
        </>
      )}
    </div>
  )
}

const mapStateToProps = (state) => ({
  trackApplication: state.trackApplication.applicationStatus,
  userInfo: state.userInfo
})

export default connect(mapStateToProps, null)(VerticalLinearStepperComp)
