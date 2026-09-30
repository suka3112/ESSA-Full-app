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
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;
`

// Styled separator to place between tabs
export const MPSeparator = styled.div`
  width: 1px;
  height: 48px;
  background-color: #00000033;
  align-items: center;
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
`

// Styled Tab component
export const MPTab = styled(Tab)`
  font-size: 1rem;
  text-transform: none;
  padding: 12px;

  &.active-tab {
    background-color: ${({ theme }) => theme.colors.primary};
    color: white;
    font-weight: 400;
    opacity: 1 !important;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
  }

  &:active {
    color: ${({ theme }) => theme.colors.primary};
  }
`
