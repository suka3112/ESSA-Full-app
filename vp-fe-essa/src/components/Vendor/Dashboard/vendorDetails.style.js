import styled from 'styled-components'
import { Box, Typography as _Typography } from '@mui/material'
export const BoxWrapper = styled(Box)`
  width: 100%;
  border-radius: 14px;
  gap: 10px;
  display: flex;
  flex-direction: column;
  background-color: white;
  box-shadow: 6px 6px 54px 0px #0000000d;
  height: auto;
`

export const ContainerDetails = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 16px;
`
export const HeaderTypography = styled(_Typography)`
  font-size: 16px !important;
  font-weight: 600 !important;
  margin-bottom: 25px !important;
`

export const DetailsTypography = styled(_Typography)`
  font-size: 16px !important;
  font-weight: 400 !important;
  color: #6c6c6c;
  margin-bottom: 25px !important;
`
export const VendorImage = styled.img`
  width: 120px;
  height: 120px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: 10px;
  padding: 20px;
  position: absolute !important;
  left: 0;
  right: 0;
  margin: auto;
  top: 20%;
`

export const VendorImgSection = styled(Box)`
  background-color: ${({ theme }) => theme.colors.primary};
  height: 100px;
  position: relative;
  margin-bottom: 55px;
`

export const VendorDetailsWrapper = styled(Box)`
  display: flex;
  gap: 20px;
  width: 100%;
  border-radius: 14px;
  background-color: white;
  box-shadow: 0px 0px 4px 0px #00000040;
  margin-bottom: 20px;
  border: 1px solid rgb(152, 162, 179);
`
export const VendorInfoContainer = styled(Box)`
  display: flex;
  width: 100%;
  justify-content: space-between;
  padding: 15px 50px 15px 2px;
}

`

export const VendorProfileImageContainer = styled(Box)`
  background-color: #81c5e5;
  padding: 12px;
  display: flex;
  align-items: center;
  border-left: 8px solid ${({ theme }) => theme.colors.primary};
`

export const ProfileImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  background: #f5f5f5;
  display: block;
  margin: 0 auto;
`
export const VendorDetails = styled(Box)`
  display: flex;
  flex-direction: column;
`

export const VendorHeaderTypography = styled(Box)`
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #333b69;
`
export const VendorDetailsTypography = styled(Box)`
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #202224;
`
export const ArabicPaymentTermsVendorDetailsTypography = styled(Box)`
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #202224;
  direction: ltr;
  padding-left: 15px;
`

export const VendorDetailsColumn = styled(Box)`
  margin-bottom: 20px;
`
