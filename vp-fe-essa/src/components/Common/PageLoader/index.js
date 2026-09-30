import { CircularProgress } from '../CircularProgress'
import styled from 'styled-components'
import { Box as _Box } from '@mui/material'

//STYLES
const Box = styled(_Box)`
  padding: 10px 0px;
`

export const PageLoader = ({color="primary"}) => {
  return (
    <Box>
      <CircularProgress size={30} color={color} />
    </Box>
  )
}
