// ToastStyles.js
import styled, { keyframes } from 'styled-components'
import { theme } from 'theme'

const slideIn = keyframes`
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
`

export const ToastWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 4px;
  color: #221f20;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: ${slideIn} 0.3s ease-out;
  background-color: ${({ type }) => {
    switch (type) {
      case 'error':
        return '#f44336'
      case 'warning':
        return '#ff9800'
      default: // success
        return '#E7F7FF'
    }
  }};
  border-left: 10px solid
    ${({ type }) => {
      switch (type) {
        case 'error':
          return '#d32f2f'
        case 'warning':
          return '#ed6c02'
        default: // success
          return theme.colors.primary
      }
    }};
`

export const ToastInner = styled.div`
  display: flex;
 // align-items: center;
  justify-content: space-between;
  gap: 20px;
`
export const ToastContent = styled(ToastInner)`
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
`

export const ToastMessageTitle = styled.p`
  margin: 0;
  font-size: 18px;
  font-weight: 400;
`

export const ToastMessageDesc = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
`

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 2.5rem;
  /* font-weight: bold; */
  padding: 0;
  margin-left: 5px;
  transition: opacity 0.2s;
  width: 15px;
  height: 15px;

  &:hover {
    opacity: 0.8;
  }
`
