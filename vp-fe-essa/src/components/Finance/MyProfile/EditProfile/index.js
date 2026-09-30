import { HeaderBar } from 'components/Common/HeaderBar'
import { LeftPageContainer } from 'pages/vendor/dashboard/dashboard.styles'
import React from 'react'
import styled from 'styled-components'
import { Box, Button, Grid, Typography } from '@mui/material'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'
import { NormalButton } from 'components/Common'
import { useNavigate } from 'react-router-dom'
import { FINANCE_USER_TYPE, VENDOR_PORTAL } from 'constants/userType'
import { PROFILE_RESET_PASSWORD } from 'constants/url'
import { emailReport, downloadIcon2 } from 'constants/imageConstants'
import { useTranslation } from 'react-i18next'

const HeaderWrapper = styled.div`
  display: flex;
  justify-content: space-between;
`

const IconSec = styled.div`
  display: flex;
`

const EmailDownloadIcon = styled.img`
  height: 40px;
  width: 40px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: white;
  padding: 5px;
  margin-right: 10px;
`

const FormContainer = styled(Box)`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
`

export const FinanceEditProfile = () => {
  const {
    register,
    formState: { errors }
  } = useForm()

  const navigate = useNavigate()
  const { t } = useTranslation('reset-pasword')
  return (
    <>
      <LeftPageContainer>
        <HeaderWrapper>
          <HeaderBar title="Profile" slug="Home / Profile" />
          <IconSec>
            <EmailDownloadIcon src={emailReport} />
            <EmailDownloadIcon src={downloadIcon2} />
          </IconSec>
        </HeaderWrapper>

        <FormContainer>
          <form>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ color: 'var(--brand-primary-color, $primary-color)', fontSize: '16px', fontWeight: 600 }}>
                Profile
              </Typography>
              <NormalButton label="Update" isPrimary />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <div>
                  <InputBox
                    titleLabel="Name"
                    className="login-input inputBox mb-0"
                    name="name"
                    type="name"
                    register={register}
                    rules={{
                      required: 'Name is required'
                    }}
                    error={errors.email}
                    isRequired
                    tooltipIcon
                  />
                </div>
              </Grid>

              <Grid item xs={12} md={6}>
                <div>
                  <InputBox
                    titleLabel="Email"
                    className="login-input inputBox mb-0"
                    name="email"
                    type="email"
                    register={register}
                    rules={{
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address'
                      }
                    }}
                    error={errors.email}
                    isRequired
                    tooltipIcon
                  />
                </div>
              </Grid>
            </Grid>
            <Button
              variant="text"
              sx={{
                color: 'var(--brand-primary-color, $primary-color)',
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'none',
                padding: 0,
                minWidth: 'unset',
                textDecorationLine: 'underline'
              }}
              onClick={() => navigate(`/${FINANCE_USER_TYPE}${PROFILE_RESET_PASSWORD}`)}>
              {t('reset-pasword:reset_pwd')}
            </Button>
          </form>
        </FormContainer>
      </LeftPageContainer>
    </>
  )
}
