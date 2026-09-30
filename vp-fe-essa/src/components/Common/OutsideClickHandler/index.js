import { useEffect, useRef } from "react";

const OutsideClickHandler = ({ onOutsideClick, children, className }) => {
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onOutsideClick();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onOutsideClick]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

export default OutsideClickHandler;
