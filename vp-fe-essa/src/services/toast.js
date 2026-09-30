import { endPoints } from './helpers/config'
import { toast, Zoom } from 'react-toastify'
import Icon from './icon'

export const Toast = ({ type = endPoints.auth.success, message }) => {
  //DEFAULT PROPS
  let defaultProps = {
    position: 'bottom-center',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: 'colored',
    transition: Zoom
  }
  if (type === endPoints.auth.success) {
    toast[type](message, {
      ...defaultProps,
      icon: () => <Icon iconName="check_circle_outline" iconColor="white" />
    })
  } else {
    toast[type](message, {
      ...defaultProps,
      autoClose: 2000,
    })
  }
}
