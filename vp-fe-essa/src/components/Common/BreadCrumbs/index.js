import {
  Breadcrumbs as Breadcrumb,
  Box,
  Typography as _Typography,
  Link as _Link
} from '@mui/material'
import styled from 'styled-components'
import Icon from 'services/icon'
// import { history } from 'services/helpers'
import { color } from 'services/colors'
import PropTypes from 'prop-types'

//STYLES
const Link = styled(_Link)`
  font-weight: 700;
  font-size: 0.75rem;
  display: flex;
  cursor: pointer;
`
const Typography = styled(_Typography)`
  font-weight: 500;
  font-size: 0.75rem;
  color: ${color.brandColor.grey['100']};
`
export const BreadCrumbs = ({ breadCrumbsList = [] }) => {
  return (
    <Box sx={{ mb: 1 }}>
      <Breadcrumb
        separator={
          <Icon
            iconName="chevron_right"
            iconColor={color.brandColor.primary['main']}
            fontSize="18px"
          />
        }
        aria-label="breadcrumb">
        {breadCrumbsList.map(({ label, redirectUrl, currentLabel }, index) => (
          <Box key={index}>
            {label && (
              <Link
                color="secondary"
                onClick={() => {
                  // history.push(redirectUrl)
                }}
                underline="always">
                {label}
              </Link>
            )}
            {currentLabel && <Typography>{currentLabel}</Typography>}
          </Box>
        ))}
      </Breadcrumb>
    </Box>
  )
}
BreadCrumbs.propTypes = {
  breadCrumbsList: PropTypes.array
}
BreadCrumbs.defaultProps = {
  breadCrumbsList: []
}
