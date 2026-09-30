import { useTheme } from '@mui/material/styles'
import { Grid, Box, Button as _Button, useMediaQuery, CircularProgress } from '@mui/material'
import { color } from 'services/colors'
import styled from 'styled-components'
import Icon from 'services/icon'
import PropTypes from 'prop-types'

//STYLES
const GridButtonWrap = styled(Grid)`
  justify-content: end;
  padding: 20px 0px 30px;
`
const Button = styled(_Button)`
  margin-top: 10px;
  min-width: 130px;
`

export const ButtonContainer = ({
  labelLeft,
  labelRight,
  iconLeft,
  iconRight,
  loading,
  type,
  onCancel,
  onSubmit,
  disabled
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.only('xs'))
  return (
    <GridButtonWrap container>
      <Grid item xs="auto">
        <Box sx={{ mr: 1.5 }}>
          <Button
            onClick={onCancel}
            style={{ fontWeight: 700 }}
            variant="outlined"
            size={isMobile ? 'medium' : 'large'}
            color="secondary"
            startIcon={<Icon iconName={iconLeft} iconColor={color.brandColor.secondary['main']} />}>
            {labelLeft}
          </Button>
        </Box>
      </Grid>
      <Grid item xs="auto">
        <Box sx={{ ml: 1.5 }}>
          <Button
            onClick={onSubmit}
            type={type}
            style={{ fontWeight: 700 }}
            variant="contained"
            size={isMobile ? 'medium' : 'large'}
            color="secondary"
            startIcon={
              loading ? (
                <CircularProgress size={18} />
              ) : (
                <Icon iconName={iconRight} iconColor="white" />
              )
            }
            disabled={loading || disabled}>
            {labelRight}
          </Button>
        </Box>
      </Grid>
    </GridButtonWrap>
  )
}

ButtonContainer.propTypes = {
  labelLeft: PropTypes.string,
  labelRight: PropTypes.string,
  iconLeft: PropTypes.string,
  iconRight: PropTypes.string,
  loading: PropTypes.bool,
  type: PropTypes.string,
  onCancel: PropTypes.func,
  onSubmit: PropTypes.func,
  startIcon: PropTypes.string,
  disabled: PropTypes.bool
}
ButtonContainer.defaultProps = {
  labelLeft: '',
  labelRight: '',
  iconLeft: '',
  iconRight: '',
  loading: false,
  type: '',
  onCancel: () => null,
  onSubmit: () => null,
  startIcon: ''
}
