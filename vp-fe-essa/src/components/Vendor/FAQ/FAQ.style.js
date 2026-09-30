// StyledComponents.js
import styled from 'styled-components'
import { Tabs, Tab } from '@mui/material'

export const Container = styled.div`
  display: flex;
  margin: 0 auto;
  padding: 0;
  
  @media screen and (max-width: 1023px){
      flex-direction: column;
  }  
    
`

export const LeftPanel = styled.div`
  width: 220px;
  margin-right: 20px;

  & div > :first-child {
    margin-top: 0 !important;
  }
  @media screen and (max-width: 1023px){
      width: 100%;
  }  
    
`

export const RightPanel = styled.div`
  flex: 1;
  background-color: #fff;
  border-radius: 8px;
 border:1px solid rgb(152, 162, 179);
  height: 100%;
  min-height: 70vh;
  overflow:hidden;
  @media screen and (max-width: 1023px){
      height: fit-content;
  }
`

export const VideoEmbed = styled.div`
  margin-top: 10px;
  iframe {
    width: 100%;
    max-width: 400px;
    height: 220px;
    border-radius: 8px;
  }
`

export const StyledTabs = styled(Tabs)`
  & .MuiTab-root {
    font-size: 1rem; /* Change font size */
    padding: 6px 12px; /* Adjust padding */
    text-transform: none; /* Optional: Disable uppercase transformation */
    background-color: #fff;
    margin-top: 10px;
    color:#1E1E1E;
    border-radius: 5px;
  }

  & .Mui-selected {
    color: white !important;
    font-weight: 600; /* Change font weight */
    font-size: 1rem; /* Change font size */
    background-color: ${({ theme }) => theme.colors.primary};
  }

  & .MuiTabs-indicator {
    display: none; /* Change color of the indicator */
  }
`

export const StyledTab = styled(Tab)`
  /* Add additional styles for Tab if needed */
  padding: 5px 0px;
   border:1px solid rgb(152, 162, 179) !important;
`
