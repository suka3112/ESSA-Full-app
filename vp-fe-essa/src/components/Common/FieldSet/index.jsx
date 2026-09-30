import React from "react";
import "./style.scss";

const Fieldset = ({ legend, children, className, style, ...props }) => {
  return (
    <fieldset className={`custom-fieldset ${className || ""}`} style={style} {...props}>
      {legend && <legend className="custom-legend">{legend}</legend>}
      {children}
    </fieldset>
  );
};


export default Fieldset;
