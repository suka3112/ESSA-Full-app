import { CircularProgress as CircularProgressWrap } from '@mui/material'
import styled from 'styled-components'
import PropTypes from 'prop-types'

//STYLES
const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`

export const CircularProgress = ({ size, color = 'white',className }) => {
  return (
    <Wrapper className={className}>
      <CircularProgressWrap size={size} color={color} />
    </Wrapper>
  )
}
CircularProgress.propTypes = {
  size: PropTypes.number,
  color: PropTypes.oneOf(['inherit', 'primary', 'secondary','white'])
}
CircularProgress.defaultProps = {
  size: ''
}
