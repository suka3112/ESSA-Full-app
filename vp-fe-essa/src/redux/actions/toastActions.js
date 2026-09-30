// redux/actions/toastActions.js
import { SHOW_TOAST, HIDE_TOAST } from '../constants/toastConstant'

export const showToast =
  (messageTitle, messageDesc, type, duration = 5000) =>
  (dispatch) => {
    dispatch({
      type: SHOW_TOAST,
      payload: { messageTitle, messageDesc, type }
    })

    setTimeout(() => {
      dispatch({ type: HIDE_TOAST })
    }, duration)
  }

export const hideToast = () => ({
  type: HIDE_TOAST
})
