import React, { useState } from "react";
import tooltip from "../../../assets/icons/tooltip.svg";
import "./style.scss";

export const Tooltip = ({ tooltipMessage, titleLabel }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="tooltip-wrapper">
      <div
        className="tooltip-container"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <img src={tooltip} alt="info icon" />
        {showTooltip && (
          <div className="tooltip-text">
            {tooltipMessage || `Enter ${titleLabel}`}
          </div>
        )}
      </div>
    </div>
  );
};
