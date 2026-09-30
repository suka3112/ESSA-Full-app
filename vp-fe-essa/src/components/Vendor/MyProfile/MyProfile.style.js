import styled from 'styled-components'
import { Tabs, Tab } from '@mui/material'

// Container for the entire tabs section
export const MPTabsContainer = styled.div`
  width: 100%;
  margin-top: 20px;
`

// Styled wrapper for the tabs
export const MPTabWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
`

// Styled separator to place between tabs
export const MPSeparator = styled.div`
  width: 0.5px;
  height: 48px;
  background-color: rgb(152, 162, 179);
  align-items: center;
  border-color: rgb(152, 162, 179);
`

// Styled Tabs component
export const MPTabs = styled(Tabs)`
  width: 100%;
  background-color: #fff;
  border-radius: 8px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.black};
  font-weight: 500
`

// Styled Tab component
export const MPTab = styled(Tab)`
  font-size: 1rem !important;
  font-weight: 500 !important;
  text-transform: none !important;
  padding: 12px;

  &.Mui-selected,
  &.active-tab {
    background-color: var(--brand-primary-color, #017ebd) !important;
    color: white !important;
    font-weight: 600 !important;
    font-size: 1.05rem !important;
    opacity: 1 !important;
    // border-top-left-radius: 2px;
    // border-top-right-radius: 2px;
  }
  &.first-tab {
  background-color: var(--brand-primary-color, #017ebd) !important;
    color: white !important;
    font-weight: 600 !important;
    font-size: 1.05rem !important;
    opacity: 1 !important;
    // border-top-left-radius: 6px;
  }
  &.last-tab {
  background-color: var(--brand-primary-color, #017ebd) !important;
    color: white !important;
    font-weight: 600 !important;
    font-size: 1.05rem !important;
    opacity: 1 !important;
    // border-top-right-radius: 6px;
  }  

  &:active {
    color: var(--brand-primary-color, #017ebd);
  }
`
