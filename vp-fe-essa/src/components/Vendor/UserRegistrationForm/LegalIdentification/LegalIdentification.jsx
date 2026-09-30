import React, { useEffect, useState } from "react";
import Fieldset from "../../../Common/FieldSet";
import { InputBox } from "../../../Common/InputBox";
import "./LegalIdentification.scss";
import FileUploadInput from "components/Common/FileUploadInput";
import { useTranslation } from "react-i18next";
import DateRangePicker from "components/Common/DateRangePicker1";
import { Controller } from "react-hook-form";
import FileIcons from "../../../Common/FileIcons";
import { Tooltip } from "components/Common";
import { Validator } from "../../../../services/validation/formValidations";

import AppTooltip from "../../../Common/AppTooltip";
import dayjs from "dayjs";
import { connect } from "react-redux";
import { ADMIN_USER_TYPE } from "constants/userType";
import { toast } from "react-toastify";

function LegalIdentificationComp(props) {
  const {
    register,
    errors,
    control,
    watch,
    nationalFieldsMandatory,
    setError,
    clearErrors,
    onboardVendorData,
    setValue,
    mode,
    getValues,
    trigger,
    userInfo: { userType }
  } = props

  const licenseFiles = watch('license_file')
  const country = watch('country')
  const nationalFiles = watch('national_file')
  const ndaFiles = watch('nda_file')
  const vatFiles = watch('vat_file')
  const isVat = watch('is_vat', 'no')

  const isViewMode = mode === "view";

  const { t, i18n } = useTranslation(["legal_identification_comp", "register"]);

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

  useEffect(() => {
    if (onboardVendorData) {
      setValue("license_number", onboardVendorData.Trade_license_number || "");
      setValue("national_id_number", onboardVendorData.National_Id_No || "");
      setValue("groupEntityName", onboardVendorData?.VAT_Group_Name || "");
      setValue("vat_number", onboardVendorData?.VAT_Number || "");
      setValue(
        "license_expiry_date",
        dayjs(onboardVendorData?.License_Expiry_Date) || null
      );
      setValue(
        "national_id_expiry_date",
        dayjs(onboardVendorData?.National_Id_Expiry_Dt) || null
      );

      if (onboardVendorData?.licence_image?.length) {
        const licenseFiles = onboardVendorData.licence_image.map((file) => ({
          preview: file.Upload_files,
          ...file,
        }));
        setValue("license_file", licenseFiles);
      }

      if (onboardVendorData?.national_id_image?.length) {
        const nationalFiles = onboardVendorData.national_id_image.map(
          (file) => ({
            preview: file.Upload_files,
            ...file,
          })
        );
        setValue("national_file", nationalFiles);
      }

      if (onboardVendorData?.vat_image?.length) {
        const vatFiles = onboardVendorData.vat_image.map((file) => ({
          preview: file.Upload_files,
          ...file,
        }));
        setValue("vat_file", vatFiles);
      }

      if (onboardVendorData?.nda_image?.length) {
        const ndaFiles = onboardVendorData.nda_image.map((file) => ({
          preview: file.Upload_files,
          ...file
        }))
        setValue('vat_file', vatFiles)
      }

      if (onboardVendorData?.nda_image?.length) {
        const ndaFiles = onboardVendorData.nda_image.map((file) => ({
          preview: file.Upload_files,
          ...file
        }))
        setValue('nda_file', ndaFiles)
      }
    }
  }, [onboardVendorData]);

  return (
    <div
      className={`form-container ${userType === ADMIN_USER_TYPE ? "admin-form-container" : ""
        }`}
    >
      <div className="form-title">
        <div>{t("legal_identification_details")}</div>
      </div>
      <hr className="mb-5 border-t-2 border-[#E5E5E5] mt-2" />
      <form className="fieldset-container">
        <Fieldset legend={t("trade_licence")} className="fieldset">
          <div className="rowContainer mb-4">
            <Controller
              name="license_number"
              control={props.control}
              rules={{
                required: t("licenseNo.error"),
                validate: (value) =>
                  licenceNoValidator(t("licenseNo.text"), value),
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <InputBox
                  titleLabel={t("licenseNo.text")}
                  className="signIn-input inputBox mb-0 uppercase"
                  name="license_number"
                  type="text"
                  register={register}
                  error={errors.license_number}
                  tooltipIcon
                  isRequired
                  tooltipMessage={t("licenseNo.tooltip")}
                  disabled={isViewMode}
                  value={value || ""}
                  maxLength={60}
                />
              )}
            />
            <div>
              <div className="d-flex">
                <div className="mb-2" style={{ height: "24px" }}>
                  <label className="selectLabel">
                    {t("expiryDate.text")} <span className="required">*</span>
                  </label>
                </div>

                <AppTooltip
                  className="mb-2"
                  message={t("expiryDate.tooltip")}
                />
              </div>
              <Controller
                name="license_expiry_date"
                control={control}
                rules={{
                  required: t("expiryDate.error"),
                }}
                render={({ field }) => (
                  <div>
                    <DateRangePicker
                      error={errors?.license_expiry_date?.message}
                      value={field.value}
                      setValue={field.onChange}
                      disabled={isViewMode}
                      disablePast={true}
                    />
                  </div>
                )}
              />

              {/*<DateRangePicker />*/}
            </div>
          </div>
          <div className="rowContainer">
            <div>
              <Controller
                name="license_file"
                control={control}
                defaultValue={undefined}
                rules={{ required: t("uploadTradingLicense.error") }}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <FileUploadInput
                    className={error ? "mt-3" : ""}
                    tooltip
                    required={true}
                    label={t("uploadTradingLicense.text")}
                    error={error}
                    files={value}
                    multiple={true}
                    name="license_file"
                    onChange={(event) => {
                      //const selectedFile = event.target.files?.[0]
                      const selectedFile = Array.from(event.target.files || []);
                      if (!selectedFile) return;

                      //const updatedFiles = Array.from(value || [])
                      const existingFiles = Array.from(value || []);
                      const updatedFiles = [...existingFiles, ...selectedFile];

                      if (updatedFiles.length > 2) {
                        // setError('license_file', {
                        //   type: 'manual',
                        //   message: 'Only 2 files are allowed'
                        // })
                        toast.error("Only 2 files are allowed");
                        event.target.value = null;
                        return;
                      }

                      //updatedFiles.push(selectedFile)
                      onChange(updatedFiles);
                      clearErrors("license_file");
                      event.target.value = null;
                    }}
                    tooltipMessage={t("uploadTradingLicense.tooltip")}
                    disabled={isViewMode}
                  />
                )}
              />
            </div>
            <div className="flex items-center">
              <FileIcons
                files={licenseFiles || []}
                className="mt-4"
                onRemoveFile={(index) => {
                  const updatedFiles = Array.from(licenseFiles || []);
                  updatedFiles.splice(index, 1);
                  setValue("license_file", updatedFiles);
                  clearErrors("license_file");
                }}
                disabled={isViewMode}
              />
            </div>
          </div>
        </Fieldset>
        <Fieldset legend={t("national_id")} className="fieldset">
          <div className="rowContainer mb-4">
            <Controller
              name="national_id_number"
              control={props.control}
              rules={{
                required: nationalFieldsMandatory
                  ? t("nationalId.error")
                  : false,
                validate: (value) => {
                  if (!value) return true;
                  return nationalIdValidator(t("nationalId.text"), value);
                },
              }}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <InputBox
                  titleLabel={t("nationalId.text")}
                  //titleLabel="National ID No."
                  className="signIn-input inputBox mb-0 uppercase"
                  name="national_id_number"
                  type="text"
                  register={register}
                  error={errors.national_id_number}
                  tooltipIcon
                  isRequired={nationalFieldsMandatory}
                  tooltipMessage={t("nationalId.tooltip")}
                  disabled={isViewMode}
                  value={value || ""}
                  maxLength={50}
                />
              )}
            />
            <div>
              <div className="d-flex">
                <div className="mb-2" style={{ height: "24px" }}>
                  <label className="selectLabel">
                    {t("nationalIdExpiryDate.text")}{" "}
                    {nationalFieldsMandatory && (
                      <span className="required">*</span>
                    )}
                  </label>
                </div>
                <AppTooltip
                  className="mb-2"
                  message={t("nationalIdExpiryDate.tooltip")}
                />
              </div>
              <div className="">
                <Controller
                  name="national_id_expiry_date"
                  control={control}
                  rules={{
                    required: nationalFieldsMandatory
                      ? t("nationalIdExpiryDate.error")
                      : false,
                  }}
                  render={({ field }) => (
                    <DateRangePicker
                      error={errors?.national_id_expiry_date?.message}
                      value={field.value}
                      setValue={field.onChange}
                      disabled={isViewMode}
                      disablePast={true}
                    />
                  )}
                />
              </div>
            </div>
          </div>
          <div className="rowContainer">
            <div>
              <Controller
                name="national_file"
                control={control}
                defaultValue={undefined}
                rules={{
                  required: nationalFieldsMandatory
                    ? t("uploadNationalId.error")
                    : false,
                  validate: nationalFieldsMandatory
                    ? (files) =>
                      files?.length > 0 ? true : t("uploadNationalId.error")
                    : undefined,
                }}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <FileUploadInput
                    className={error ? "mt-3" : ""}
                    tooltip
                    required={nationalFieldsMandatory ? true : false}
                    label={t("uploadNationalId.text")}
                    error={error}
                    files={value}
                    multiple={true}
                    name="national_file"
                    onChange={(event) => {
                      //const selectedFile = event.target.files?.[0]
                      const selectedFile = Array.from(event.target.files || []);
                      if (!selectedFile) return;

                      //const updatedFiles = Array.from(value || [])
                      const existingFiles = Array.from(value || []);
                      const updatedFiles = [...existingFiles, ...selectedFile];
                      if (updatedFiles.length > 2) {
                        toast.error("Only 2 files are allowed");
                        event.target.value = null;
                        return;
                      }

                      //updatedFiles.push(selectedFile)
                      onChange(updatedFiles);
                      clearErrors("national_file");
                      event.target.value = null;
                    }}
                    disabled={isViewMode}
                    tooltipMessage={t("uploadNationalId.tooltip")}
                  />
                )}
              />
            </div>
            <div className="flex items-center ">
              <FileIcons
                files={nationalFiles}
                className="mt-4"
                onRemoveFile={(index) => {
                  const updatedFiles = Array.from(nationalFiles || []);
                  updatedFiles.splice(index, 1);
                  setValue("national_file", updatedFiles);
                  clearErrors("national_file");
                }}
                disabled={isViewMode}
              />
            </div>
          </div>
        </Fieldset>
        {
          country !== "QA" &&

          <Fieldset legend={t("vat")} className="fieldset">
            <div className="">
              <label
                style={{ lineHeight: "16px" }}
                className="headLabelForm d-flex font-[500]"
              >
                {t("vatGroup.text")}
                <span className="required ms-1">*</span>
                <span className="ms-1">
                  <Tooltip tooltipMessage={t("vatGroup.tooltip")} />
                </span>
              </label>
            </div>
            <div>
              <div className="radio-container relative h-[45px] mb-2">
                <div className="d-flex items-center mt-[8px] mb-[30px]">
                  <span className="radio-option text-[0.875rem] d-flex me-2 gap-1 items-center whitespace-pre">
                    <input
                      type="radio"
                      name="is_vat"
                      value="yes"
                      {...register("is_vat", {
                        required: "Vat Group is required.",
                        onChange: (e) => {
                          const selectedValue = e.target.value;
                        },
                      })}
                      onChange={(e) => {
                        register("is_vat").onChange(e);
                      }}
                      disabled={isViewMode}
                    />
                    {t("register:yes")}
                  </span>
                  <span className="radio-option text-[0.875rem] items-center d-flex gap-1 me-2 ms-2 whitespace-pre">
                    <input
                      type="radio"
                      name="is_vat"
                      value="no"
                      {...register("is_vat", {
                        required: "Vat Group is required.",
                        onChange: (e) => {
                          const selectedValue = e.target.value;
                          if (selectedValue === "no") {
                            clearErrors("vat_group_name");
                            setValue("vat_group_name", "");
                            trigger();
                          }
                        },
                      })}
                      onChange={(e) => {
                        register("is_vat").onChange(e);
                      }}
                      defaultChecked
                      disabled={isViewMode}
                    />
                    {t("register:no")}
                  </span>
                  {errors["is_vat"] && (
                    <p className="error-text bottom-0">
                      {errors["is_vat"]?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="rowContainer mb-4">
              <Controller
                name="vat_number"
                control={props.control}
                rules={{
                  required: t("vatNo.error"),
                  validate: (value) => vatNoValidator(t("vatNo.text"), value),
                }}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <InputBox
                    titleLabel={t("vatNo.text")}
                    className="signIn-input inputBox mb-0 uppercase"
                    name="vat_number"
                    type="text"
                    register={register}
                    error={errors.vat_number}
                    tooltipIcon
                    isRequired
                    tooltipMessage={t("vatNo.tooltip")}
                    disabled={isViewMode}
                    value={value || ""}
                    maxLength={20}
                  />
                )}
              />
              <Controller
                name="vat_group_name"
                control={props.control}
                rules={{
                  required: isVat === "yes" ? t("groupEntityName.error") : false,
                  validate:
                    isVat === "yes"
                      ? (value) => nationalIdValidator(t("vatNo.text"), value)
                      : undefined,
                }}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <InputBox
                    titleLabel={t("groupEntityName.text")}
                    className="signIn-input inputBox mb-0"
                    name="vat_group_name"
                    type="text"
                    register={register}
                    // rules={{
                    //   required: isVat === 'yes' ? t('groupEntityName.error') : false,
                    //   validate:
                    //     isVat === 'yes'
                    //       ? (value) => nationalIdValidator(t('vatNo.text'), value)
                    //       : undefined
                    // }}
                    error={errors.vat_group_name}
                    tooltipIcon
                    tooltipMessage={t("groupEntityName.tooltip")}
                    isRequired={isVat === "yes"}
                    disabled={isVat !== "yes" || isViewMode}
                    maxLength={50}
                  />
                )}
              />
            </div>
            <div className="rowContainer">
              <div>
                <Controller
                  name="vat_file"
                  control={control}
                  defaultValue={undefined}
                  rules={{ required: t("uploadVAT.error") }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <FileUploadInput
                      className={error ? "mt-3" : ""}
                      tooltip
                      required={true}
                      label={t("uploadVAT.text")}
                      error={error}
                      files={value}
                      multiple={true}
                      name="vat_file"
                      onChange={(event) => {
                        //const selectedFile = event.target.files?.[0]
                        const selectedFile = Array.from(event.target.files || []);
                        if (!selectedFile) return;

                        //const updatedFiles = Array.from(value || [])
                        const existingFiles = Array.from(value || []);
                        const updatedFiles = [...existingFiles, ...selectedFile];

                        if (updatedFiles.length > 2) {
                          toast.error("Only 2 files are allowed");
                          event.target.value = null;
                          return;
                        }

                        //updatedFiles.push(selectedFile)
                        onChange(updatedFiles);
                        clearErrors("vat_file");
                        event.target.value = null;
                      }}
                      tooltipMessage={t("uploadVAT.tooltip")}
                      disabled={isViewMode}
                    />
                  )}
                />
              </div>
              <div className="flex items-center">
                <FileIcons
                  files={vatFiles}
                  className="mt-4"
                  onRemoveFile={(index) => {
                    const updatedFiles = Array.from(vatFiles || []);
                    updatedFiles.splice(index, 1);
                    setValue("vat_file", updatedFiles);
                    clearErrors("vat_file");
                  }}
                  disabled={isViewMode}
                />
              </div>
            </div>
          </Fieldset>}

        <Fieldset legend={"NDA"} className="fieldset">

          <div className="rowContainer">
            <div>
              <Controller
                name="nda_file"
                control={control}
                defaultValue={undefined}
                rules={{
                  required: t('uploadNda.error'),
                  validate: (files) => {
                    if (!files || files.length === 0) {
                      return t('uploadNda.error')
                    }
                    return true
                  }
                }}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <FileUploadInput
                    className={error ? 'mt-3' : ''}
                    tooltip
                    required={true}
                    label={t('uploadNda.text')}
                    error={error}
                    files={value}
                    multiple={true}
                    name="nda_file"
                    onChange={(event) => {
                      //const selectedFile = event.target.files?.[0]
                      const selectedFile = Array.from(event.target.files || [])
                      if (!selectedFile) return

                      //const updatedFiles = Array.from(value || [])
                      const existingFiles = Array.from(value || [])
                      const updatedFiles = [...existingFiles, ...selectedFile]
                      if (updatedFiles.length > 2) {
                        toast.error('Only 2 files are allowed')
                        event.target.value = null;
                        return
                      }

                      //updatedFiles.push(selectedFile)
                      onChange(updatedFiles)
                      clearErrors('nda_file')
                      event.target.value = null;
                    }}
                    disabled={isViewMode}
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
                  setValue('nda_file', updatedFiles)
                  clearErrors('nda_file')
                }}
                disabled={isViewMode}
              />
            </div>
          </div>
        </Fieldset>
      </form>
    </div>
  );
}
const mapStateToProps = (state) => {
  return {
    userInfo: state.userInfo,
  };
};

export default connect(mapStateToProps, null)(LegalIdentificationComp);
