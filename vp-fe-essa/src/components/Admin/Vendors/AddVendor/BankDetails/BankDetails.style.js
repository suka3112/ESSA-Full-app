// StyledBankDetails.js
import styled from 'styled-components'

export const BankDetailsContainer = styled.div`
  box-shadow: 0px 0px 4px 0px #00000040;
  padding: 30px;
  border-radius: 10px;
  background-color: #fff;
`

export const BankDetailsLabel = styled.label`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 19.2px;
  margin-bottom: 1rem;
  display: block;
`

export const BankDetailsContent = styled.div`
  display: flex;
  justify-content: space-between;
`

export const BankFields = styled.div`
  display: flex;
  gap: 5rem;

  & > div {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  & div:nth-of-type(1) label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #333333;
    line-height: 16.8px;
  }

  & div:nth-of-type(2) label {
    font-size: 1rem;
    font-weight: 400;
    color: #6c6c6c;
    line-height: 16.8px;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
  }
`

export const EditLink = styled.p`
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 16.8px;
  margin-top: 1rem;

  a {
    font-size: 0.875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    line-height: 16.8px;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid #ddd;
  margin: 20px 0;
`
