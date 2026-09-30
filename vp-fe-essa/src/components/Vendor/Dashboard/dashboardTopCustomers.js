import React, { useState } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination'
import { TableData } from 'services/helpers/constants/common'
import { Box, Typography as _Typography } from '@mui/material'

const TableWrapper = styled(Box)`
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
`

const StyledRow = styled(Box)`
  display: flex;
  align-items: center;
  border-bottom: none;
  justify-content: space-between;
  padding: 3px;
`

const StyledCell = styled(Box)`
  flex: 1;
  text-wrap-mode: nowrap;
  text-align: start;
  &:nth-child(1) {
    text-align: left;
  }
`

const ViewButton = styled(Button)`
  && {
    color: var(--brand-primary-color, $primary-color);
    font-size: 0.875rem;
    text-decoration: underline;
    text-transform: none;
    margin-bottom: 18px;
  }
`

const BoxWrapper = styled(Box)`
  width: 100%;
  border-radius: 14px;
  gap: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background-color: white;
  box-shadow: 6px 6px 54px 0px #0000000d;
`

const Typography = styled(_Typography)`
  font-size: 1.375rem;
  font-weight: 600;
`
const SubTitle = styled(_Typography)`
  font-size: 14px !important;
  font-weight: 500 !important;
  position: relative;
  display: inline-block;
  padding-bottom: 4px;
  color: #00a0e4;
  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 30%;
    height: 1.5px;
    background: #00a0e4;
    padding: 1.5px;
  }

  &::before {
    content: '';
    position: absolute;
    left: 30%;
    bottom: 0;
    width: 70%;
    height: 1.5px;
    background: #d3d3d37a;
  }
`

const Date = styled(Typography)`
  font-size: 19px !important;
  font-weight: 700 !important;
  color: #00a0e4;
`
const Month = styled(Typography)`
  font-size: 12px !important;
  font-weight: 500 !important;
  color: #8e8e8e;
`
const Title = styled(Typography)`
  font-size: 14px !important;
  font-weight: 400;
  color: #232323;
`
const Invoice = styled(Typography)`
  font-size: 12px !important;
  font-weight: 400;
  color: #989898;
`
const ListBox = styled(Box)`
  display: flex;
  align-items: center;
  gap: 30px;
`

const StyledPagination = styled(Pagination)`
  && {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;

    .MuiPaginationItem-previousNext {
      background-color: var(--brand-primary-color-light, #e5ebff);
      color: var(--brand-primary-color, #1177bb);
      border-radius: 50%;
      &:hover {
        background-color: var(--brand-primary-color-light, #e5ebff);
        color: var(--brand-primary-color, #1177bb);
      }
    }

    .MuiPaginationItem-root {
      &:hover {
        background-color: var(--brand-primary-color-light, #e5ebff);
        color: var(--brand-primary-color, #1177bb);
      }
    }
    .Mui-selected {
      background-color: var(--brand-primary-color, ${({ theme }) => theme.colors.primary}) !important;
      font-weight: bold;
      color: white !important;
      &:hover {
        background-color: var(--brand-primary-color, ${({ theme }) => theme.colors.primary}) !important;
        color: white !important;
      }
    }
  }
`

export const DashboardTopCustomers = () => {
  const [page, setPage] = useState(1)
  const itemsPerPage = 7

  const handleChange = (event, value) => {
    setPage(value)
  }

  const paginatedData = TableData.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <>
      <BoxWrapper style={{ height: 'auto', overflowY: 'scroll' }}>
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#333B69'
          }}>
          Updates
        </Typography>
        <SubTitle>Recent Activity Logs</SubTitle>
        <Box sx={{ padding: '0px 10px' }}>
          <TableWrapper>
            {paginatedData.map((row, index) => (
              <StyledRow key={index}>
                <ListBox>
                  <StyledCell>
                    <Date>{row.date}</Date>
                    <Month>{row.month}</Month>
                  </StyledCell>
                  <StyledCell>
                    <Title>{row.name}</Title>
                    <Invoice>{row.subname}</Invoice>
                  </StyledCell>
                </ListBox>
                <Box>
                  <StyledCell>
                    <ViewButton variant="text">View</ViewButton>
                  </StyledCell>
                </Box>
              </StyledRow>
            ))}
          </TableWrapper>
          <Box>
            <StyledPagination
              count={Math.ceil(TableData.length / itemsPerPage)}
              page={page}
              onChange={handleChange}
              siblingCount={0}
              color="primary"
            />
          </Box>
        </Box>
      </BoxWrapper>
    </>
  )
}
