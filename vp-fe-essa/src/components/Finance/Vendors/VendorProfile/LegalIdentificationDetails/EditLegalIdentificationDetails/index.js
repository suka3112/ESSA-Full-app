import Fieldset from "components/Common/FieldSet";
import { InputBox } from "components/Common/InputBox";
import React from "react";
import { useForm } from "react-hook-form";
import uploadedImg from "../../../../../../assets/icons/uploadedImgIcon.svg";
import styles from "./EditLegalIndentificationDetails.module.scss";
import { NormalButton } from "components/Common/NormalButton";
import backArrow from "../../../../../../assets/icons/backIconWhite.svg";
import nextIcon from "../../../../../../assets/icons/nextIconWhite.svg";
import tooltip from "../../../../../../assets/icons/tooltip.svg";
import FileUploadInput from "components/Common/FileUploadInput";
import DateRangePicker from "components/Common/DateRangePicker";
import { useTranslation } from "react-i18next";

const EditLegalIdentificationDetailsComp = ({
  isEditable,
  onNextClick,
  onBackClick,
}) => {
  const {
    register,
    formState: { errors },
  } = useForm();
  const { t } = useTranslation("otp");
  return (
    <div>
      <div className={styles.liDetailsContainer}>
        <div className="d-flex justify-content-between mb-2">
          <NormalButton
            label="back"
            isPrimary
            customClass={styles.actionBtn}
            onClick={onBackClick}
            leftIcon={backArrow}
          />
          <NormalButton
            label="Next"
            isPrimary
            customClass={styles.actionBtn}
            onClick={onNextClick}
            rightIcon={nextIcon}
          />
        </div>
        <label className="my-3">Legal Identification Details</label>
        <div>
          <Fieldset
            legend="Trade Licence"
            className={`${styles.fieldset} mb-5 mt-3`}
          >
            <div className={styles.row}>
              <InputBox
                titleLabel="License No."
                className="signInInput inputBox mb-4"
                name="licenseNo"
                type="text"
                register={register}
                rules={{
                  required: "License No. is required",
                }}
                error={errors.licenseNo}
                disabled={!isEditable}
              />
              <div className={styles.expiryDate}>
                <label>Expiry Date</label>
                <DateRangePicker />
              </div>
            </div>
            <div className={styles.row}>
              <FileUploadInput label="Upload" required />
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1">
                  Uploaded Documents
                  <span className="required">*</span>
                  <img src={tooltip} alt="tooltip" />
                </label>
                <div className="d-flex gap-1 mt-2">
                  <img src={uploadedImg} alt="Uploaded file" />
                  <img src={uploadedImg} alt="Uploaded file" />
                </div>
              </div>
            </div>
          </Fieldset>
          <Fieldset legend="National ID" className={`${styles.fieldset} my-5`}>
            <div className={styles.row}>
              <InputBox
                titleLabel="National ID No."
                className="signInInput inputBox mb-4"
                name="nationalId"
                type="text"
                register={register}
                rules={{
                  required: "National ID No. is required",
                }}
                error={errors.nationalId}
                disabled={!isEditable}
              />
              <div className={styles.expiryDate}>
                <label>Expiry Date</label>
                <DateRangePicker />
              </div>
            </div>
            <div className={styles.row}>
              <FileUploadInput label="Upload" required />
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1">
                  Uploaded Documents
                  <span className="required">*</span>
                  <img src={tooltip} alt="tooltip" />
                </label>
                <div className="d-flex gap-1 mt-2">
                  <img src={uploadedImg} alt="Uploaded file" />
                  <img src={uploadedImg} alt="Uploaded file" />
                </div>
              </div>
            </div>
          </Fieldset>
          <Fieldset legend="VAT" className={`${styles.fieldset} my-5`}>
            <label className="mb-3">VAT Group: Yes</label>
            <div className={styles.row}>
              <InputBox
                titleLabel="Group Entity Name"
                className="signInInput inputBox mb-4"
                name="groupEntityName"
                type="text"
                register={register}
                rules={{
                  required: "Group Entity Name is required",
                }}
                error={errors.groupEntityName}
                disabled={!isEditable}
              />
              <InputBox
                titleLabel="VAT No."
                className="signInInput inputBox mb-4"
                name="vatNo"
                type="text"
                register={register}
                rules={{
                  required: "VAT No. is required",
                }}
                error={errors.vatNo}
                disabled={!isEditable}
              />
            </div>
            <div className={styles.row}>
              <FileUploadInput label="Upload" required />
              <div className={styles.uploadDocuments}>
                <label className="d-flex gap-1">
                  Uploaded Documents
                  <span className="required">*</span>
                  <img src={tooltip} alt="tooltip" />
                </label>
                <div className="d-flex gap-1 mt-2">
                  <img src={uploadedImg} alt="Uploaded file" />
                  <img src={uploadedImg} alt="Uploaded file" />
                </div>
              </div>
            </div>
          </Fieldset>
        </div>
        <div
          className={isEditable ? "d-flex justify-content-between" : "d-none"}
        >
          <NormalButton
            label={t("cancel")}
            outlineBtn
            customClass={styles.submitBtn}
          />
          <NormalButton
            label="Submit For Review"
            isPrimary
            customClass={styles.submitBtn}
          />
        </div>
      </div>
    </div>
  );
};

export default EditLegalIdentificationDetailsComp;
