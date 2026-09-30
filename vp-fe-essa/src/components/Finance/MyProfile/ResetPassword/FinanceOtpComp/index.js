
import React, { useState } from "react";
import "./style.scss";
import { useForm } from "react-hook-form";
import { InputBox } from "components/Common/InputBox";
import { NormalButton } from "components/Common";
import { showToast, hideToast } from "../../../../../redux/actions/toastActions";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FinanceOtpComp = ({ title, customClass, showToast, hideToast }) => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [verified, setVerified] = useState(false);
  const { t, i18n } = useTranslation(['otp', 'popup'])


  const onSubmit = (data) => {
    navigate(-1);
    setVerified(true);
    showToast(
      t('popup:passwordResetSuccess'),
      t('popup:passwordResetConfirmation'),
      "success"
    );

    setTimeout(() => {
      hideToast();
    }, 3000);
  };

  return (
    <form className={`${customClass} ottp-container`} onSubmit={handleSubmit(onSubmit)}>
      <div>
        <div className="mb-3">
          <p className="otp-title mb-2">{title}</p>
          <p className="otp-sub-text">
            {t('otp_content')}
          </p>
        </div>
        <div className="otp-input-container">
          <InputBox className="otp-input inputBox mb-4" name="otp-input-1" register={register} type="number" />
          <InputBox className="otp-input inputBox mb-4" name="otp-input-2" register={register} type="number" />
          <InputBox className="otp-input inputBox mb-4" name="otp-input-3" register={register} type="number" />
          <InputBox className="otp-input inputBox mb-4" name="otp-input-4" register={register} type="number" />
        </div>
      </div>

      <div>
        <NormalButton
          label={t('Verify')}
          normal
          customClass="otp-submit-btn mt-3"
          isPrimary
          type="submit"
        />
      </div>
    </form>
  );
};

const mapDispatchToProps = {
  showToast,
  hideToast,
};

export default connect(null, mapDispatchToProps)(FinanceOtpComp);
