import { useEffect, useRef, useState } from "react";
import styles from "./DetailItemCard.module.scss";

const DetailItem = ({ label, value,labelWidth="50%",valueWidth="50%", customClass, pclass, valueStyle }) => {
  const labelRef = useRef(null);
  const valueRef = useRef(null);
  const [showLabelTooltip, setShowLabelTooltip] = useState(false);
  const [showValueTooltip, setShowValueTooltip] = useState(false);

  const checkOverflow = (el) => {
    if (!el) return false;
    return el.scrollWidth > el.clientWidth;
  };

  const handleCheck = () => {
    setShowLabelTooltip(checkOverflow(labelRef.current));
    setShowValueTooltip(checkOverflow(valueRef.current));
  };

  useEffect(() => {
    handleCheck();

    const observers = [];
    const elements = [labelRef.current, valueRef.current];

    elements.forEach((el) => {
      if (el && typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(handleCheck);
        ro.observe(el);
        if (el.parentElement) ro.observe(el.parentElement);
        observers.push(ro);
      }
    });

    window.addEventListener("resize", handleCheck);
    const t = setTimeout(handleCheck, 100);

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleCheck);
      observers.forEach((ro) => ro.disconnect());
    };
  }, [label, value]);

  return (
    <div className="d-flex">
      <p
        ref={labelRef}
        title={showLabelTooltip ? label : ""}
        className={`${styles.cardLabel} ${pclass || ""}`}
        style={{width:labelWidth}}
      >
        {label}
      </p>
      <p
        ref={valueRef}
        title={showValueTooltip ? value : ""}
        className={`${styles.cardValue} ${customClass || ""}`}
        style={{width:valueWidth, ...valueStyle}}
      >
        {value || "--"}
      </p>
    </div>
  );
};

export default DetailItem;
