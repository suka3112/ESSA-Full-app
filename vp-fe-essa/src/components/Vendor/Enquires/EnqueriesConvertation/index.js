import { HeaderBar } from "components/Common/HeaderBar";
import {
  BankDetailsContainer,
  BankDetailsContent,
  BankFields,
  EditButtonContainer,
  FileDetailsContainer,
} from "components/Vendor/MyProfile/BankDetails/BankDetails.style";
import styles from "./Enquiry.module.scss";
import { showToast } from "redux/actions/toastActions";
// import styles from '../../InvoiceProcessing/POBased/ViewPOBased/ViewPOBased.module.scss'
import {
  EnqResponseContainer,
  EnqResponseHeader,
  EnqResponseSection,
  EnqContactPerson,
  EnqDate,
  EnqContent,
  EnqInnerContainer,
  EnqMsgInputContainer,
  EnqMsgInputField,
  EnqHeadTitle,
  EnqDateTitle,
  EnqMsgIcon,
  EnqMsgInputWrapper,
  EnqDetailsContainer,
} from "./EnqueriesConvertation.style";
import { LeftPageContainer } from "pages/vendor/dashboard/dashboard.styles";
import React, { useState, useEffect, useRef, Suspense } from "react";
import AttachFileIcon from "@mui/icons-material/AttachFile"; // MUI paper clip icon

import SearchInput from "components/Common/SearchInput";
import addMessageIcon from "assets/icons/addMessageIcon.svg";
import sendMessageIcon from "assets/icons/sendMessageIcon.svg";
import { useLocation, useNavigate } from "react-router-dom";
import { getEnquiryById, addResponse, updateStatus } from "api/Enquiry";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { SelectBox } from "components/Common/SelectBox";
import { useTranslation } from "react-i18next";
import { connect, useSelector } from "react-redux";
import { getEntityId } from "services/utilities";
import { BUSINESS_USER_TYPE, VENDOR_USER_TYPE } from "constants/userType";
// import { Page } from '@react-pdf/renderer'
import { PageLoader } from "components/Common/PageLoader";
import { fileUpload } from "api/FileUpload";
import FileIcons from "components/Common/FileIcons";
import { enquiryAttachmentTypeOptions } from "services/helpers/constants/common";

