import Fieldset from "components/Common/FieldSet";
import { InputBox } from "components/Common/InputBox";
import React, { Suspense, useEffect, startTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import styles from "./EditLegalIndentificationDetails.module.scss";
import { NormalButton } from "components/Common/NormalButton";
import backArrow from "../../../../../assets/icons/backIconWhite.svg";
import nextIcon from "../../../../../assets/icons/nextIconWhite.svg";
import FileUploadInput from "components/Common/FileUploadInput";
import DateRangePicker from "components/Common/DateRangePicker1";
import { useTranslation } from "react-i18next";
import { connect } from "react-redux";
import { showToast } from "../../../../../redux/actions/toastActions";
import dayjs from "dayjs";
import FileIcons from "components/Common/FileIcons";
import { fileUpload } from "api/FileUpload";
import AppTooltip from "../../../../Common/AppTooltip";
import { Validator } from "services/validation/formValidations";
import { toast } from "react-toastify";

const EditLegalIdentificationDetailsComp = ({
  onNextClick,
  onBackClick,
  setIsEditable,
  myProfile,
  showToast,
  updateEditedData,
  handleFinalSubmit,
  editedData,
  isVendorsProfilePage,
}) => {
  const {
    register,
    formState: { errors },
    setValue,
    handleSubmit,
    control,
    watch,
    setError,
    clearErrors,
    getValues,
    trigger,
    reset,
  } = useForm({ defaultValues: editedData.legal || {} });
  const { t } = useTranslation([
    "legal_identification_comp",
    "myprofile",
    "otp",
  ]);

  const vendorDetails = myProfile;
  const licenseFiles = watch('license_file')
  const nationalFiles = watch('national_file')
  const vatFiles = watch('vat_file')
  const ndaFiles = watch('NDA_file')
  const isVat = watch('Is_VAT');


  useEffect(() => {
    if (Object.keys(editedData.legal || {}).length > 0) {
      const { License_Expiry_Date, National_Id_Expiry_Dt, ...rest } = editedData.legal || {}
      reset({
        ...rest,
        License_Expiry_Date: License_Expiry_Date
          ? dayjs(License_Expiry_Date)
          : null,
        National_Id_Expiry_Dt: National_Id_Expiry_Dt
          ? dayjs(National_Id_Expiry_Dt)
          : null,
      });
    }
  }, [editedData.legal]);

  useEffect(() => {
    if (vendorDetails && !editedData.legal) {
      setValue(
        "Trade_license_number",
        vendorDetails.Trade_license_number || null
      );
      setValue("National_Id_No", vendorDetails.National_Id_No || null);
      setValue("VAT_Group_Name", vendorDetails?.VAT_Group_Name || null);
      setValue("VAT_Number", vendorDetails?.VAT_Number || null);
      setValue(
        "License_Expiry_Date",
        vendorDetails?.License_Expiry_Date
          ? dayjs(vendorDetails.License_Expiry_Date)
          : null
      );
      setValue(
        "National_Id_Expiry_Dt",
        vendorDetails?.National_Id_Expiry_Dt
          ? dayjs(vendorDetails.National_Id_Expiry_Dt)
          : null
      );
      setValue("Is_VAT", vendorDetails?.Is_VAT ? "true" : "false");

      if (vendorDetails?.licence_image?.length) {
        const licenseFiles = vendorDetails.licence_image.map((file) => ({
          preview: file.Upload_files,
          ...file,
        }));
        setValue("license_file", licenseFiles);
      }

      if (vendorDetails?.national_id_image?.length) {
        const nationalFiles = vendorDetails.national_id_image.map((file) => ({
          preview: file.Upload_files,
          ...file,
        }));
        setValue("national_file", nationalFiles);
      }

      if (vendorDetails?.vat_image?.length) {
        const vatFiles = vendorDetails.vat_image.map((file) => ({
          preview: file.Upload_files,
          ...file,
        }));
        setValue("vat_file", vatFiles);
      }

      // if (vendorDetails?.NDA_image?.length) {
      //   const ndaFiles = vendorDetails.NDA_image.map((file) => ({
      //     preview: file.Upload_files,
      //     ...file
      //   }))
      //   setValue('vat_file', vatFiles)
      // }

      if (vendorDetails?.NDA_image?.length) {
        const ndaFiles = vendorDetails.NDA_image.map((file) => ({
          preview: file.Upload_files,
          ...file
        }))
        setValue('NDA_file', ndaFiles)
      }
    }
  }, [vendorDetails]);

  useEffect(() => {
    if (isVat === "no") {
      setValue("VAT_Group_Name", null);
    }
  }, [isVat, setValue]);

  const isEntityNameSaudi =
    vendorDetails?.entity_details?.Entity_Name === "saudi";

  const onSubmit = async (data) => {
    const {
      VAT_Group_Name,
      License_Expiry_Date,
      National_Id_Expiry_Dt,
      National_Id_No,
      Trade_license_number,
      VAT_Number,
      Is_VAT,
    } = data;

    // let licenseExpiryDate = License_Expiry_Date
    //   ? License_Expiry_Date.format('YYYY-MM-DD')
    //   : ''
    // let nationalIdExpiryDate = National_Id_Expiry_Dt
    //   ? National_Id_Expiry_Dt.format('YYYY-MM-DD')
    //   : ''

    let licenseExpiryDate = License_Expiry_Date
      ? dayjs(License_Expiry_Date).format("YYYY-MM-DD")
      : null;
    let nationalIdExpiryDate = National_Id_Expiry_Dt
      ? dayjs(National_Id_Expiry_Dt).format("YYYY-MM-DD")
      : null;

    let payload = {
      vendor_onboard_id: vendorDetails?.vendor_onboard_id,
      National_Id_No: National_Id_No === "" ? null : National_Id_No,
      Trade_license_number: Trade_license_number === "" ? null : Trade_license_number,
      VAT_Group_Name: VAT_Group_Name === "" ? null : VAT_Group_Name,
      License_Expiry_Date: licenseExpiryDate === "" ? null : licenseExpiryDate,
      National_Id_Expiry_Dt: nationalIdExpiryDate === "" ? null : nationalIdExpiryDate,
      VAT_Number: VAT_Number === "" ? null : VAT_Number,
      license_file: [],
      national_file: [],
      vat_file: [],
      NDA_file: [],
      Is_VAT: Is_VAT === 'true'
    }


    // Separate new files (File objects) from existing URLs
    const newFiles = [];
    const existingUrls = {
      license_file: [],
      national_file: [],
      vat_file: [],
      NDA_file: []
    }

    // Process each file type (normalize nda_file -> NDA_file)
    ;['license_file', 'national_file', 'vat_file', 'NDA_file'].forEach((rawType) => {
      const normalizedType = rawType === 'nda_file' ? 'NDA_file' : rawType
      const files = data[rawType] || []
      files.forEach((file) => {
        if (file instanceof File) {
          newFiles.push({ file, type: normalizedType })
        } else if (typeof file === 'string' || file?.Upload_files) {
          const url = typeof file === 'string' ? file : file.Upload_files
          existingUrls[normalizedType].push(url)
        }
      })
    })

    const attachmentTypeMap = {
    license_file: "TRADE LICENSE",
    national_file: "NATIONAL ID",
    vat_file: "VAT",
    NDA_file: "NDA"
  };

    // Upload only new files
    const uploadPromises = newFiles.map(({ file, type }) => {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("vendor_code", vendorDetails.Vendor_SAP_Code || "");
      // fd.append("module", "PROFILE UPDATE");
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

    try {
      const results = await Promise.all(uploadPromises);

      // Combine existing URLs with newly uploaded URLs
      results.forEach(({ success, type, url }) => {
        if (success && url) {
          const normalizedType = type === 'nda_file' ? 'NDA_file' : type;
    existingUrls[normalizedType].push(url);
          // existingUrls[type].push(url);
        }
      });

      // Set the final payload with all URLs (existing + new)
      payload.license_file = existingUrls.license_file
      payload.national_file = existingUrls.national_file
      payload.vat_file = existingUrls.vat_file
      payload.NDA_file = existingUrls.NDA_file

      updateEditedData("legal", payload);
      handleFinalSubmit(payload);
    } catch (err) {
      console.error("File upload or edit profile failed:", err);
      //showToast('Error', 'File upload or profile update failed.', 'error')
      toast.error(t("fileUploadFailed"));
    }
  };
  const handleBackClick = async () => {
    const currentFormValues = getValues();
    updateEditedData("legal", currentFormValues);
    onBackClick();
  };

  const handleNextClick = async () => {
    const currentFormValues = getValues();
    updateEditedData("legal", currentFormValues);
    onNextClick();
  };

  const licenceNoValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(60)
    .build();

  const nationalIdValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(50)
    .build();

  const vatNoValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    .validateMaxLength(20)
    .build();

  return (
    <div>
      <div className={styles.liDetailsContainer}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="my-4 fs-5">{t("legal_identification_details")}</div>
          <div className="d-flex justify-content-right gap-3 mb-2">
            <NormalButton
              style={{ width: "110px", height: "40px" }}
              label={t("myprofile:back")}
              isPrimary
              customClass={styles.actionBtn}
              onClick={handleBackClick}
              leftIcon={backArrow}
              leftIconClassName={"rtl:rotate-180"}
            />
            <NormalButton
              style={{ width: "108px", height: "40px" }}
              label={t("myprofile:next")}
              isPrimary
              customClass={styles.actionBtn}
              onClick={handleNextClick}
              rightIcon={nextIcon}
              rightIconClassName={"rtl:rotate-180"}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ margin: "15px" }}>
            <Fieldset
              legend={t("trade_licence")}
              className={`${styles.fieldset} mb-5 mt-3`}
            >
              <div className={`${styles.row} mb-4`}>
                <InputBox
                  titleLabel={t("licenseNo.text")}
                  className="signInInput inputBox mb-0 uppercase"
                  name="Trade_license_number"
                  type="text"
                  register={register}
                  rules={{
                    required: t("licenseNo.error"),
                    validate: (value) =>
                      licenceNoValidator(t("licenseNo.text"), value),
                  }}
                  error={errors.Trade_license_number}
                  tooltipMessage={t("licenseNo.tooltip")}
                  isRequired
                  tooltipIcon
                  maxLength={60}
                />
                <div className={styles.expiryDate}>
                  <label style={{ fontSize: "1rem", marginBottom: "-1px" }}>
                    {t("expiryDate.text")}
                    <span className="required">*</span>
                    <AppTooltip message={t("expiryDate.tooltip")} />
                  </label>
                  <Controller
                    name="License_Expiry_Date"
                    control={control}
                    rules={{
                      required: t("expiryDate.error"),
                    }}
                    render={({ field }) => (
                      <DateRangePicker
                        value={field?.value}
                        setValue={field.onChange}
                        error={errors?.License_Expiry_Date?.message}
                      />
                    )}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <Controller
                  name="license_file"
                  control={control}
                  defaultValue={[]}
                  rules={{ required: "Trade License files are required" }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <FileUploadInput
                      tooltip
                      required={true}
                      label={t("uploadTradingLicense.text")}
                      error={error}
                      files={value}
                      multiple={true}
                      name="license_file"
                      onChange={(event) => {
                        //const selectedFile = event.target.files?.[0]
                        const selectedFile = Array.from(
                          event.target.files || []
                        );
                        if (!selectedFile) return;

                        //const updatedFiles = Array.from(value || [])
                        const existingFiles = Array.from(value || []);
                        const updatedFiles = [
                          ...existingFiles,
                          ...selectedFile,
                        ];
                        if (updatedFiles.length > 2) {
                          setError("license_file", {
                            type: "manual",
                            message: "Only 2 files are allowed",
                          });
                          return;
                        }

                        //updatedFiles.push(selectedFile)
                        onChange(updatedFiles);
                        clearErrors("license_file");
                      }}
                      tooltipMessage={t("uploadTradingLicense.tooltip")}
                    />
                  )}
                />
                <div className={styles.uploadDocuments}>
                  <label className="d-flex gap-1">
                    {t("myprofile:uploadedDocuments")}
                    <span className="required">*</span>
                    <AppTooltip message={t("myprofile:uploadedDocuments")} />
                  </label>
                  <FileIcons
                    files={licenseFiles}
                    onRemoveFile={(index) => {
                      const updatedFiles = Array.from(licenseFiles || []);
                      updatedFiles.splice(index, 1);
                      setValue("license_file", updatedFiles);
                      clearErrors("license_file");
                    }}
                  />
                </div>
              </div>
            </Fieldset>
            <Fieldset
              legend={t("national_id")}
              className={`${styles.fieldset} my-5`}
            >
              <div className={`${styles.row} mb-4`}>
                <InputBox
                  titleLabel={t("nationalId.text")}
                  className="signInInput inputBox mb-0 uppercase"
                  name="National_Id_No"
                  type="text"
                  register={register}
                  rules={{
                    required: isEntityNameSaudi ? t("nationalId.error") : false,
                    validate: (value) => {
                      if (!value) return true;
                      return nationalIdValidator(t("nationalId.text"), value);
                    },
                  }}
                  error={errors.National_Id_No}
                  tooltipMessage={t("nationalId.tooltip")}
                  isRequired={isEntityNameSaudi}
                  tooltipIcon
                  maxLength={50}
                />
                <div className={styles.expiryDate}>
                  <label style={{ fontSize: "1rem", marginBottom: "-1px" }}>
                    {t("nationalIdExpiryDate.text")}
                    {isEntityNameSaudi && <span className="required">*</span>}
                    <AppTooltip message={t("nationalIdExpiryDate.tooltip")} />
                  </label>
                  <Controller
                    name="National_Id_Expiry_Dt"
                    control={control}
                    rules={{
                      required: isEntityNameSaudi
                        ? t("nationalIdExpiryDate.error")
                        : false,
                    }}
                    render={({ field }) => (
                      <DateRangePicker
                        value={field?.value}
                        setValue={field.onChange}
                        error={errors?.National_Id_Expiry_Dt?.message}
                      />
                    )}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <Controller
                  name="national_file"
                  control={control}
                  defaultValue={undefined}
                  rules={{
                    required: isEntityNameSaudi
                      ? "National Id Files are required"
                      : false,
                    validate: isEntityNameSaudi
                      ? (files) =>
                        files?.length > 0 ? true : t("uploadNationalId.error")
                      : undefined,
                  }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <FileUploadInput
                      tooltip
                      required={isEntityNameSaudi}
                      label={t("uploadNationalId.text")}
                      error={error}
                      files={value}
                      multiple={true}
                      name="national_file"
                      onChange={(event) => {
                        //const selectedFile = event.target.files?.[0]
                        const selectedFile = Array.from(
                          event.target.files || []
                        );
                        if (!selectedFile) return;

                        //const updatedFiles = Array.from(value || [])
                        const existingFiles = Array.from(value || []);
                        const updatedFiles = [
                          ...existingFiles,
                          ...selectedFile,
                        ];
                        if (updatedFiles.length > 2) {
                          setError("national_file", {
                            type: "manual",
                            message: "Only 2 files are allowed",
                          });
                          return;
                        }

                        //updatedFiles.push(selectedFile)
                        onChange(updatedFiles);
                        clearErrors("national_file");
                      }}
                      tooltipMessage={t("uploadNationalId.tooltip")}
                    />
                  )}
                />
                <div className={styles.uploadDocuments}>
                  <label className="d-flex gap-1">
                    {t("myprofile:uploadedDocuments")}
                    {/* <span className="required">*</span> */}
                    <AppTooltip message={t("myprofile:uploadedDocuments")} />
                  </label>
                  <FileIcons
                    files={nationalFiles}
                    onRemoveFile={(index) => {
                      const updatedFiles = Array.from(nationalFiles || []);
                      updatedFiles.splice(index, 1);
                      setValue("national_file", updatedFiles);
                      clearErrors("national_file");
                    }}
                  />
                </div>
              </div>
            </Fieldset>
            <Fieldset legend={t("vat")} className={`${styles.fieldset} my-5`}>
              {/* <label className="mb-3">
                {t('vatGroup.text')} : {vendorDetails?.Is_VAT ? 'Yes' : 'No'}
              </label> */}
              <div className="">
                <label
                  style={{ lineHeight: "16px" }}
                  className="headLabelForm d-flex"
                >
                  {t("vatGroup.text")}
                  <span className="required ms-1">*</span>
                  <span className="ms-1">
                    <AppTooltip message={t("vatGroup.tooltip")} />
                  </span>
                </label>
              </div>
              <div>
                <div className="radio-container relative h-[45px] mb-2">
                  <div className="d-flex items-center mt-[8px] mb-[30px]">
                    <span className="radio-option text-[0.875rem] d-flex me-2 gap-1 items-center whitespace-pre">
                      <input
                        type="radio"
                        name="Is_VAT"
                        value="true"
                        {...register("Is_VAT", {
                          required: "Vat Group is required.",
                          onChange: (e) => {
                            const selectedValue = e.target.value;
                          },
                        })}
                        onChange={(e) => {
                          register("Is_VAT").onChange(e);
                        }}
                      />
                      {t("register:yes")}
                    </span>
                    <span className="radio-option text-[0.875rem] items-center d-flex gap-1 me-2 ms-2 whitespace-pre">
                      <input
                        type="radio"
                        name="Is_VAT"
                        value="false"
                        {...register("Is_VAT", {
                          required: "Vat Group is required.",
                          onChange: (e) => {
                            const selectedValue = e.target.value;
                            if (selectedValue === "no") {
                              setValue("VAT_Group_Name", null); // clear vat_group_name
                            }
                          },
                        })}
                        onChange={(e) => {
                          register("Is_VAT").onChange(e);
                          setValue("VAT_Group_Name", null); // clear field value when selecting "no"
                        }}
                      />
                      {t("register:no")}
                    </span>
                    {errors["Is_VAT"] && (
                      <p className="error-text bottom-0">
                        {errors["Is_VAT"]?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`${styles.row} mb-4`}>
                <InputBox
                  titleLabel={t("groupEntityName.text")}
                  className="signInInput inputBox mb-0"
                  name="VAT_Group_Name"
                  type="text"
                  register={register}
                  rules={{
                    required:
                      isVat === "true" ? t("groupEntityName.error") : false,
                    validate: (value) => {
                      if (isVat !== "yes") return true;
                      return nationalIdValidator(t("vatNo.text"), value);
                    },
                  }}
                  maxLength={50}
                  error={errors.VAT_Group_Name}
                  isRequired
                  tooltipIcon
                  tooltipMessage={t("groupEntityName.tooltip")}
                  disabled={isVat === "no"}
                />
                <InputBox
                  titleLabel={t("vatNo.text")}
                  className="signInInput inputBox mb-0 uppercase"
                  name="VAT_Number"
                  type="text"
                  register={register}
                  rules={{
                    required: t("vatNo.error"),
                    validate: (value) => vatNoValidator(t("vatNo.text"), value),
                  }}
                  error={errors.VAT_Number}
                  isRequired
                  tooltipIcon
                  tooltipMessage={t("vatNo.tooltip")}
                  maxLength={20}
                />
              </div>
              <div className={styles.row}>
                <Controller
                  name="vat_file"
                  control={control}
                  defaultValue={undefined}
                  rules={{ required: "VAT Files are required" }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <FileUploadInput
                      tooltip
                      required={true}
                      label={t("uploadVAT.text")}
                      error={error}
                      files={value}
                      multiple={true}
                      name="vat_file"
                      onChange={(event) => {
                        //const selectedFile = event.target.files?.[0]
                        const selectedFile = Array.from(
                          event.target.files || []
                        );
                        if (!selectedFile) return;

                        //const updatedFiles = Array.from(value || [])
                        const existingFiles = Array.from(value || []);
                        const updatedFiles = [
                          ...existingFiles,
                          ...selectedFile,
                        ];
                        if (updatedFiles.length > 2) {
                          setError("vat_file", {
                            type: "manual",
                            message: "Only 2 files are allowed",
                          });
                          return;
                        }

                        //updatedFiles.push(selectedFile)
                        onChange(updatedFiles);
                        clearErrors("vat_file");
                      }}
                      tooltipMessage={t("uploadVAT.tooltip")}
                    />
                  )}
                />
                <div className={styles.uploadDocuments}>
                  <label className="d-flex gap-1">
                    {t("myprofile:uploadedDocuments")}
                    <span className="required">*</span>
                    <AppTooltip message={t("myprofile:uploadedDocuments")} />
                  </label>
                  <FileIcons
                    files={vatFiles}
                    onRemoveFile={(index) => {
                      const updatedFiles = Array.from(vatFiles || [])
                      updatedFiles.splice(index, 1)
                      setValue('vat_file', updatedFiles)
                      clearErrors('vat_file')
                    }}
                  //disabled={isViewMode}
                  />
                </div>
              </div>
            </Fieldset>
            <Fieldset legend={'NDA'} className="fieldset">
              <div className={styles.row}>
                <div>
                  <Controller
                    name="NDA_file"
                    control={control}
                    defaultValue={undefined}
                    rules={{
                      required: 'NDA Files are required'

                      //required: nationalFieldsMandatory ? t('uploadNda.error') : false,
                      // validate: nationalFieldsMandatory
                      //   ? (files) => (files?.length > 0 ? true : t('uploadNda.error'))
                      //   : undefined
                    }}
                    render={({ field: { onChange, value }, fieldState: { error } }) => (
                      <FileUploadInput
                        tooltip
                        required={true}
                        label={t('uploadNda.text')}
                        error={error}
                        files={value}
                        multiple={true}
                        name="NDA_file"
                        onChange={(event) => {
                          //const selectedFile = event.target.files?.[0]
                          const selectedFile = Array.from(event.target.files || [])
                          if (!selectedFile) return

                          //const updatedFiles = Array.from(value || [])
                          const existingFiles = Array.from(value || [])
                          const updatedFiles = [...existingFiles, ...selectedFile]
                          if (updatedFiles.length > 2) {
                            toast.error('Only 2 files are allowed')
                            event.target.value = null
                            return
                          }

                          //updatedFiles.push(selectedFile)
                          onChange(updatedFiles)
                          clearErrors('NDA_file')
                          // event.target.value = null
                        }}
                        //disabled={isViewMode}
                        tooltipMessage={t('uploadNda.tooltip')}
                      />
                    )}
                  />
                </div>
                <div className="flex items-center ">
                  <FileIcons
                    files={ndaFiles}
                    className="mt-4"
                    onRemoveFile={(index) => {
                      const updatedFiles = Array.from(ndaFiles || [])
                      updatedFiles.splice(index, 1)
                      setValue('NDA_file', updatedFiles)
                      clearErrors('NDA_file')
                    }}
                  //disabled={isViewMode}
                  />
                </div>
              </div>
            </Fieldset>
          </div>
          <div className="d-flex justify-content-end">
            <Suspense fallback={<div>Loading...</div>}>
              <NormalButton
                label={t("otp:cancel")}
                outlineBtn
                customClass={`${styles.submitBtn} me-3`}
                type="button"
                onClick={() => startTransition(() => setIsEditable(false))}
              />
            </Suspense>
            <NormalButton
              label={
                isVendorsProfilePage ? "Update" : t("myprofile:submitForReview")
              }
              isPrimary
              customClass={styles.submitBtn}
              type="submit"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  myProfile: state.myProfile.profileData,
});

const mapDispatchToProps = { showToast };

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditLegalIdentificationDetailsComp);
