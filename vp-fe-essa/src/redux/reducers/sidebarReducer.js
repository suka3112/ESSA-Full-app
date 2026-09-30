import { CLOSE_SIDEBAR, OPEN_SIDEBAR, TOGGLE_SIDEBAR } from '../constants/sidebarConstant'

const initialState = {
  isOpen: typeof window === 'undefined' ? true : window.innerWidth > 850,
}

const sidebarReducer = (state = initialState, action) => {
  switch (action.type) {
    case TOGGLE_SIDEBAR: {
      return {
        ...state, isOpen: !state.isOpen,
      }
    }
    case OPEN_SIDEBAR: {
      return {
        ...state, isOpen: true,
      }
    }
    case CLOSE_SIDEBAR: {
      return {
        ...state, isOpen: false,
      }
    }
    default: {
      return state;
    }
  }
}

export default sidebarReducer;