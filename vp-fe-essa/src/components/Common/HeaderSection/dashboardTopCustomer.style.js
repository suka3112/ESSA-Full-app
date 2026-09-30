
import styled from 'styled-components';
import { Box, Button, Typography } from '@mui/material';
export const TableWrapper = styled(Box)`
  width: 100%;
  border-collapse: collapse;
`

export const StyledRow = styled(Box)`
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e0e0e0; //98A2B3
  justify-content: space-between;
  padding:3px
`

export const StyledCell = styled(Box)`
 margin: 3px 0px;
  &:nth-child(1) {
    text-align: left;
     border-right: 1px solid #e0e0e0; //98A2B3
  // border-radius: 8px;
  padding: 8px 12px;
  }
`
export const StyledMsgCell = styled(Box)`
  flex: 1;
  text-align: start;
  &:nth-child(1) {
    text-align: left;
  }
`

export const ViewButton = styled(Button)`
  && {
    color: var(--brand-primary-color, $primary-color);
    font-size: 1rem;
    text-decoration: underline;
    text-transform: none;
  }
`

export const BoxWrapper = styled(Box)`
  border-radius: 0px 0px 14px 14px;
  gap: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background-color: white;
  box-shadow: 8px 8px 64px 0px #0000001a, 4px 4px 20px 0px #0000000d;
   overflow-y: scroll;
  z-index: 1;
  position: absolute;
  top: 70px;
  
  height: 500px;
  width: 500px;
    
  [dir="ltr"] & {
      right: 236px;    
  }

  [dir="rtl"] & {
      left: 236px;  
  }  
    
  @media screen and (max-width: 1000px) {
      [dir="ltr"] & {
          right: 20px;    
      }

      [dir="rtl"] & {
          left: 20px;
      }
  }  
    
`
export const StyledDate = styled(Typography)`
  font-size: 1rem !important;
  font-weight: 700 !important;
  color: #00a0e4;
  text-align: center;
`
export const Month = styled(Typography)`
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #232323;
`
export const Title = styled(Typography)`
  font-size: 1rem !important;
  font-weight: 400;
  color: #232323;
`
export const Invoice = styled(Typography)`
  font-size: 12px !important;
  font-weight: 400;
  color: #989898;
`
export const ListBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 20px;
`
