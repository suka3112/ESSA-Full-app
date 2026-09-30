// components/ToastMessage.js
import React from 'react'
import { connect } from 'react-redux'
import {
  ToastWrapper,
  ToastContent,
  CloseButton,
  ToastMessageTitle,
  ToastMessageDesc,
  ToastInner
} from './ToastMessage.styles'
import { hideToast } from '../../../redux/actions/toastActions'

const ToastMessage = ({ toast, hideToast }) => {
  if (!toast.isVisible) return null

  return (
    <ToastWrapper type={toast.type}>
      <ToastInner>
        <ToastContent>
          <ToastMessageTitle>{toast.messageTitle}</ToastMessageTitle>
          <ToastMessageDesc>{toast.messageDesc}</ToastMessageDesc>
        </ToastContent>
        <CloseButton onClick={hideToast}>&times;</CloseButton>
      </ToastInner>
    </ToastWrapper>
  )
}

const mapStateToProps = (state) => ({
  toast: state.toast
})

const mapDispatchToProps = {
  hideToast
}

export default connect(mapStateToProps, mapDispatchToProps)(ToastMessage)
