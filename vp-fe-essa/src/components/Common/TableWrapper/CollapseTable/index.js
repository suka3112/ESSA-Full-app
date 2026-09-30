import {
  Table as _Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Collapse,
  CircularProgress,
  Box
} from '@mui/material'
import styled, { css } from 'styled-components'
import { color } from 'services/colors'
import PropTypes from 'prop-types'
import { PageLoader } from 'components/Common/PageLoader'

//STYLES
const Table = styled(_Table)`
  .MuiTableCell-sizeSmall {
    padding: 12px;
  }
  .MuiTableHead-root {
    background: #636363;
    ${({ $active }) =>
      $active &&
      css`
        background: grey !important;
      `}
    .MuiTableCell-head,
    span {
      color: white;
    }
    .MuiTableCell-head {
      box-shadow: inset -1px 0px 0px #d9d9d9, inset 0px -1px 0px #d9d9d9;
      height: 44px;
      background: #828282;
      ${({ $active }) =>
        $active &&
        css`
          height: 36px !important;
          padding: 0px 15px !important;
        `}
      ${({ $isCustom }) =>
        $isCustom &&
        css`
          height: 36px !important;
          padding: 0px 15px !important;
        `}
      &:nth-child(1) {
        border-top-left-radius: 10px;
        border: none;
      }
      &:last-child {
        border-top-right-radius: 10px;
        border: none;
      }
    }
  }
  .MuiTableBody-root {
    background: #fff;

    tr {
      &:nth-child(odd) {
        td {
          ${({ $isCustom }) =>
            $isCustom &&
            css`
              height: 25px;
            `}
        }
      }
      &:nth-child(even) {
        td {
          background: #fff;
          ${({ $isCustom }) =>
            $isCustom &&
            css`
              height: 25px;
            `}
        }
      }
    }
    .MuiTableRow-root {
      td,
      th {
        border: 1px solid ${color.brandColor.primary['800']};
      }
    }
  }
  .MuiTableSortLabel-icon {
    display: none;
  }
`
const TotalTableCell = styled(TableCell)`
  border: none !important;
`
const AlignLoader = styled(Box)`
  display: flex;
  align-items: center;
  padding: 20px;
`

const CollapseTable = ({
  children,
  headerDetails,
  isTable,
  isCustomGrey,
  loading,
  colSpan = 12,
  isCustomTable = false
}) => {
  return (
    <TableRow>
      <TotalTableCell colSpan={colSpan}>
        <Collapse in={true} timeout="auto" unmountOnExit>
          <Box sx={{ pt: '12px', pb: 3 }}>
            {isTable && (
              <Table
                size="small"
                aria-label="purchases"
                $active={isCustomGrey}
                $isCustom={isCustomTable}>
                <TableHead>
                  <TableRow>
                    {headerDetails.map((headCell) => (
                      <TableCell key={headCell.id} align={'left'}>
                        {headCell.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell align="center" colSpan={colSpan}>
                        <PageLoader />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>{children}</>
                  )}
                </TableBody>
              </Table>
            )}
          </Box>
        </Collapse>
      </TotalTableCell>
    </TableRow>
  )
}

CollapseTable.propTypes = {
  children: PropTypes.node.isRequired,
  headerDetails: PropTypes.array,
  isTable: PropTypes.bool,
  isCustomGrey: PropTypes.bool,
  loading: PropTypes.bool,
  colSpan: PropTypes.number,
  isCustomTable: PropTypes.bool
}

CollapseTable.defaultProps = {
  headerDetails: [],
  isTable: true,
  isCustomGrey: false,
  colSpan: 12,
  isCustomTable: false
}

export default CollapseTable
