// TooltipWrapper.js
import React, { useState } from 'react'
import './style.scss'

export const TooltipWrapper = ({ tooltipMessage, titleLabel, children }) => {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ display: 'inline-block', position: 'relative' }}>
      {children}
      {showTooltip && (
        <div className="tooltip-text mt-1">{tooltipMessage}</div>
      )}
    </div>
  )
}
