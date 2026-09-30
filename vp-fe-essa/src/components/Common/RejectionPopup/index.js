import React from "react";
import CustomModal from "../Modal";
import { NormalButton } from "..";
import { InputBox } from "../InputBox";
import "./style.scss";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const RejectionPopup = ({ open, onClose, onConfirm, isLoading = false }) => {
  const { t } = useTranslation(["advance_payment", "otp"]);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm();
  const modalStyles = {
    width: "500px",
    borderRadius: "8px",
    minHeight: "300px",
  };
  return (
    <CustomModal
      header={t("RejectionPurpose")}
      open={open}
      onClose={onClose}
      modalStyles={modalStyles}
      closeIcon
    >
      <hr />
      <form onSubmit={handleSubmit(onConfirm)}>
        <div className="inputArea">
          <label>
            {t("ReasonOfRejection")}
            <span className="required">*</span>
          </label>
          <InputBox
            className="signInInputUser inputBox mb-0"
            name="reasonOfRejection"
            type="textarea"
            rules={{
              required: t("ReasonOfRejectionRrequired"),
            }}
            register={register}
            error={errors.reasonOfRejection}
            isRequired
            tooltipIcon
            placeholder={t("Reason")}
          />
        </div>
        <div className="d-flex justify-content-between gap-3 mt-5">
          <NormalButton
            label={t("otp:cancel")}
            outlineBtn
            customClass="actionBtns"
            customBtnClass="customBtn"
            onClick={onClose}
          />
          <NormalButton
            label={t("otp:confirm")}
            isPrimaryModal
            customClass="actionBtns"
            customBtnClass="customBtn"
            type="submit"
            isPrimary={true}
            isLoading={isLoading}
            disabled={isLoading}
          />
        </div>
      </form>
    </CustomModal>
  );
};

export default RejectionPopup;
