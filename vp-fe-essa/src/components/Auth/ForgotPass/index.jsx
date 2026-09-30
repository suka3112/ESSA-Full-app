import React, { useState } from "react";
import "../Login/style.scss";
import "./style.scss";
import { InputBox } from "../../Common/InputBox";
import { NormalButton } from "../../Common/NormalButton";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import successGif from '../../../assets/gif/tickGreen.gif'
import {
  AUTH_SETUP,
  VENDOR_PORTAL,
  VENDOR_USER_TYPE,
} from "constants/userType";
import { LOGIN } from "constants/url";
import { connect } from "react-redux";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "api/Login";
import { showToast } from "../../../redux/actions/toastActions";
import { toast } from "react-toastify";

const ForgotPasswordComp = ({ showToast }) => {
  const [isSubmitted, setIsSubmitted] = useState(false); // Added state for toggling
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const onSubmit = (data) => {
    forgotPassword(data)
      .then((res) => {
        setIsSubmitted(true);
        // showToast(
        //   'Password Reset Successfully.',
        //   'You have successfully reset your password.',
        //   'success'
        // )
      })
      .catch((err) => {
        console.error(err?.response?.data?.message, "errorrr");
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message);
      });
  };

  const handleRedirect = () => {
    navigate(`/${AUTH_SETUP}${LOGIN}`);
  };

  const { t } = useTranslation("login");

  return (
    <div className="login-container forgot-password-container">
      {isSubmitted ? (
        <div className="success-message-wrapper">
          <div className="successGif">
            <img src={successGif} alt="success" height="71px" width="70px" />
          </div>
          <p className="otp-title mb-2 text-center fpc-text">
            {t("passwordResetEmailSent")}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="login-title">{t("forget_pwd")}</label>

          {/* Email Field */}
          <div>
            <InputBox
              titleLabel={t("email.text")}
              className="login-input inputBox mb-0"
              name="email"
              type="email"
              register={register}
              placeholder={t("email.text")}
              rules={{
                required: t("email.error"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("email.validation"),
                },
              }}
              error={errors.email}
              isRequired
              tooltipIcon
              tooltipMessage={t("email.tooltip")}
            />
            {/* {errors.email && (
              <div className="errToDisplay">
                <span className="error_msg_text">{errors.email.message}</span>
              </div>
            )} */}
          </div>

          <NormalButton
            label={t("submit")}
            customClass="login-button mt-3"
            isPrimary
            type="submit"
          />
          <hr className="divider" />
        </form>
      )}
      {!isSubmitted && (
        <NormalButton
          label={t("signin")}
          customClass="login-button"
          outlineBtn
          onClick={handleRedirect}
          style={{ fontSize: "15px" }}
        />
      )}
    </div>
  );
};

const mapDispatchToProps = { showToast };

export default connect(null, mapDispatchToProps)(ForgotPasswordComp);
