import styled from 'styled-components'
import React from 'react'
import SVGIcon from '../SVGIcon'

export const UtilIcon = styled.img`
  height: 42px;
  width: 42px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: white;
  padding: 5px;
  margin-right: 10px;
  &:hover {
    box-shadow: 0px 4px 12px 0px #82d5ff80;
    border: 1.5px solid var(--brand-primary-color, $primary-color);
  }
`

const UtilIconFaqContainer = styled.div`
  height: 42px;
  width: 42px;
  border: 1px solid var(--brand-primary-color, $primary-color);
  border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: white;
  padding: 5px;
  margin-right: 10px;
  &:hover {
    box-shadow: 0px 4px 12px 0px #82d5ff80;
    border: 1.5px solid var(--brand-primary-color, $primary-color);
  }
`

// Map icon paths to SVGIcon registry names
const getIconNameFromPath = (src) => {
  if (!src) return null
  const path = typeof src === 'string' ? src : src.default || ''
  if (path.includes('helpIcon')) return 'help'
  // Add more mappings as needed
  return null
}

export const UtilIconFaq = ({ src, name, size = 32, ...props }) => {
  // Support both src (for backward compatibility) and name props
  const iconName = name || getIconNameFromPath(src) || 'help'

  return (
    <UtilIconFaqContainer {...props}>
      <SVGIcon name={iconName} size={size} />
    </UtilIconFaqContainer>
  )
}
export const ActionUtilIcon = styled.img`
  height: 30px;
  width: 30px;
  //border: 1px solid var(--brand-primary-color, $primary-color);
  //border-radius: 6px;
  box-shadow: 0px 1px 5.8px 0px #82d5ff40;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  // background-color:white;
  padding: 5px;
  margin-right: 10px;
  &:hover {
    box-shadow: 0px 4px 12px 0px #82d5ff80;
    border: 1.5px solid var(--brand-primary-color, $primary-color);
  }
`