const statusOptions = [
  { label: "Under Review", value: 2 },
  { label: "Resolved", value: 3 },
];
// Status mapping for Enquiry_status
const statusTextMap = {
  1: "Submitted",
  2: "Under Review",
  3: "Resolved",
};
//convert URL arrays to Object for FileIcons
const convertUrlsToFileObjects = (urlArray) => {
  if (!Array.isArray(urlArray)) return [];

  return urlArray.map((url, index) => ({
    id: index,
    Upload_files: url,
    document_name: url.split("/").pop() || `File ${index + 1}`,
    file_type: url.split(".").pop() || "unknown",
  }));
};
const EnqueriesConvertation = ({ showToast }) => {
  const navigate = useNavigate();

  const userType = useSelector((state) => state?.userInfo?.userType);
  const location = useLocation();

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const isCreated = location?.state?.isCreated;
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get("id");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [enquiry, setEnquiry] = useState(null);
  const [status, setStatus] = useState("Under Review");
  const { t, i18n } = useTranslation([
    "enquiries",
    "toast",
    "advance_payment",
    "soa",
    "sidebar",
    "dashboard",
    "non_po_based_invoices"
  ]);
  const isArabic = i18n.language === 'ar'
    const uploadVendorCode = useSelector((state) => state?.dashboard?.dashboardData?.profile?.Vendor_SAP_Code)

  const getAttachmentLabelWithTranslation = (value, t) => {
  switch (value) {
    case "invoice":
      return t("non_po_based_invoices:invoice");
    case "bank data":
      return t("bankData");
    case "email":
      return t("email");
    case "others":
      return t("non_po_based_invoices:others");
    default:
      return value;
  }
};

const translatedOptions = enquiryAttachmentTypeOptions.map((option) => ({
  label: getAttachmentLabelWithTranslation(option.value, t),
  value: option.value,
}));

  const fileInputRef = useRef();
  const messageInputRef = useRef();

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = messageInputRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleMediaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // reset so same file can be selected again
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate file type (image or PDF)
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
    ];

    const MAX_FILES = 3;
    const currentCount = uploadedFiles?.length || 0;
    if (currentCount >= MAX_FILES) {
      toast.error("Maximum 3 files are allowed");
      return;
    }

    const remainingSlots = MAX_FILES - currentCount;
    const accepted = [];
    const rejectedInvalid = [];

    for (const file of files) {
      if (accepted.length >= remainingSlots) break; // don't exceed remaining slots
      if (!allowedTypes.includes(file.type)) {
        rejectedInvalid.push(file.name || file.type);
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length) {
      setUploadedFiles((prev) => [...(prev || []), ...accepted]);
    }

    if (rejectedInvalid.length) {
      // Inform user which files were skipped due to invalid type
      toast.error("Only images and PDF files are allowed.");
    }

    // If user selected more files than remaining slots, inform them
    if (files.length > accepted.length) {
      const skipped = files.length - accepted.length;
      if (skipped > 0 && accepted.length === remainingSlots) {
        toast.error("Maximum 3 files are allowed");
      }
    }
  };
  const fetchData = async () => {
    let query = {
      entity_id: getEntityId(),
    };
    try {
      setLoading(true);
      const enqResponse = await getEnquiryById(id, query);
      setEnquiry(enqResponse.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(t("failedToLoadDetails"));
    } finally {
      setLoading(false);
    }
  };

  // Handle sending a new response
  const handleSendResponse = async () => {
    if (!message.trim()) return;

    try {
      setLoading(true);
      // 1. Upload all files and collect their URLs/types
      let uploadedFileInfos = [];
       const vendorCode =
  userType === BUSINESS_USER_TYPE
    ? enquiry?.user?.Vendor_SAP_Code   
    : uploadVendorCode;                

        const module = 'ENQUIRIES'  // static value
        const attachmentType = 'comment'        
      for (const file of uploadedFiles) {
        const fd = new FormData();
        fd.append("image", file); 
        fd.append('vendor_code', vendorCode)
        fd.append('module', module)
        fd.append('attachment_type', attachmentType)
        const res = await fileUpload(fd);
        const url = res.data?.data?.url;
        if (url) {
          uploadedFileInfos.push({
            Upload_files: url,
            document_name: file.name,
            Attachment_type: file.type.startsWith("image/") ? "image" : "pdf",
          });
        }
      }
      // 2. Prepare payload for addResponse
      const payload = {
        message,
        Upload_files: uploadedFileInfos,
      };
      // Add the new response
      const response = await addResponse(id, payload, {}, "enquiry");

      // Update the enquiry state with the new response
      if (enquiry && response.data.data) {
        setEnquiry((prev) => ({
          ...prev,
          responses: [...(prev.responses || []), response.data.data],
        }));
      }
      setUploadedFiles([]); // Clear uploaded files
      fetchData();
      setMessage("");
      showToast(
        t("toast:successTitle"),
        t("responseSentSuccesfully"),
        "success"
      );
    } catch (error) {
      console.error("Error sending response:", error);
      toast.error(t("failedToSendResponse"));
    } finally {
      setLoading(false);
    }
  };

  // Filter responses based on search term
  const filteredResponses = (enquiry?.response || []).filter(
    (response) =>
      response?.Message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (response?.createdByUser?.name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      )
  );

  // const filteredResponses = enquiry?.response

  // Format date
  const formatDate = (dateString) => {
    return dayjs(dateString).utc().format("DD/MM/YYYY");
  };
  // Format date
  const formatDateTime = (dateString) => {
    return dayjs(dateString).utc().format("DD/MM/YYYY hh:mm A");
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    try {
      setLoading(true);
      // Call API to update status
      await updateStatus(id, { Enquiry_status: newStatus });
      showToast(
        t("toast:successTitle"),
        t("enquiryStatusUpdatedSuccess"),
        "success"
      );
      fetchData();
    } catch (error) {
      console.error("Error updating enquiry status:", error);
      toast.error(t("failedToUpdateStatus"));
    } finally {
      setLoading(false);
    }
  };

  // Highlight matched text in a string
  const highlightMatch = (text, search) => {
    if (!search) return text;
    const regex = new RegExp(
      `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(regex, "<mark>$1</mark>");
  };

  return (
    <LeftPageContainer>
      {loading ? (
        <div className="no-data-container-view">
          <PageLoader />
        </div>
      ) : (
        <>
          <HeaderBar
            title={`${enquiry?.Enquiry_code}`}
            slug={`${t("sidebar:home")} / ${t("enquiries")} / ${
              enquiry?.Enquiry_code
            }`}
            statusTag={statusTextMap[enquiry?.Enquiry_status] || "Under Review"}
          >
            <div className="d-flex justify-content-between align-items-center" style={{gap: isArabic ? '15px' : ''}}>
              {userType !== VENDOR_USER_TYPE  && (
                <div style={{ marginRight: 12, width: 200 }}>
                  <label>{t('enquiryStatus')}</label>
                  <SelectBox
                    options={statusOptions}
                    value={status}
                    label="Enquiry Status"
                    placeholder={t('selectStatus')}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    name="enquiryStatus"
                    height="32px"
                    style={{ minWidth: 180 }}
                  />
                </div>
              )}

              <div className="bg-white px-3 py-2" style={{border: '1px solid rgb(152, 162, 179)', borderRadius: '10px'}}>
                <EnqDateTitle>{t("inquirySubmissionDate.text")}</EnqDateTitle>
                <b>
                  {enquiry?.CreatedDt
                    ? formatDate(enquiry?.CreatedDt)
                    : "Loading..."}
                </b>
              </div>
            </div>
          </HeaderBar>
          <>
            <EnqDetailsContainer>
              <BankDetailsContent style={{ margin: 0 }}>
                <BankFields>
                  <div>
                    <div className={styles.contentLabel}>{t("advance_payment:vendorName")}</div>
                    <div className={styles.contentLabel}>{t("advance_payment:vendorCode")}</div>
                    <div className={styles.contentLabel}>{t("resolvedDate")}</div>
                    <div className={styles.contentLabel}>{t("subject.text")}</div>
                    <div className={styles.contentLabel}>{t("inquiryDescription.text")}</div>
                  </div>
                  <div>
                    <div className={styles.contentValue}>{enquiry?.user?.Vendor_Name_EN || "--"}</div>
                    <div className={styles.contentValue}>{enquiry?.user?.Vendor_SAP_Code || "--"}</div>
                    <div className={styles.contentValue}>
                      {enquiry?.Last_updatetime && enquiry?.Enquiry_status === 3
                        ? formatDate(enquiry?.Last_updatetime)
                        : "Not resolved"}
                    </div>

                    <div className={styles.contentValue}
                      style={{
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        maxWidth: 850,
                      }}
                    >
                      {enquiry?.Subject || "--"}
                    </div>
                    <div className={styles.contentValue}
                      style={{
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        maxWidth: 850,
                      }}
                    >
                      {enquiry?.Enquiry_description || "--"}
                    </div>
                  </div>
                </BankFields>
                {/* <NormalButton isPrimary label='Edit' customClass='px-3' onClick={() => navigate(`/${userType}${CREATE_ENQUIRY}?edit&id=${id}`)} /> */}
              </BankDetailsContent>
            </EnqDetailsContainer>

  <div className={`${styles.attachmentContainer} mt-3`}>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:SNo')}</label>
          {enquiry?.enquiry_files?.map((item, index) => (
            <label>{index + 1}</label>
          ))}
        </div>
        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:AttachmentType')}</label>
          {enquiry?.enquiry_files?.length > 0 ? (
            enquiry?.enquiry_files?.map((file, index) => (
              <label key={index}>
                {/* {file.Attachment_type?.charAt(0).toUpperCase() + file.Attachment_type?.slice(1)} */}
                {translatedOptions.find(
  (opt) => opt.value === file.Attachment_type
)?.label || file.Attachment_type}
              </label>
            ))
          ) : (
            <label>--</label>
          )}
        </div>

        <div className={styles.attachmentDetails}>
          <label className={`fw-semibold ${styles.title}`}>{t('advance_payment:DocumentName')}</label>
          {enquiry?.enquiry_files?.length > 0 ? (
            enquiry?.enquiry_files?.map((file, index) => {
              const splitName = file.Upload_files?.split('/').pop()
              const fileName = file?.File_name?.trim() ? file.File_name : splitName;
              return (
                <label key={index}>
                <a key={index} href={file?.Upload_files} target="_blank" rel="noopener noreferrer">
                  <p className={`cursor-pointer fileLink`}>{fileName || '--'}</p>
                </a>
                </label>
              )
            })
          ) : (
            <label>--</label>
          )}
        </div>
      </div>

            {/* <br /> */}
            {!isCreated ? (
              <BankDetailsContainer style={{padding:'10px 30px',marginTop:'15px'}}>
                <EnqResponseContainer>
                  <EnqResponseHeader>
                    <EnqHeadTitle>{t("comments")}</EnqHeadTitle>
                    <SearchInput
                      placeholder={t("soa:search")}
                      value={searchTerm}
                      onChange={(value) => setSearchTerm(value)}
                    />
                  </EnqResponseHeader>

                  <EnqInnerContainer>
                    {filteredResponses?.length > 0 ? (
                      filteredResponses?.map((response, index) => (
                        <EnqResponseSection key={index}>
                          <EnqContactPerson>
                            {response?.createdByUser?.name || "System"}
                            <span className="ml-2">
                              (
                              {response?.createdByUser?.user_role
                                ?.Role_Name_EN === "Business"
                                ? t("soa:daikin")
                                : response?.createdByUser?.user_role
                                    ?.Role_Name_EN === "Admin"
                                ? t("soa:daikin")
                                : t("dashboard:vendor")}
                              )
                            </span>
                            <EnqDate>
                              {formatDateTime(response?.CreatedDt)}
                            </EnqDate>
                          </EnqContactPerson>
                          <EnqContent
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(
                                (response?.Message || "").replace(/\n/g, '<br />'),
                                searchTerm
                              ),
                            }}
                          />

                          {response?.response_file?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <FileIcons
                                files={response?.response_file || []}
                              />
                            </div>
                          )}
                        </EnqResponseSection>
                      ))
                    ) : (
                      <div>{t("noResponseFound")}</div>
                    )}
                  </EnqInnerContainer>
                  {enquiry?.Enquiry_status !== 3 && (
                    <EnqMsgInputContainer>
                      <EnqMsgInputWrapper>
                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          accept="image/png, image/jpeg, image/jpg, application/pdf"
                          onChange={handleFileChange}
                          multiple
                        />
                        <EnqMsgIcon
                          as="span"
                          alt="Add Media"
                          title="Add files"
                          onClick={handleMediaClick}
                        >
                          <AttachFileIcon
                            fontSize="medium"
                            style={{ color: "var(--brand-primary-color, $primary-color)" }}
                          />
                        </EnqMsgIcon>
                        <EnqMsgInputField
                          placeholder={t('message')}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={(e) => {
                            // if (e.key === "Enter" && !e.shiftKey) {
                            //   e.preventDefault();
                            //   handleSendResponse();
                            // }
                          }}
                          disabled={loading}
                          rows={1}
                          ref={messageInputRef}
                        />
                        <EnqMsgIcon
                          src={sendMessageIcon}
                          alt="Send Message"
                          onClick={handleSendResponse}
                          style={{ cursor: "pointer" }}
                        />
                      </EnqMsgInputWrapper>
                      {uploadedFiles.length > 0 ? (
                        <Suspense
                          fallback={
                            <div className="no-data-container-view">
                              <PageLoader />
                            </div>
                          }
                        >
                          <FileIcons
                            files={uploadedFiles}
                            onRemoveFile={(index) => {
                              const updatedFiles = Array.from(
                                uploadedFiles || []
                              );
                              updatedFiles.splice(index, 1);
                              setUploadedFiles(updatedFiles);
                            }}
                          />
                        </Suspense>
                      ) : null}
                    </EnqMsgInputContainer>
                  )}
                </EnqResponseContainer>
              </BankDetailsContainer>
            ) : null}
          </>
        </>
      )}
    </LeftPageContainer>
  );
};
const mapDispatchToProps = { showToast };
// export default EnqueriesConvertation

export default connect(null, mapDispatchToProps)(EnqueriesConvertation);
