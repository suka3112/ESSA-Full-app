import React, { useState } from "react";
import CustomModal from "../Modal";
import { getAccessibleFileUrl } from "../../../services/helperFunctions";
import SVGIcon from "../SVGIcon";

const FileIcons = ({
  files = [],
  className = "",
  onRemoveFile,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState("image");
  const [isLoading, setIsLoading] = useState(false);

  // const handleImageClick = async (file) => {
  //   let url = "";
  //   let isPdf = false;
  //   if (typeof file === "string") {
  //     isPdf = file.toLowerCase().endsWith(".pdf");
  //     setIsLoading(true);
  //     url = await getAccessibleFileUrl(file);
  //     setIsLoading(false);
  //   } else if (file?.Upload_files) {
  //     isPdf = file.Upload_files.toLowerCase().endsWith(".pdf");
  //     setIsLoading(true);
  //     url = await getAccessibleFileUrl(file.Upload_files);
  //     setIsLoading(false);
  //   } else if (file?.type === "application/pdf") {
  //     isPdf = true;
  //     url = URL.createObjectURL(file);
  //   } else {
  //     url = URL.createObjectURL(file);
  //   }

  //   if (url) {
  //     setPreviewUrl(url);
  //     setPreviewType(isPdf ? "pdf" : "image");
  //   }
  // };

  const handleImageClick = async (file) => {
  let url = '';
  let isPdf = false;

  if (typeof file === 'string') {
    isPdf = file.toLowerCase().endsWith('.pdf');
    setIsLoading(true);
    const response = await fetch(await getAccessibleFileUrl(file));
    if (isPdf) {
      const blob = await response.blob();
      url = URL.createObjectURL(blob);
    } else {
      url = await getAccessibleFileUrl(file); // just a normal image URL
    }
    setIsLoading(false);
  } else if (file?.Upload_files) {
    isPdf = file.Upload_files.toLowerCase().endsWith('.pdf');
    setIsLoading(true);
    const response = await fetch(await getAccessibleFileUrl(file.Upload_files));
    if (isPdf) {
      const blob = await response.blob();
      url = URL.createObjectURL(blob);
    } else {
      url = await getAccessibleFileUrl(file.Upload_files);
    }
    setIsLoading(false);
  } else if (file?.type === 'application/pdf') {
    isPdf = true;
    url = URL.createObjectURL(file); // local File object (pdf)
  } else if (file instanceof File || file instanceof Blob) {
    url = URL.createObjectURL(file); // local File object (image)
  }

  if (url) {
    setPreviewUrl(url);
    setPreviewType(isPdf ? 'pdf' : 'image');
  }
};

  const closeModal = () => {
    setPreviewUrl(null);
  };

  const handleRemoveFile = (index, event) => {
    event.stopPropagation(); // Prevent triggering the image click
    if (onRemoveFile) {
      onRemoveFile(index);
    }
  };


  const renderFiles = () => {
    // if (files.length === 0) {
    //   return <p className="file-color">{t('no_files_uploaded')}</p>
    // }

    return files.map((file, i) => {
      const isUrl = typeof file === "string" || file?.Upload_files;
      const fileUrl = isUrl ? file?.Upload_files || file : "";
      // Detect if file is a PDF
      let isPdf = false;
      if (
        fileUrl &&
        typeof fileUrl === "string" &&
        fileUrl.toLowerCase().endsWith(".pdf")
      ) {
        isPdf = true;
      } else if (file && file.type === "application/pdf") {
        isPdf = true;
      }
      return (
        <>{ 
          files.length > 0 ? (
      
        <div
          key={i}
          className={`h-[45px] w-[45px] align-items-center border-[1px] border-[#929398] d-flex justify-content-center text-center rounded-[6px] me-2 ${className} position-relative`}
          onClick={() =>
            handleImageClick(isUrl ? (file?.Upload_files || file) : file)
          }
          style={{ cursor: "pointer" }}
        >
          <SVGIcon 
            name={isPdf ? "pdf" : "uploadedImg"} 
            size={45}
            alt={isPdf ? "PDF file" : "Uploaded file"}
          />
          {onRemoveFile && !disabled && (
            <button
              type="button"
              className="remove-file-btn"
              onClick={(e) => handleRemoveFile(i, e)}
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#E71D36",
                border: "none",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 1,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 3L3 7M3 3L7 7"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>): <p>No files</p>}
        </>
      );
    });
  };

  return (
    <>
      <div className="d-flex gap-1 h-[45px] align-items-center">
        {renderFiles()}
      </div>

      {isLoading && (
        <CustomModal
          open={isLoading}
          onClose={() => setIsLoading(false)}
          modalStyles={{
            maxWidth: 400,
            height: "200px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading...</p>
          </div>
        </CustomModal>
      )}

      {/* {previewUrl && (
        <CustomModal
          open={previewUrl}
          onClose={closeModal}
          modalStyles={{
            maxWidth: 1200,
            height: "680px",
            minWidth: "85%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          closeIcon
        >
          {previewType === "pdf" ? (
            <iframe
              src={previewUrl}
              title="PDF Preview"
              style={{
                height: "600px",
                width: "1100px",
                maxWidth: "100%",
                border: "none",
              }}
              frameBorder="0"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              style={{ height: "500px", width: "1100px", maxWidth: "100%" }}
            />
          )}
        </CustomModal>
      )} */}

     {previewUrl && (
  <CustomModal
    open={previewUrl}
    onClose={closeModal}
    modalStyles={{
      width: "70vw",       // modal width = 80% of viewport
      maxWidth: "100%",  // max width to avoid too large modal
      height: "85vh",      // modal height = 80% of viewport
      maxHeight: "800px",  // optional max height
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",  // prevent modal scroll, let PDF scroll inside
      padding: "1rem",
    }}
    closeIcon
  >
    {previewType === "pdf" ? (
      <iframe
        src={previewUrl}
        title="PDF Preview"
        style={{
          width: "60vw",
          height: "75vh",
          border: "none",
          objectFit: "contain"
        }}
       
      />
    ) : (
      <img
        src={previewUrl}
        alt="Preview"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain", // scale properly without cropping
        }}
      />
    )}
  </CustomModal>
)}


    </>
  );
};

export default FileIcons;
