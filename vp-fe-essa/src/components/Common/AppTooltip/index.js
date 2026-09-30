import React, { useState } from "react";
import styles from "./tooltip.module.scss";
import { useTranslation } from "react-i18next";
import SVGIcon from "../SVGIcon";

const AppTooltip = ({ message, className = "" }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`${styles.tooltipContainer} ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <SVGIcon name="tooltip" size={12} className="ms-1" />
      {showTooltip && (
       <div className="tooltip-text">
          {message}
        </div>
      )}
    </div>
  );
};

export default AppTooltip;
