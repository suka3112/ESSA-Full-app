import * as React from 'react'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
import { NormalButton } from '../../../Common/NormalButton'
import './TrackYourUpdates.scss'
import { useNavigate } from 'react-router-dom'
import { connect } from 'react-redux'
import { CircularProgress } from 'components/Common'
import { PageLoader } from 'components/Common/PageLoader'
import { useTranslation } from 'react-i18next'
import CustomStepIcon from 'components/Common/CustomStepIcon'

function TrackYourUpdates({ trackUpdatesData, setOpenTUPopup, loadingTU }) {
  const { t } = useTranslation(['purchase_order', 'general_details_comp'])

  if (loadingTU) {
    return (
      <div className="flex justify-center items-center py-10">
        <PageLoader />
      </div>
    )
  }




  const reqStatus = trackUpdatesData?.status
  const application_number = trackUpdatesData?.application_number

  //both 1 and 7 as status 1
  const normalizedStatus = reqStatus === 7 ? 1 : reqStatus

   let steps = [
    { status: 1, label: t('general_details_comp:requestSubmitted') },
    { status: 2, label: t('login:reviewInProgress') },
    { status: 3, label: t('login:awaitingForApproval') },
    { status: 4, label: t('dashboard:approved') }
  ]

  if (normalizedStatus === 5) {
    steps = steps.filter((step) => step.status !== 4) // Remove "Approved"
    steps.push({ status: 5, label: t('extension:rejected') }) // Add "Rejected"
  }

  const activeStep = steps.findIndex((step) => step.status === normalizedStatus) || 0

  const displayTextMap = {
    "Request Submitted Successfully": "Submitted Successfully",
    "Review In Progress": "In Review",
    "Awaiting For Approval": "Awaiting for Approval",
    Approved: "Approved",
    Rejected: "Rejected",
  };

  const stepLabel = steps[activeStep]?.label || "Unknown Status";
  const displayText = displayTextMap[stepLabel] || stepLabel;

  return (
    <div>
      <p className="applicationText mb-4">
        {t('general_details_comp:trackUpdateRequest')}{' '}
        <span className="submittedText">{displayText}</span>.
      </p>

      {/* Show Stepper only for statuses 1, 2, 3, and 5 */}
      {[1, 2, 3, 4, 5, 7].includes(reqStatus) && (
        <Box sx={{ maxWidth: 400 }}>
          <Stepper activeStep={activeStep} orientation="vertical"
            sx={{
              '& .MuiStepConnector-vertical': {
                marginLeft: '10px',
              }
            }}
          >
            {steps.map((step) => {
        const isCompleted = step.status <= normalizedStatus;
        return (
              <Step key={step.status} completed={isCompleted}>
                <StepLabel
                  StepIconComponent={(props) => (
                  <CustomStepIcon {...props} completed={isCompleted} />
              )}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: reqStatus === 5 && step.status === 5 && '#d50000'
                    },
                    '& .MuiStepIcon-root': {
                      color: reqStatus === 5 && step.status === 5 && '#FF0000'
                    }
                  }}
                  StepIconProps={{
                    sx: {
                      color: reqStatus === 5 && step.status === 5 && '#d50000'
                    }
                  }}>
                  {step.label}
                </StepLabel>
                <StepContent></StepContent>
              </Step>
                );
            })}
          </Stepper>
        </Box>
      )}
      {/* <hr className="my-4" />
      <p className="reqNumberTxt">
        Your Request Number is <span>{application_number}</span>
      </p> */}
      <NormalButton
        label={t('purchase_order:close')}
        customClass="w-100 mt-4"
        outlineBtn
        type="button"
        onClick={() => setOpenTUPopup(false)}
      />
      <hr className="mt-4" />
    </div>
  )
}

const mapStateToProps = (state) => ({
  trackApplication: state.trackApplication.applicationStatus,
})

export default connect(mapStateToProps, null)(TrackYourUpdates)
