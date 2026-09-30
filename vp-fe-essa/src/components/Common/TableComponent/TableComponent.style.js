import { borderColor } from '@mui/system'
import styled from 'styled-components'
import { theme } from 'theme'

const statusStyles = {
  open: { color: '#E08B14	', bgColor: '#fdbd6280' },
  approved: { color: '#66BB6A', borderColor: '#00ff3cff', bgColor: '#cdefd5ff' },
  // reconciled: { color: theme.colors.primary, borderColor: theme.colors.primary },
  'fully reconciled': { color: theme.colors.primary, borderColor: theme.colors.primary },
  cancelled: { color: '#EB2E2E', borderColor: '#EB2E2E' },
  rejected: { color: '#EB2E2E', borderColor: '#EB2E2E' },
  mismatched: { color: '#EB2E2E', borderColor: '#EB2E2E' },
  'not reconciled': { color: '#EB2E2E', borderColor: '#EB2E2E' },
  'pending for reconciliation': {
    color: 'var(--brand-primary-color, $primary-color)',
    bgColor: '#80d4ff40'
  },
  default: { color: '#1A1A1A', borderColor: 'black', bgColor: '#b5b1b1ff' },
  'under review': { color: '#E08B14	', bgColor: '#fdbd6280' },
  'partially reconciled': { color: '#D59C00', bgColor: '#fdbd6280' },
  resolved: { color: '#188A42', bgColor: '#d4edda' },
  submitted: { color: 'var(--brand-primary-color, $primary-color)', bgColor: '#80d4ff40' },
  draft: { color: '#36454F', borderColor: '#EB2E2E', bgColor: '#dededeff' },
  paid: { color: '#188A42', bgColor: '#80d4ff40' },
  closed: { color: '#188A42', bgColor: '#80d4ff40' },
  'under approval': { color: '#E08B14	', bgColor: '#fdbd6280' },
  'submitted for review': {
    color: 'var(--brand-primary-color, $primary-color)',
    bgColor: '#80d4ff40'
  },
  closed: { color: '#188A42', bgColor: '#d4edda' },
  reconciled: { color: '#66BB6A', borderColor: '#00ff3cff', bgColor: '#cdefd5ff' }
}

// export const StatusTags = styled.span`
//   color: ${({ type }) => (statusStyles[type] || statusStyles.default).color};
//   padding: ${({ type }) => (type === 'under review' ? '5px 30px' : '5px 40px')};
//   border-radius: 50px;
//   box-shadow: 0px 0px 2px 0 rgb(0 0 0 / 25%);
//   font-size: 0.875rem !important;
// `

export const StatusTags = styled.span`
  // width: 180px; /* Fixed width */
  height: 27px; /* Hug height */
  padding: 2px 7px; /* Top, Right, Bottom, Left */
  border-radius: 20px;
  // display: inline-flex;
  // align-items: center;
  // justify-content: center;
  // gap: 10px;
  font-weight: 500;
  font-size: 0.9rem;
  color: ${({ type }) => (statusStyles[type] || statusStyles.default).color};
  border: 1px solid
    ${({ type }) => (statusStyles[type] || statusStyles.default).color || 'transparent'};
  box-shadow: 0px 0px 2px 0 rgb(0 0 0 / 25%);
`

export const AnchorItem = styled.div`
  color: var(--brand-primary-color, #017ebd);
  text-decoration: underline;
  font-weight: 600;
  cursor: pointer;
`

export const ActionTags = styled.span`
  background-color: ${theme.colors.primary};
  color: #fff;
  padding: 5px 20px;
  border-radius: 50px;
`

export const SearchContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
`

export const SearchInputTable = styled.input`
  border-radius: 50px;
  background-color: #f5f6fa;
  outline: none;
  padding: ${(props) => (props.isArabic ? '8px 40px 8px 8px' : '8px 8px 8px 40px')};
  font-size: 14px;
  font-weight: 400;
  color: #202224;
  border: 1px solid #929398;
  cursor: text;
  max-height: 45px;
  min-height: 45px;
  min-width: 396.68px;

  &:focus {
    background: #fdfdfd;
    border: 1.5px solid #0066b3;
    box-shadow: 0px 1px 4px 0px #82d5ff80;
  }
  &::placeholder {
    font-size: 14px;
    font-weight: 400;
    color: #202224;
    opacity: 0.75; // Ensures full color visibility
  }
`

export const SearchIconWrapper = styled.div`
  position: absolute;
  ${(props) => (props.isArabic ? 'right: 15px;' : 'left: 15px;')}
  top: 50%;
  transform: translateY(-50%);
  color: #888;
  align-self: center;
`

export const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #d5d5d5;
  border-radius: 8px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
`

export const DropdownItem = styled.div`
  padding: 10px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f0f0f0;
  }
`

export const TableHeaderDropdown = styled.div`
  display: flex;
  flex-direction: column;
  align-items: baseline;
  justify-content: flex-start;
  font-size: 0.75rem;
  font-weight: 400;

  select {
    background-color: #fcfcfc !important;
  }
  li {
    font-size: 0.75rem !important;
    font-weight: 400 !important;
  }

  svg {
    color: #808080 !important;
    fill: #808080 !important;
  }

  .MuiInputBase-root,
  .MuiOutlinedInput-root {
    // height: 1.875rem !important;
    font-size: 14px;
    color: #5f6368;
    font-weight: 600;
  }

  div#mui-component-select-month,
  div#mui-component-select-year {
    padding: 0px 30px 0px 0px;
  }
`

export const TableDropDownSelectBox = styled.select`
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  outline: none;
`

export const TableDropDownLabel = styled.label`
  font-size: 1rem;
  color: #333333;
  font-weight: 600;
  white-space: nowrap;
`
export const SortIcon = styled.img``

export const TotalData = styled.div`
  display: flex;
  justify-content: end;
  gap: 15px;
  margin-right: 0.8rem;
  align-items: center;
`
export const SOAStyledTotalData = styled.div`
  display: flex;
  justify-content: end;
  // gap: 5px;
  margin-right: 0.8rem;
`

export const DataLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #000;
  // padding:10px 0px;
`

export const SOADataLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #000;
  padding: 2px 0px;
`

export const DataValue = styled.label`
  font-size: 14px;
  font-weight: 600;
  margin-left: 10px;
  padding: 2px 0px;
  color: #202224;
`

export const DataLabelTotal = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #333333;
  // padding:10px 0px;
`
