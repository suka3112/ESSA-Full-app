// redux/reducers/toastReducer.js

import { HIDE_TOAST, SHOW_TOAST } from '../constants/toastConstant'

const initialState = {
  isVisible: false,
  messageTitle: '',
  messageDesc: '',
  type: 'success'
}

const toastReducer = (state = initialState, action) => {
  switch (action.type) {
    case SHOW_TOAST:
      return {
        ...state,
        isVisible: true,
        messageTitle: action.payload.messageTitle,
        messageDesc: action.payload.messageDesc,
        type: action.payload.type
      }
    case HIDE_TOAST:
      return {
        ...state,
        isVisible: false,
        messageTitle: '',
        messageDesc: '',
        type: 'success'
      }
    default:
      return state
  }
}

export default toastReducer
