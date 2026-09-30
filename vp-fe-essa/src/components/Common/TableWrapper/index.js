import {
  Table as _Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination as _TablePagination,
  Paper as _Paper,
  TableRow,
  TableSortLabel as _TableSortLabel,
  Typography,
  Box,
  Grid,
  CircularProgress
} from '@mui/material'
import styled, { css } from 'styled-components'
import { color } from 'services/colors'
import Icon from 'services/icon'
import PropTypes from 'prop-types'
import { PageLoader } from '../PageLoader'
import { Checkbox, NormalButton, Tooltip } from 'components/Common'

//STYLES
const Table = styled(_Table)`
  border: 1px solid rgb(217, 217, 217) !important;
  .MuiTableHead-root {
    background: ${color.brandColor.primary['main']};
    .MuiTableCell-head,
    span {
      color: white;
    }
    .MuiTableCell-head {
      box-shadow: inset -1px 0px 0px #d9d9d9, inset 0px -1px 0px #d9d9d9;
    }
  }
  .MuiTableBody-root {
    tr {
      &:nth-child(even) {
        td {
          background: #fafafa;
        }
      }
    }
    .MuiTableRow-root {
      td,
      th {
        border: 1px solid ${color.brandColor.primary['800']};
      }
      &:nth-child(even) {
        background: ${color.brandColor.primary['1000']};
      }
      td {
        height: 43px;
        padding: 0px 16px;
        background: #fff;
      }
    }
  }

  ${({ $customStyleFirst }) =>
    $customStyleFirst &&
    css`
      .MuiTableBody-root {
        tr {
          td:first-child {
            width: 105px;
          }
        }
      }
    `}

  ${({ $customColumn }) =>
    $customColumn &&
    css`
      .MuiTableBody-root {
        tr {
          td {
            width: 400px;
            &:nth-child(3) {
              width: 550px;
            }
            &:last-child {
              width: 70px;
            }
          }
        }
      }
    `}
    
  ${({ $customFontSize }) =>
    $customFontSize &&
    css`
      .MuiTableBody-root {
        tr {
          td {
            font-size: 0.75rem;
          }
        }
      }
    `} 
    
  ${({ $customcolor }) =>
    $customcolor &&
    css`
      .MuiTableHead-root {
        background: #636363;
      }
    `}
  ${({ $customStyle }) =>
    $customStyle &&
    css`
      .MuiTableBody-root {
        tr {
          td:first-child {
            width: 38%;
          }
          td {
            width: 100px;
          }
        }
      }
    `}
    ${({ $customSpace }) =>
    $customSpace &&
    css`
      .MuiTableBody-root {
        tr {
          td {
            padding: 10px 16px !important;
          }
        }
      }
    `} 
  .MuiTableSortLabel-icon {
    display: none;
  }
`

const TablePagination = styled(_TablePagination)`
  .MuiSelect-select.MuiSelect-select {
    background: ${color.brandColor.primary['1000']};
    border: 1px solid ${color.brandColor.secondary['main']};
    color: ${color.brandColor.secondary['main']};
    border-radius: 4px;
  }
  .MuiIconButton-root {
    width: 52px;
    background: ${color.brandColor.primary['1000']};
    color: ${color.brandColor.secondary['main']};
    border: 1px solid ${color.brandColor.secondary['main']};
    border-radius: 4px;
  }
  .MuiIconButton-root {
    padding: 3px 12px 3px 12px;
    margin: 12px;
  }
  .MuiIconButton-root.Mui-disabled {
    opacity: 0.7;
    cursor: none;
  }
`
const Paper = styled(_Paper)`
  padding-bottom: 20px;
  box-shadow: none;
  ${({ $customColumn }) =>
    $customColumn &&
    css`
      .MuiTableContainer-root {
        padding-bottom: 110px;
      }
    `}
`

const TableRowWrapper = styled(TableRow)`
  height: 120px;
`

const TableSortLabel = styled(_TableSortLabel)`
  display: flex;
  cursor: default;
  .material-icons {
    padding-left: 15px;
  }
`
const FilterWrap = styled(Box)`
  left: 25px;
`
const ExportWrap = styled(Box)`
  .MuiButton-root {
    margin-left: 12px;
    margin-bottom: 5px;
  }
`

