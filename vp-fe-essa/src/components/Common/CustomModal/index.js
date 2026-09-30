import {
  Dialog as _Dialog,
  DialogTitle as _DialogTitle,
  DialogContent as _DialogContent,
  DialogActions as _DialogActions,
  IconButton as _IconButton,
  Typography
} from '@mui/material/'
import React from 'react'
import { color } from 'services/colors'
import Icon from 'services/icon'
import styled from 'styled-components'
import PropTypes from 'prop-types'

//STYLES
const Dialog = styled(_Dialog)`
  .MuiDialog-paper {
    // max-width: 600px;
    margin: 0px;
    border-radius: 15px;
  }
`
const IconButton = styled(_IconButton)`
  position: absolute;
  top: 13px;
  right: 13px;
  color: #121212;
`

const Title = styled(Typography)`
  color: ${color.brandColor.primary['200']};
  font-weight: 700;
  font-size: 1.125rem;
`
const DialogTitle = styled(_DialogTitle)``

const DialogActions = styled(_DialogActions)`
  padding: 15px 25px 20px 0;
`
const DialogSpaceActions = styled(_DialogActions)`
  padding: 0px;
`
const DialogContent = styled(_DialogContent)`
  padding-top: 10px !important;
  padding-bottom: 0px;
`
const Modal = ({
  actions,
  children,
  handleClose,
  open,
  title,
  disableEscapeKeyDown,
  icon,
  actionSpace,
  fullscreen,
  isConfirm
}) => {
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={disableEscapeKeyDown}
      fullWidth
      sx={{
        zIndex: fullscreen && 9999
      }}
      maxWidth={fullscreen && !isConfirm ? 'md' : 'sm'}>
      <DialogTitle>
        {icon}
        <Title>{title}</Title>
        {handleClose && (
          <IconButton onClick={handleClose}>
            <Icon iconName="close" iconColor="secondary" />
          </IconButton>
        )}
      </DialogTitle>
      {Boolean(children) && <DialogContent>{children}</DialogContent>}
      {actionSpace ? (
        <DialogSpaceActions>{actions}</DialogSpaceActions>
      ) : (
        actions && <DialogActions>{actions}</DialogActions>
      )}
    </Dialog>
  )
}
Modal.propTypes = {
  children: PropTypes.node.isRequired,
  actions: PropTypes.node,
  handleClose: PropTypes.func,
  open: PropTypes.bool,
  title: PropTypes.string,
  disableEscapeKeyDown: PropTypes.bool,
  disableBackdropClick: PropTypes.bool,
  icon: PropTypes.element,
  actionSpace: PropTypes.bool,
  fullscreen: PropTypes.bool,
  isConfirm: PropTypes.bool
}
Modal.defaultProps = {
  handleClose: () => null,
  open: false,
  title: '',
  disableEscapeKeyDown: true,
  disableBackdropClick: true,
  icon: <></>,
  actionSpace: false,
  fullscreen: false,
  isConfirm: false
}
export default Modal
