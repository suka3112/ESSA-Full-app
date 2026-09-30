import styled from "styled-components";
import { Box } from "@mui/material";
import { theme } from "theme";

export const HeaderBarBoxContainer = styled(Box)``;

export const HeaderBarSubHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  min-height: 45px;

  @media (max-width: 919px) {
    gap: 3rem;
  }
  @media (max-width: 1279px) {
    gap: 3rem;
  }
`;

export const HeaderBarSubBox = styled.div`
  display: flex;
  gap: 10px;
  // cursor: pointer;

  img {
    width: 24px;
    height: 24px;
    cursor: pointer;
  }
`;

const statusStyles = {
  "submitted for review": { color: "var(--brand-primary-color, $primary-color)", bgColor: "#82D5FF40" },
  draft: { color: "#36454F", bgColor: "#D3D3D3" },
  "under review": { color: "#D59C00", bgColor: "#fdbd6280" },
  resolved: { color: "#188A42", bgColor: "#d4edda" },
  submitted: { color: "var(--brand-primary-color, $primary-color)", bgColor: "#82D5FF40" },
  approved: { color: "#188A42", bgColor: "#CAF1D8" },
  rejected: { color: "#EB2E2E", bgColor: "#FBEAEA" },
  default: { color: "#1A1A1A", bgColor: "#FFFFF" },
  "awaiting approval": { color: "#D59C00", bgColor: "#FDBC6180" },
  "under approval": { color: "#D59C00", bgColor: "#fdbd6280" },
};

export const HeaderStatusTag = styled.span`
  color: ${({ status }) => statusStyles[status]?.color || statusStyles.default.color};
  border: 1px solid ${({ status }) => statusStyles[status]?.color || statusStyles.default.color};
  padding: 2px 7px;
 border-radius: 20px;
  text-transform: capitalize;
  box-shadow: 0px 0px 2px 0 rgb(0 0 0 / 25%);
  font-size: 0.95rem;
  font-weight: 600;
  align-items:center;
`;
export const HeaderBarHomeLabel = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  color: #202224;
  line-height: 18.2px;
  align-self: center;
  margin-bottom: 0.23rem;
`;

export const HeaderBarLabel = styled.div`
  font-size: 1.3125rem;
  font-weight: 600;
  color: var(--brand-primary-color, #017ebd);
  line-height: 27.3px;
  align-self: center;
`;

export const HeaderBarIconContainer = styled.div`
  height: 42px;
  width: 42px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  background-color: white;
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  &:hover {
    box-shadow: 0px 4px 12px 0px #82d5ff80;
    border: 1.5px solid var(--brand-primary-color, $primary-color);
  }
`;

export const HeaderBarFaqIconContainer = styled.div`
  height: 42px;
  width: 42px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  background-color: white;
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  &:hover {
    box-shadow: 0px 4px 12px 0px #82d5ff80;
    border: 1.5px solid var(--brand-primary-color, $primary-color);
  }
`;
export const HeaderBarSideButtonContainer = styled.div`
  display: flex;

  & > *:first-child {
    margin-right: 5px;
  }

  & > *:last-child {
    margin-left: 5px;
  }

  & > *:not(:first-child):not(:last-child) {
    margin: 0 5px;
  }
`;
