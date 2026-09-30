import React, { useEffect, useState, startTransition, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { NormalButton } from "../../Common/NormalButton";
import { useForm } from "react-hook-form";
import "./style.scss";
import FormSubmittedMessage from "./FormSubmittedMessage/FormSubmittedMessage";
import CustomModal from "../../Common/Modal";
import GeneralDetailsComp from "./GeneralDetails/GeneralDetails";
import LegalIdentificationComp from "./LegalIdentification/LegalIdentification";
import PaymentTermsComp from "./PaymentTerms/PaymentTerms";
import BankDetailsComp from "./BankDetails/BankDetails";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { setUserData } from "../../../redux/actions/userRegisterActions";
import { connect } from "react-redux";
import { useTranslation } from "react-i18next";
import { fetchOnboardVendorData, userRegister } from "api/UserRegister";
import LanguageSwitcher from "../../Common/LanguageSwitcher";
import dayjs from "dayjs";
import { fileUpload } from "../../../api/FileUpload";
import { showToast } from "../../../redux/actions/toastActions";
import { useLocation, useParams } from "react-router";
import { PageLoader } from "components/Common/PageLoader";
import { HeaderBar } from "components/Common/HeaderBar";
import { UtilIcon } from "components/Common/UtilIcon";
import { downloadIcon2, emailReport } from "constants/imageConstants";
import { ADMIN_USER_TYPE } from "constants/userType";
import { getEntityId } from "services/utilities";
import { toast } from "react-toastify";

const VendorRegComp = ({ showToast, setUserData, userInfo: { userType } }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [actionType, setActionType] = useState('')
  const { search } = useLocation()
  const isAdmin = userType === ADMIN_USER_TYPE
  const urlQueryParams = new URLSearchParams(search)
  const [tradingLicenseFiles, setTradingLicenseFiles] = useState([])
  const [nationalIdFiles, setNationalIdFiles] = useState([])
  const [vatFiles, setVatFiles] = useState([])
  const [paymentFiles, setPaymentFiles] = useState([])
  const [ndaFiles, setNdaFiles] = useState([])
  const [bankFiles, setBankFiles] = useState([])
  const [appRefNum, setAppRefNum] = useState(null)
  const { t, i18n } = useTranslation(['register', 'otp', 'login', 'vendors', 'sidebar', 'toast'])
   const isArabic = i18n.language === "ar";
  const steps = [
    { number: 1, label: t("general_communication_details") },
    { number: 2, label: t("legal_identification_details") },
    { number: 3, label: t("payment_terms") },
    { number: 4, label: t("bank_details") },
  ];
  const queryObject = Object.fromEntries(urlQueryParams.entries());
  const {
    register,
    formState: { errors },
    trigger,
    control,
    watch,
    getValues,
    clearErrors,
    setValue,
    setError,
  } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      phone_number: "",
      country_code: "+971",
      creditnote_payment_terms: "ZU00 - Immediate Due",
      daikinEntityName: isAdmin ? "Daikin Middle East" : "",
    },
  });

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get("mode");
  const applicationId = queryParams.get("id");
  const entityName = queryParams.get("entityName");
  const contactName = queryParams.get("contactName");
  const isAddVendorPage = location.pathname.includes("add-vendor");

  const [onboardVendorData, setOnboardVendorData] = useState(null);
  const containerRef = useRef(null);
  const scrollToFirstError = () => {
    setTimeout(() => {
      // Find the first error element - check multiple error selectors
      const firstErrorElement = document.querySelector(
        '.error-text, .error-phoneText, [data-error="true"], .form-error, .error-message'
      );

      if (firstErrorElement) {
        // Find the closest form field container
        const fieldContainer =
          firstErrorElement.closest(".form-field") ||
          firstErrorElement.closest(".inputBox") ||
          firstErrorElement.closest(".select-container") ||
          firstErrorElement.closest(".radio-container") ||
          firstErrorElement.closest(".form-group") ||
          firstErrorElement.parentElement;

        if (fieldContainer) {
          fieldContainer.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          setTimeout(() => {
            const currentScroll =
              window.pageYOffset || document.documentElement.scrollTop;
            window.scrollTo({
              top: currentScroll - 100,
              behavior: "smooth",
            });
          }, 100);

          fieldContainer.classList.add("error-field-highlight");

          setTimeout(() => {
            fieldContainer.classList.remove("error-field-highlight");
          }, 2000);
        }
      } else {
        const errorInput = document.querySelector(
          'input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]'
        );
        if (errorInput) {
          const container =
            errorInput.closest(".form-field") ||
            errorInput.closest(".inputBox") ||
            errorInput.closest(".select-container") ||
            errorInput.parentElement;

          if (container) {
            container.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

            setTimeout(() => {
              const currentScroll =
                window.pageYOffset || document.documentElement.scrollTop;
              window.scrollTo({
                top: currentScroll - 100,
                behavior: "smooth",
              });
            }, 100);

            container.classList.add("error-field-highlight");

            setTimeout(() => {
              container.classList.remove("error-field-highlight");
            }, 2000);
          }
        }
      }
    }, 100);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  useEffect(() => {
    if (mode === "edit" || mode === "view") {
      let query = {
        id: applicationId,
      };
      fetchOnboardVendorData(query)
        .then((res) => {
          setOnboardVendorData(res?.data?.data);
        })
        .catch((err) => {
          console.log(err, "error");
        });
    }
    return;
  }, [mode]);

  useEffect(() => {
    window.getValues = getValues;
  }, [getValues]);

  const DEFAULT_DIAKIN_ENTITY_NAME =
    onboardVendorData?.Daikin_Company_Name || entityName || isAdmin
      ? "Daikin Middle East"
      : "";

  const DEFAULT_CONTACT_NAME =
    onboardVendorData?.Daikin_Contact_Name || contactName;

  const handleNext = async () => {
    let isValid = false;

    const emailFields = Object.keys(getValues())
      .filter((x) => x.includes("email"))
      .map((x) => x);

    if (currentStep === 0) {
      isValid = await trigger([
        "vendor_name",
        "vendorNameArabic",
        "street_and_house_number",
        "postel_code",
        "country",
        "city",
        "region",
        "phone_number",
        "fax",
        "industryType",
        "industryKey",
        "wht_applicable",
        "wht_rate",
        "taxable_basis",
        ...emailFields,
      ]);
    }
    if (currentStep === 1) {
      isValid = await trigger([
        'license_file',
        'vat_file',
        'national_file',
        'nda_file',
        'license_number',
        'license_expiry_date',
        'national_id_number',
        'national_id_expiry_date',
        'vat_number',
        'vat_group_name',
        'is_vat'
      ])
    }
    if (currentStep === 2) {
      isValid = await trigger([
        "payment_terms",
        "creditnote_payment_terms",
        "incoterms",
        "incoterms_location",
        "other_payment_terms",
        "final_payment_term",
        "payment_file"
      ]);
    }
    if (currentStep === 3) {
      isValid = await trigger();
    }

    if (isValid) {
      const formData = getValues(); // Get current form data
      setUserData(formData);
      if (currentStep === steps.length - 1) {
        setIsModalOpen(true);
        setModalMessage(
          t("login:yourApplicationHasBeenSavedButIsNotYetSubmitted")
        );
        setActionType("save");
      } else {
        const id = setTimeout(() => {
          setCurrentStep(currentStep + 1);
          clearTimeout(id);
        }, 1000);
      }
    } else {
      scrollToFirstError();
    }
  };
  const handleSubmitForm = async () => {
    const isValid = await trigger();

    if (isValid) {
      setIsModalOpen(true);
      setModalMessage(t("login:areYouSureYouWantToSubmitYourApplication"));
      setActionType("submit");
    } else {
      scrollToFirstError();
    }
  };

  const attachmentTypeMap = {
  license_file: "TRADE LICENSE",
  national_file: "NATIONAL ID",
  vat_file: "VAT",
  NDA_file: "NDA",
  payment_file: "PAYMENT TERMS",
  bank_file: "BANK FILE"
};


  const handleConfirmSubmit = () => {
    setIsLoading(true);
    if (actionType === "save") {
      const formData = getValues();

      const payload = {
        vendorDetails: {
          ABC_Indicator: "A",
          Vendor_Name_EN: formData?.vendor_name,
          Vendor_Name_AR: formData?.vendorNameArabic,
          //CoCd: queryObject?.entity_id || isAdmin ? 1 : '',
          CoCd: isAdmin ? getEntityId() : queryObject?.entity_id || "",
          Daikin_Company_Name:
            queryObject?.entityName || isAdmin ? "Daikin Middle East" : "",
          City: formData?.city,
          Country: formData?.country,
          Region: formData?.region,
          Email: formData?.email,
          Phone: `${formData?.country_code?.replace("+", "")}${formData?.phone_number
            }`,
          Fax: formData?.fax,
          Postal_Code: formData?.postel_code,
          Street_House_No: formData?.street_and_house_number,
          Payment_Terms: formData?.final_payment_term,
          Creditnote_Payment_Terms: formData?.creditnote_payment_terms,
          // Daikin_Contact_Name: contactName,
          // Daikin_Company_Name: entityName,
          Incoterms: formData?.incoterms,
          Incoterms_Location: formData?.incoterms_location,
          Is_VAT: formData?.is_vat === 'yes',
          Taxble_Basis: formData?.taxable_basis,
          Wht_Applicable: formData?.wht_applicable === 'yes',
          Wht_Rate: formData?.wht_rate ? String(formData?.wht_rate).replace('%', '') : 0,
          Trade_license_number: formData?.license_number,
          License_Expiry_Date: formData?.license_expiry_date
            ? dayjs(formData.license_expiry_date).format("YYYY-MM-DD")
            : undefined,
          VAT_Number: formData?.vat_number,
          VAT_Group_Name: formData?.vat_group_name,
          // ABC_Indicator: 'A',
          National_Id_Expiry_Dt: formData?.national_id_expiry_date
            ? dayjs(formData.national_id_expiry_date).format("YYYY-MM-DD")
            : undefined,
          National_Id_No: formData?.national_id_number,
          //CR_Person_Id: queryObject?.cr_person_id,
          CR_Person_Id:
            queryObject?.cr_person_id ??
            formData.diakinContactName ??
            formData.diakinContactName,
          Daikin_Contact_Name: queryObject?.contactName,
          Industry_Type: formData?.industryType,
          Industry_Key: formData?.industryKey,
          Short_Payment_Reason: formData?.short_payment_reason,
          Action: "Add",
          license_file: [],
          national_file: [],
          vat_file: [],
          payment_file: [],
          NDA_file: [],
          bank_file: []
        },
        bankDetails: {
          Bank_Account_Currency: formData?.bank_account_currency,
          Bank_Account_Number: formData?.bank_account_number,
          Bank_Charge_Indicator: "A",
          Bank_City: formData?.bank_city,
          Bank_Country: formData?.bank_country,
          Bank_Name: formData?.bank_name,
          Bank_Postal: formData?.bank_postal,
          Invoice_Currency: formData?.invoice_currency,
          Street_Building_Number: formData?.street_and_building_number,
          Swift_Code: formData?.swift_code,
          IBAN_Number: formData?.iban_number,
          CreatedBy: 1,
          Is_Deleted: false,
          Payment_By: "Bank Transfer",
        },
      };

      const allTypedFiles = [
        ...(formData?.license_file || []).map((file) => ({ file, type: 'license_file' })),
        ...(formData?.national_file || []).map((file) => ({ file, type: 'national_file' })),
        ...(formData?.vat_file || []).map((file) => ({ file, type: 'vat_file' })),
        ...(formData?.payment_file || []).map((file) => ({ file, type: 'payment_file' })),
        ...(formData?.nda_file || []).map((file) => ({ file, type: 'NDA_file' })),
        ...(formData?.bank_file || []).map((file) => ({ file, type: 'bank_file' }))
      ]

      const uploadPromises = allTypedFiles.map(({ file, type }) => {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("vendor_code", "REGISTRATION");
        fd.append("module", getValues("vendor_name") || "");
        fd.append("attachment_type", attachmentTypeMap[type] || "");
   


        return fileUpload(fd)
          .then((res) => ({
            success: true,
            type,
            url: res.data?.data?.url,
          }))
          .catch((err) => ({
            success: false,
            type,
            error: err,
          }));
      });

      Promise.all(uploadPromises)
        .then((results) => {
          results.forEach(({ success, type, url }) => {
            if (success && url) {
              payload.vendorDetails[type].push(url);
            }
          });

          setIsModalOpen(false);
        })
        .catch((err) => {
          console.error(err);
          //showToast('Error', 'File upload failed.', 'error')
          toast.error(t('toast:fileUploadFailed'))
          setIsModalOpen(false)
        })
    } else if (actionType === 'submit') {
      const formData = getValues()

      const payload = {
        vendorDetails: {
          ABC_Indicator: "A",
          Vendor_Name_EN: formData?.vendor_name,
          Vendor_Name_AR: formData?.vendorNameArabic,
          // Vendor_Name_AR: 'تك كورب سولوشن',
          //CoCd: isAdmin ? getEntityId() : queryObject?.entity_id || '',
          CoCd: isAdmin ? getEntityId() : queryObject?.entity_id || "",
          Daikin_Company_Name:
            queryObject?.entityName || isAdmin ? "Daikin Middle East" : "",
          City: formData?.city,
          Country: formData?.country,
          Region: formData?.region,
          Email: formData?.email,
          Phone: `${formData?.country_code?.replace("+", "")}${formData?.phone_number
            }`,
          Fax: formData?.fax,
          Postal_Code: formData?.postel_code,
          Street_House_No: formData?.street_and_house_number,
          Payment_Terms: formData?.final_payment_term,
          Creditnote_Payment_Terms: formData?.creditnote_payment_terms,
          // Daikin_Contact_Name: contactName,
          // Daikin_Company_Name: entityName,
          Incoterms: formData?.incoterms,
          Incoterms_Location: formData?.incoterms_location,
          Is_VAT: formData?.is_vat === 'yes',
          Taxble_Basis: formData?.taxable_basis,
          Wht_Applicable: formData?.wht_applicable?.toLowerCase() === 'yes' ? true : false,
          Wht_Rate: formData?.wht_rate ? String(formData?.wht_rate).replace('%', '') : 0,
          Trade_license_number: formData?.license_number,
          License_Expiry_Date: formData?.license_expiry_date
            ? dayjs(formData.license_expiry_date).format("YYYY-MM-DD")
            : undefined,
          VAT_Number: formData?.vat_number,
          VAT_Group_Name: formData?.vat_group_name,
          // ABC_Indicator: 'A',
          National_Id_Expiry_Dt: formData?.national_id_expiry_date
            ? dayjs(formData.national_id_expiry_date).format("YYYY-MM-DD")
            : undefined,
          National_Id_No: formData?.national_id_number,
          //CR_Person_Id: queryObject?.cr_person_id ?? formData.diakinContactName,
          CR_Person_Id: queryObject?.cr_person_id ?? formData.diakinContactName,
          Daikin_Contact_Name: queryObject?.contactName,
          Industry_Type: formData?.industryType,
          Industry_Key: formData?.industryKey,
          Short_Payment_Reason: formData?.short_payment_reason,
          Action: "Add",
          license_file: [],
          national_file: [],
          vat_file: [],
          payment_file: [],
          NDA_file: [],
          bank_file: []
        },
        bankDetails: {
          Bank_Account_Currency: formData?.bank_account_currency,
          Bank_Account_Number: formData?.bank_account_number,
          Bank_Charge_Indicator: "A",
          Bank_City: formData?.bank_city,
          Bank_Country: formData?.bank_country,
          Bank_Name: formData?.bank_name,
          Bank_Postal: formData?.bank_postal,
          Invoice_Currency: formData?.invoice_currency,
          Street_Building_Number: formData?.street_and_building_number,
          Swift_Code: formData?.swift_code,
          IBAN_Number: formData?.iban_number,
          CreatedBy: 1,
          Is_Deleted: false,
          Payment_By: "Bank Transfer",
        },
      };

      const allTypedFiles = [
        ...(formData?.license_file || []).map((file) => ({ file, type: 'license_file' })),
        ...(formData?.national_file || []).map((file) => ({ file, type: 'national_file' })),
        ...(formData?.vat_file || []).map((file) => ({ file, type: 'vat_file' })),
        ...(formData?.payment_file || []).map((file) => ({ file, type: 'payment_file' })),
        ...(formData?.nda_file || []).map((file) => ({ file, type: 'NDA_file' })),
        ...(formData?.bank_file || []).map((file) => ({ file, type: 'bank_file' }))
      ]

      const uploadPromises = allTypedFiles.map(({ file, type }) => {
        const fd = new FormData();
        fd.append("image", file);
        fd.append("vendor_code", "REGISTRATION");
        fd.append("module", getValues("vendor_name") || "");
        fd.append("attachment_type", attachmentTypeMap[type] || "");

        return fileUpload(fd)
          .then((res) => ({
            success: true,
            type,
            url: res.data?.data?.url,
          }))
          .catch((err) => ({
            success: false,
            type,
            error: err,
          }));
      });

      Promise.all(uploadPromises)
        .then((results) => {
          results.forEach(({ success, type, url }) => {
            if (success && url) {
              payload.vendorDetails[type].push(url);
            }
          });
          setIsModalOpen(false);
          userRegister(payload)
            .then((res) => {
              setIsLoading(false);
              setFormSubmitted(true);
              setAppRefNum(res?.data?.data?.Application_Number);
              setIsModalOpen(false);
            })
            .catch((err) => {
              console.error(err);
              setIsLoading(false);
              //showToast('Error.', `${err?.response?.data?.message}`, 'error')
              toast.error(
                err?.response?.data?.message ||
                t("toast:applicationSubmissionFailed")
              );
              setIsModalOpen(false);
            });
        })
        .catch((err) => {
          console.error(err);
          //showToast('Error', 'File upload failed.', 'error')
          toast.error(t("toast:fileUploadFailed"));
          setIsModalOpen(false);
          setIsLoading(false);
        });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleCancelSubmit = () => {
    setIsModalOpen(false);
  };

  const onChangeFileHandler = (event) => {
    const { name, files } = event.target;

    const renamedFiles = Array.from(files).map((file, index) => {
      const fileExtension = file.name.split(".").pop();
      return new File([file], `${name}-${index + 1}.${fileExtension}`, {
        type: file.type,
      });
    });

    if (name === 'license_file') {
      setTradingLicenseFiles(renamedFiles)
    } else if (name === 'national_file') {
      setNationalIdFiles(renamedFiles)
    } else if (name === 'vat_file') {
      setVatFiles(renamedFiles)
    } else if (name === 'payment_file') {
      setPaymentFiles(renamedFiles)
    } else if (name === 'nda_file') {
      setNdaFiles(renamedFiles)
    } else if (name === 'bank_file') {
      setBankFiles(renamedFiles)
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <GeneralDetailsComp
            register={register}
            errors={errors}
            control={control}
            watch={watch}
            trigger={trigger}
            getValues={getValues}
            clearErrors={clearErrors}
            setValue={setValue}
            daikinEntityName={DEFAULT_DIAKIN_ENTITY_NAME}
            daikinContactName={DEFAULT_CONTACT_NAME}
            onboardVendorData={onboardVendorData}
            mode={mode}
          />
        );
      case 1:
        return (
          <LegalIdentificationComp
            onChangeFileHandler={onChangeFileHandler}
            register={register}
            errors={errors}
            control={control}
            getValues={getValues}
            trigger={trigger}
            tradingLicenseFiles={tradingLicenseFiles}
            nationalIdFiles={nationalIdFiles}
            vatFiles={vatFiles}
            ndaFiles={ndaFiles}
            watch={watch}
            setValue={setValue}
            setError={setError}
            clearErrors={clearErrors}
            nationalFieldsMandatory={DEFAULT_DIAKIN_ENTITY_NAME === "saudi"}
            onboardVendorData={onboardVendorData}
            mode={mode}
          />
        );
      case 2:
        return (
          <PaymentTermsComp
            onChangeFileHandler={onChangeFileHandler}
            paymentFiles={paymentFiles}
            register={register}
            setValue={setValue}
            errors={errors}
            control={control}
            watch={watch}
            onboardVendorData={onboardVendorData}
            mode={mode}
            setError={setError}
            clearErrors={clearErrors}
          />
        );
      case 3:
        return (
          <BankDetailsComp
            register={register}
            errors={errors}
            control={control}
            setValue={setValue}
            watch={watch}
            onboardVendorData={onboardVendorData}
            mode={mode}
            clearErrors={clearErrors}
            bankFiles={bankFiles}
            onChangeFileHandler={onChangeFileHandler}
          />
        );
      default:
        return <div>Unknown Step</div>;
    }
  };

  //TODO: Remove this after blocker has been fixed
  const __tempTabChanger = (i) => {
    startTransition(() => setCurrentStep(i));
  };

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        margin: "0",
        maxHeight: "100vh",
        // height:'auto',
        overflowY: "scroll",
        position: "relative",
        //padding: '4rem'
      }}
      className={
        isAddVendorPage
          ? "pt-[10px] px-[30px] pb-[30px] max-[1023px]:p-[3rem]"
          : "p-[4rem] max-[1023px]:p-[3rem]"
      }
    >
      {!isAdmin && (
        <div className="absolute px-[4rem] max-[1023px]:px-[3rem] top-[20px] ltr:right-0 rtl:left-0">
          <LanguageSwitcher />
        </div>
      )}

      {userType === ADMIN_USER_TYPE && (
        <HeaderBar
          title={t("vendors:addNewVendor")}
          slug={`${t("sidebar:home")} / ${t("vendors:vendors")} / ${t(
            "vendors:addNewVendor"
          )}`}
        />
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box
          display="flex"
          className="items-center overflow-x-auto no-scrollbar"
        >
          {steps.map((step, index) => {
            // const isCompleted = index <= currentStep
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            return (
              <Box
                // onClick={() => __tempTabChanger(index)}
                key={step.number}
                display="flex"
                alignItems="center"
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: isActive
                      ? "var(--brand-secondary-color, #1B71AB)"
                      : isCompleted
                        ? "var(--brand-primary-color, #00A0E4)"
                        : "#ccc",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: "bold",
                    marginInlineEnd: 1,
                  }}
                >
                  {step.number}
                </Box>

                <Typography
                  sx={{
                    fontSize: "16px",
                    // fontWeight: isCompleted ? 'bold' : 'normal',
                    fontWeight: isActive ? 700 : isCompleted ? 600 : 500,
                    color: "#333",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </Typography>

                {index < steps.length - 1 && (
                  <ChevronRightIcon
                    className="rtl:rotate-180"
                    sx={{ color: isCompleted ? "var(--brand-primary-color, #009FE3)" : "#ccc", margin: 1 }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {!formSubmitted ? (
        <>
          <Box sx={{ mt: 4, mb: 4 }}>{renderStepContent(currentStep)}</Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: isArabic ? "end" : "right",
              paddingRight: "30px",
              marginBottom: "10px",
            }}
          >
            <NormalButton
              disabled={currentStep === 0}
              label={t("back")}
              outlineBtn
              customClass="navigation-buttons ms-4 me-3"
              onClick={handleBack}
              style={{
                visibility: currentStep === 0 ? "hidden" : "visible",
                fontSize: "15px !important",
              }}
            />
            <div className={`d-flex ${currentStep === 3 ? "gap-3" : "gap-0"}`}>
              {currentStep !== 3 && (
                <NormalButton
                  label={
                    currentStep === 3
                      ? t("save_and_close")
                      : t("save_and_continue")
                  }
                  isPrimary
                  customClass="navigation-buttons"
                  onClick={handleNext}
                />
              )}

              <NormalButton
                type="submit"
                label={t("submit")}
                isPrimary
                customClass="navigation-buttons"
                onClick={handleSubmitForm}
                style={{
                  display: currentStep < steps.length - 1 ? "none" : "block",
                }}
              />
            </div>
          </Box>
        </>
      ) : (
        <FormSubmittedMessage appRefNum={appRefNum} />
      )}

      {/* Modal for confirmation */}
      <CustomModal
        open={isModalOpen}
        onClose={handleCancelSubmit}
        modalStyles={{ width: 600 }}
        closeIcon
      >
        {isLoading && (
          <div className="loader-overlay">
            <PageLoader />
          </div>
        )}
        <p className="modalTxt">{modalMessage}</p>
        <div className="d-flex justify-content-between my-3 gap-4">
          <NormalButton
            label={t("otp:cancel")}
            outlineBtn
            customClass="modal-navigation-buttons"
            customBtnClass="customBtn"
            onClick={handleCancelSubmit}
          />
          <NormalButton
            label={t("otp:confirm")}
            isPrimaryModal
            customClass="modal-navigation-buttons"
            customBtnClass="customBtn"
            // type="submit"
            onClick={handleConfirmSubmit}
          />
        </div>
      </CustomModal>
    </Box>
  );
};
const mapStateToProps = (state) => {
  return {
    userReg: state.userReg.userData,
    dropdownData: state.userReg.dropdownData,
    userInfo: state.userInfo,
  };
};

const mapDispatchToProps = { setUserData, showToast };

export default connect(mapStateToProps, mapDispatchToProps)(VendorRegComp);
