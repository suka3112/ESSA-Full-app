// StyledBankDetails.js
import styled from 'styled-components'

export const BankDetailsContainer = styled.div`
  // box-shadow: 0px 0px 4px 0px #00000040;
  border:1px solid rgb(152, 162, 179);
  padding: 30px;
  border-radius: 10px;
  background-color: #fff;
`
export const FileDetailsContainer = styled.div`
  // box-shadow: 0px 0px 4px 0px #00000040;
   border:1px solid rgb(152, 162, 179);
  padding: 15px;
  padding-left:25px;
  border-radius: 10px;
  background-color: #fff;
`
export const EditButtonContainer = styled.div`
display:flex;
justify-content:end;
`
export const BankDetailsLabel = styled.label`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 19.2px;
  margin-bottom: 1rem;
  display: block;
  letter-spacing: 0.5px;
`

export const BankDetailsContent = styled.div`
  // display: flex;
  // // justify-content: space-between;
  // // gap: 200px;
  // margin-top: 20px;
`

export const BankFields = styled.div`
  display: flex;
  gap: 5rem;

  & > div {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  & div:nth-of-type(1) label {
    font-size: 1rem;
    font-weight: 600;
    color: #6c6c6c;
    line-height: 16.8px;
  }

  & div:nth-of-type(2) label {
    font-size: 1rem;
    font-weight: 600;
    color: black;
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

  span {
    font-size: 0.875rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
    line-height: 16.8px;
    text-decoration: underline;

    &:hover {
      text-decoration: underline;
      cursor:pointer;
    }
  }
`

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid #ddd;
  margin: 20px 0;
`