export const TableWrapper = ({
  children,
  userList,
  headerDetails,
  order = '',
  orderBy = '',
  page,
  rowsPerPage,
  pagination = true,
  count,
  customStyle = false,
  customcolor = false,
  setOrder,
  setOrderBy,
  setPage,
  setRowsPerPage,
  setUserList,
  loading,
  customSpace,
  customStyleFirst,
  isCustomButton = false,
  customColumn,
  customFontSize,
  colSpan,
  isExportListEnabled = false,
  onPressExcel = () => {},
  isExcelLoading = false,
  className
}) => {
  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
    let store = stableSort(userList, getComparator(order, orderBy)).slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    )
    setUserList(store)
  }

  const handleChangePage = (event, newPage) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const createSortHandler = (property) => (event) => {
    handleRequestSort(event, property)
  }

  return (
    <Paper $customColumn={customColumn}>
      <TableContainer>
        <Grid container spacing={2}>
          {userList.length > 0 && isCustomButton && (
            <Grid item xs={12} sm={12} md={1} lg={1}>
              <FilterWrap>
                <Checkbox
                  onChange={({ target: { checked } }) => {
                    let isList = userList.map((list) => {
                      list.is_checked = checked
                      return {
                        ...list
                      }
                    })
                    setUserList(isList)
                  }}
                  label="Select All"
                  bold={false}
                  color="secondary"
                  checked={userList.every(({ is_checked }) => is_checked)}
                />
              </FilterWrap>
            </Grid>
          )}
          <Grid
            item
            xs={12}
            sm={12}
            md={userList.length > 0 && isCustomButton ? 3 : 4}
            lg={userList.length > 0 && isCustomButton ? 3 : 4}>
            {userList.length > 0 && isExportListEnabled && (
              <ExportWrap>
                <Tooltip title="Export to Excel" isButton>
                  <NormalButton
                    icon
                    variant="outlined"
                    onClick={() => {
                      onPressExcel()
                    }}
                    startIcon={<CircularProgress size={18} />}
                    size="large"
                  />
                </Tooltip>
              </ExportWrap>
            )}
          </Grid>
          <Grid item xs={12} sm={12} md={8} lg={8}>
            {pagination && count > 10 && (
              <TablePagination
                SelectProps={{
                  disabled: loading
                }}
                backIconButtonProps={
                  loading
                    ? {
                        disabled: loading
                      }
                    : undefined
                }
                nextIconButtonProps={
                  loading
                    ? {
                        disabled: loading
                      }
                    : undefined
                }
                rowsPerPageOptions={[10, 20, 30, 50]}
                component="div"
                count={count}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                page={page}
                onPageChange={handleChangePage}
              />
            )}
          </Grid>
        </Grid>
        <Table
          className={className}
          $customStyleFirst={customStyleFirst}
          aria-labelledby="tableTitle"
          aria-label="enhanced table"
          $customStyle={customStyle}
          $customcolor={customcolor}
          $customSpace={customSpace}
          $customColumn={customColumn}
          $customFontSize={customFontSize}>
          <TableHead>
            <TableRow>
              {headerDetails.map((headCell, index) => (
                <TableCell key={index}>
                  <TableSortLabel onClick={headCell.sort && createSortHandler(headCell.id)}>
                    {headCell.label}
                    {headCell.sort && <Icon iconName="unfold_more" />}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRowWrapper>
                <TableCell align="center" colSpan={colSpan}>
                  <PageLoader />
                </TableCell>
              </TableRowWrapper>
            ) : userList.length > 0 ? (
              <>{children}</>
            ) : (
              <TableRowWrapper>
                <TableCell align="center" colSpan={colSpan}>
                  <Typography>No Data</Typography>
                </TableCell>
              </TableRowWrapper>
            )}
          </TableBody>
        </Table>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={12} md={12} lg={12}>
            {pagination && count > 10 && (
              <TablePagination
                SelectProps={{
                  disabled: loading
                }}
                backIconButtonProps={
                  loading
                    ? {
                        disabled: loading
                      }
                    : undefined
                }
                nextIconButtonProps={
                  loading
                    ? {
                        disabled: loading
                      }
                    : undefined
                }
                rowsPerPageOptions={[10, 20, 30, 50]}
                component="div"
                count={count}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                page={page}
                onPageChange={handleChangePage}
              />
            )}
          </Grid>
        </Grid>
      </TableContainer>
    </Paper>
  )
}

TableWrapper.propTypes = {
  children: PropTypes.node.isRequired,
  userList: PropTypes.array,
  headerDetails: PropTypes.array,
  order: PropTypes.string,
  orderBy: PropTypes.string,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  count: PropTypes.number,
  customStyle: PropTypes.bool,
  customcolor: PropTypes.bool,
  setOrder: PropTypes.func,
  setOrderBy: PropTypes.func,
  setPage: PropTypes.func,
  setRowsPerPage: PropTypes.func,
  setUserList: PropTypes.func,
  pagination: PropTypes.bool,
  loading: PropTypes.bool,
  customSpace: PropTypes.bool,
  customStyleFirst: PropTypes.bool,
  isCustomButton: PropTypes.bool,
  customColumn: PropTypes.bool,
  customFontSize: PropTypes.bool,
  colSpan: PropTypes.number,
  isExportListEnabled: PropTypes.bool,
  onPressExcel: PropTypes.func,
  isExcelLoading: PropTypes.bool,
  className: PropTypes.string
}
TableWrapper.defaultProps = {
  colSpan: 12
}
