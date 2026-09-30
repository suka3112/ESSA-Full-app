const { default: styled } = require('styled-components')

export const LeftPageContainer = styled.div.attrs({ className: 'main-content' })`
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
  background-color: #f5f7fa;

  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #9ca3af;
  }
`
