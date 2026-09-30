import React from 'react'
import PropTypes from 'prop-types'
import { Box } from '@mui/material'

export const MainLayout = (props) => {
  const { children } = props
  return <Box>{children}</Box>
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired
}
