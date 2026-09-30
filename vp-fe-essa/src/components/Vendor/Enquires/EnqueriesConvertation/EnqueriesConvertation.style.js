import styled from "styled-components";

export const EnqResponseContainer = styled.div``;

export const EnqInnerContainer = styled.div`
  height: 350px;
  overflow-y: scroll;
`;

export const EnqMsgInputContainer = styled.div`
  position: relative;
  margin-top: 20px;
`;

export const EnqMsgInputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  border-radius: 5px;
  padding: 5px 10px;
  margin-bottom: 10px;
  border: 1px solid rgb(152, 162, 179);
  gap: 8px;
  &:focus-within {
    border: 1.5px solid #1565c0;
    box-shadow: 0px 1px 4px 0px #82d5ff80;
  }
`;

export const EnqMsgInputField = styled.textarea`
  flex: 1;
  padding: 5px;
  background-color: transparent;
  border: none;
  outline: none;
  resize: none;
  font: inherit;
  color: inherit;
  overflow-y: auto;
`;

export const EnqMsgIcon = styled.img`
  width: 20px;
  height: 20px;
  margin-bottom: 8px;
  cursor: pointer;
`;

export const EnqResponseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgb(152, 162, 179);
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
`;

export const EnqHeadTitle = styled.h1`
  font-size: 1.2rem;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: bold;
  align-self: center;
`;

export const EnqResponseSection = styled.div`
  margin-bottom: 15px;
  padding: 15px;
  background-color: #f6f6f6;
  border: 1px solid rgb(152, 162, 179);
  border-radius: 10px;
`;

export const EnqDetailsContainer = styled.div`
   // box-shadow: 0px 0px 4px 0px #00000040;
  border:1px solid rgb(152, 162, 179);
  padding: 15px 30px;
  border-radius: 10px;
  background-color: #fff;
`;  

export const EnqContactPerson = styled.h2`
  font-size: 1rem;
  font-weight: bold;
  color: #000;
  margin-bottom: 10px;
  span {
    color: #515151;
    font-weight: 500;
  }
`;

export const EnqDate = styled.span`
  font-size: 0.8rem;
  color: #8c8c8c;
  margin-left: 10px;
`;

export const EnqContent = styled.p`
  font-size: 1rem;
  color: #333;
  line-height: 1.6;
`;

export const EnqDateTitle = styled.p`
  font-size: 1rem;
  color: #2a2a2a;
`;
