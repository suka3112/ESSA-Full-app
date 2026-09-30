import { useRef } from "react";
import "./style.scss";
import { CircularProgress } from "../CircularProgress";

export const NormalButton = ({
  customClass = "",
  customBtnClass = "",
  removeWidthConstraints = false,
  label = "",
  onClick,
  id,
  disabled = false,
  normal = false,
  isPrimary = false,
  isPrimaryModal,
  sortButton = false,
  primary2 = false,
  outlineBtn = false,
  rejectBtn = false,
  savedBtn = false,
  uploadBtn = false,
  brandBtn = false,
  viewBtn = false,
  rightIcon = "",
  whiteBtn = false,
  outlineBtnRadius = false,
  leftIcon = "",
  addBtn = false,
  isLoading = false,
  removeBtn = false,
  green = false,
  secondary = false,
  btn100 = false,
  creditNoteBtn = false,
  trackBtn = false,
  rightIconClassName = "",
  leftIconClassName = "",
  fullWidth,
  style,
  type,
  isFileUpload = false, // New prop to enable file upload
  onFileChange, // Callback function to handle file selection
  accept = "*", // File types allowed (default: all)
  multiple = false, // Allow multiple file selection
  fontFamily = "inherit",
  IsWidth,
}) => {
  const fileInputRef = useRef(null);

  const handleButtonClick = (e) => {
    if (isFileUpload && fileInputRef.current) {
      fileInputRef.current.click(); // Trigger file input click
    } else if (onClick) {
      onClick(e);
    }
  };

  const handleFileChange = (event) => {
    if (onFileChange) {
      onFileChange(event);
    }
  };

  return (
    <div className={`button_custom ${customBtnClass}`}>
      <button
        id={id}
        className={`btn cursor_pointer_arrow px-2
          ${fullWidth ? "fullWidth" : ""}
          ${btn100 ? "btn100" : ""}
          ${removeWidthConstraints ? "normal-btn-custom-width" : ""}
          ${normal && !removeWidthConstraints ? "normal-btn" : ""}
          ${whiteBtn ? "white-btn" : ""}
          ${primary2 ? "primary2-btn" : ""}
          ${isPrimary ? "primary-btn" : ""}
          ${isPrimaryModal ? "modal-Primary-btn" : ""}
          ${secondary ? "secondary-btn" : ""}
          ${sortButton ? "sortButton" : ""}
          ${outlineBtn ? "outlineBtn" : ""}
          ${savedBtn ? "savedBtn" : ""}
          ${rejectBtn ? "rejectBtn" : ""}
          ${uploadBtn ? "uploadBtn" : ""}
          ${brandBtn ? "brandBtn" : ""}
          ${viewBtn ? "viewBtn" : ""}
          ${outlineBtnRadius ? "outlineBtnRadius" : ""}
          ${removeBtn ? "removeBtn" : ""}
          ${green ? "green" : ""}
          ${creditNoteBtn ? "creditNoteBtn" : ""}
          ${trackBtn ? "track-btn" : ""}
          ${customClass}`}
        onClick={handleButtonClick}
        disabled={disabled}
        type={type}
        style={{ ...style, fontFamily, width: IsWidth }}
      >
        {leftIcon !== "" && (
          typeof leftIcon === 'string' ? (
            <img
              style={{ marginInlineEnd: "0.5rem" }}
              className={`btn-right-icon ${leftIcon} ${leftIconClassName}`}
              src={leftIcon}
            />
          ) : (
            <span style={{ marginInlineEnd: "0.5rem" }} className={leftIconClassName}>
              {leftIcon}
            </span>
          )
        )}
        {label}
        {isLoading ? <CircularProgress color="white" size={16} className="mx-2" /> : ""}
        {rightIcon !== "" && (
          typeof rightIcon === 'string' ? (
            <img
              style={{ marginInlineStart: "0.5rem" }}
              className={`btn-right-icon ${rightIcon} ${rightIconClassName}`}
              src={rightIcon}
            />
          ) : (
            <span style={{ marginInlineStart: "0.5rem" }} className={rightIconClassName}>
              {rightIcon}
            </span>
          )
        )}

        {sortButton && (
          <span className="ml-3">
            {/* <img src={sortbuttonarrow} alt="arrow" /> */}
          </span>
        )}
      </button>

      {/* Hidden File Input */}
      {isFileUpload && (
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
        />
      )}
    </div>
  );
};
