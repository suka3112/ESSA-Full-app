import { CLOSE_SIDEBAR, OPEN_SIDEBAR, TOGGLE_SIDEBAR } from '../constants/sidebarConstant'

export const toggleSidebar = () => {
  return {
    type: TOGGLE_SIDEBAR,
  }
}

export const openSidebar = () => {
  return {
    type: OPEN_SIDEBAR,
  }
}

export const closeSidebar = () => {
  return {
    type: CLOSE_SIDEBAR,
  }
}