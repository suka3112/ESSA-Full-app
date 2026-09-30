import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { InputBox } from "../../Common/InputBox";
import { NormalButton } from "../../Common/NormalButton";
import { HeaderBar } from "components/Common/HeaderBar";
import styles from "./ResetPassword.module.scss";
import successGif from '../../../assets/gif/tickGreen.gif'
import errorSign from "../../../assets/images/errorSign.svg";
import {
  AUTH_SETUP,
} from "constants/userType";
import { LOGIN, FORGOT_PASSWORD, FAQS } from "constants/url";
import { LeftPageContainer } from "pages/vendor/dashboard/dashboard.styles";
import { useTranslation } from "react-i18next";
import TOtpComponent from "components/Auth/TOtpComponent";
import {
  forgotPassword,
  forgotpasswordValidation,
  resetPasswordDashboard,
} from "api/Login";
import { useLocation } from "react-router-dom";
import { connect } from "react-redux";
import { showToast } from "../../../redux/actions/toastActions";
import { Validator } from "../../../services/validation/formValidations";
import CustomModal from "components/Common/Modal";
import { toast } from "react-toastify";
import SVGIcon from "components/Common/SVGIcon";

const ResetPasswordComp = ({
  formTitle = "reset_pwd",
  showToast,
  isProfileReset = false,
  userInfo: { userType, email: storedEmail },
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email") || storedEmail;
  const resetPasswordToken = searchParams.get("token");

  const [status, setStatus] = useState("");
  const [reset, setReset] = useState(false); // Used for profile-based reset to show OTP
  const [newPassword, setNewPassword] = useState(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPassMailSent, setForgotPassMailSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    control,
    formState: { errors },
  } = useForm();

  const { t, i18n} = useTranslation([
    "reset-password",
    "login",
    "otp",
    "popup",
    "sidebar",
    "toast",
  ]);
  const isArabic = i18n.language === 'ar'

  const passwordValidator = new Validator()
    .validateNotEmptySpace()
    .validateMinLength(5)
    .validateMaxLength(50)
    .validateNotOnlySymbols()
    .validateAtLeastOneSymbol()
    .validateAtLeastOneNumber()
    .validateAtLeastOneCharacter()
    .validateAtLeastOneUppercase()
    .validateAtLeastOneLowercase()
    .build();

  const oldPasswordValidator = new Validator().validateNotEmptySpace().build();

  // useEffect(() => {
  //   let query = {
  //     email:email
  //   }
  //   resetPasswordLinkCheck(query)
  // },[])

  const onSubmit = (data) => {
    let query = {
      is_forgotPassword: true,
      token: resetPasswordToken,
    };
    let body = {
      forgotPasswordEmail: email,
      password: data.password,
    };
    forgotpasswordValidation(query, body)
      .then((res) => {
        setStatus("success");
        setReset(true);
        showToast(
          t("popup:passwordResetSuccess"),
          t("popup:passwordResetConfirmation"),
          "success"
        );
      })
      .catch((err) => {
        console.error(err);
        setStatus("failure");
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(err?.response?.data?.message || "Password reset failed");
      });
  };

  const handleResetPassword = async (data) => {
    setNewPassword(data?.newPassword);
    let body = {
      current_pass: data.oldPassword,
      password: data.newPassword,
    };
    const isValid = await trigger();

    if (isValid) {
      resetPasswordDashboard(body)
        .then((res) => {
          setStatus("success");
          setReset(true);
          // localStorage.clear()
          // sessionStorage.clear()
          // navigate(`/${AUTH_SETUP}${LOGIN}`);
        })
        .catch((err) => {
          console.error(err);
          setStatus("failure");
          //showToast('Error.', `${err?.response?.data?.message}`, 'error')
          toast.error(err?.response?.data?.message || t("passwordResetFailed"));
        });
    } else {
      //showToast('Error.', 'Please fill all the fields', 'error')
      toast.error(t("fillAllTheFields"));
    }
  };

  const handleRedirect = (status) => {
    if (status === "success") {
      navigate(`/${AUTH_SETUP}${LOGIN}`);
    } else {
      navigate(`/${AUTH_SETUP}${FORGOT_PASSWORD}`);
    }
  };

  const handleConfirmSubmit = () => {
    let body = {
      email: email,
    };
    forgotPassword(body)
      .then((res) => {
        setIsForgotPassword(false);
        setForgotPassMailSent(true);
      })
      .catch((err) => {
        console.error(err?.response?.data?.message, "errorrr");
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(
          err?.response?.data?.message || t("failedTosendPasswordEmail")
        );
        setIsForgotPassword(false);
      });
  };

  if (isProfileReset) {
    // Profile-based password reset flow
    return (
      <LeftPageContainer>
        <HeaderBar
          title={t("passwordReset")}
          slug={`${t("sidebar:home")} / ${t("passwordReset")}`}
        >
          <div className={styles.helpIconContainer}>
            <SVGIcon name="help" size={25} className='cursor-pointer' onClick={() => navigate(`/${userType}${FAQS}`)} />
          </div>
        </HeaderBar>

        <div className={styles.resetPasswordContainerOuter}>
          {!reset ? (
            <div className={styles.resetPasswordContainer}>
              <label className={styles.resetTitle}>
                {t("reset_your_password")}
              </label>
              {/* <p className={`${styles.emailTxt} my-3`}>
                <b>{t('email')}:</b> {email}
              </p> */}

              <form onSubmit={handleSubmit(handleResetPassword)}>
                <div className="mb-3">
                  <Controller
                    name="oldPassword"
                    control={control}
                    rules={{
                      required: t("password.error"),
                      validate: (value) => oldPasswordValidator("", value),
                    }}
                    render={({
                      field: { onChange, value },
                      fieldState: { error },
                    }) => (
                      <InputBox
                        titleLabel={t("oldPassword.text")}
                        className="login-input-reset inputBox mb-0"
                        name="oldPassword"
                        type="password"
                        placeholder={t("oldPassword.text")}
                        PasswordIcon={true}
                        onChange={onChange}
                        error={errors.oldPassword}
                        isRequired
                        value={value || ""}
                      />
                    )}
                  />
                </div>
                <div className="mb-3">
                  <InputBox
                    titleLabel={t("newPassword.text")}
                    className="login-input-reset  inputBox mb-0"
                    name="newPassword"
                    type="password"
                    placeholder={t('newPassword.text')}
                    PasswordIcon={true}
                    register={register}
                    rules={{
                      required: t("newPassword.error"),
                      validate: (value) => {
                        const oldPassword = watch("oldPassword");
                        if (value === oldPassword) {
                          return "New password must be different from old password";
                        }
                        return passwordValidator("", value);
                      },
                    }}
                    error={errors.newPassword}
                    isRequired
                  />
                </div>
                <div className="mb-3">
                  <InputBox
                    titleLabel={t("re_enter_new_password.text")}
                    className="login-input-reset  inputBox mb-0"
                    name="renterNewPassword"
                    type="password"
                    placeholder={t('re_enter_password.text')}
                    PasswordIcon={true}
                    register={register}
                    rules={{
                      required: t("re_enter_new_password.error"),
                      validate: (value) =>
                        value === watch("newPassword") || t("passDoNotMatch"),
                    }}
                    error={errors.renterNewPassword}
                    isRequired
                  />
                </div>
                <NormalButton
                  label={t("reset")}
                  isPrimary
                  customClass={`${styles.resetBtn} my-3`}
                  type="submit"
                />
              </form>

              <div className={styles.forgotPassword}>
                <label onClick={() => setIsForgotPassword(true)}>
                  {t("login:forget_pwd")}?
                </label>
              </div>
            </div>
          ) : (
            <TOtpComponent
              title={t("otp:verificationOtp")}
              isProfileReset
              password={newPassword}
            />
          )}
        </div>
        <CustomModal
          open={isForgotPassword}
          modalStyles={{ width: 600 }}
          onClose={() => setIsForgotPassword(false)}
          closeIcon
        >
          <p className="font-semibold text-center text-2xl">
            {t("popup:yourPasswordResetLinkWillBeSent", { email })}
          </p>
          <div className="d-flex justify-content-between my-3">
            <NormalButton
              label={t("otp:close")}
              outlineBtn
              customClass="navigation-buttons"
              onClick={() => setIsForgotPassword(false)}
            />
            <NormalButton
              label={t("otp:confirm")}
              isPrimaryModal
              customClass="navigation-buttons"
              onClick={handleConfirmSubmit}
            />
          </div>
        </CustomModal>
        <CustomModal
          open={forgotPassMailSent}
          modalStyles={{ width: 456 }}
          onClose={() => setForgotPassMailSent(false)}
          closeIcon
        >
          <div className="successGif">
            <img src={successGif} alt="status" height="71px" width="70px" />
          </div>
          <p className="font-normal text-2xl text-center">
            {t("popup:emailResetLinkSent", { email })}
          </p>

          <div className="my-3">
            <NormalButton
              label={t("otp:close")}
              outlineBtn
              customClass="w-full"
              onClick={() => setForgotPassMailSent(false)}
            />
          </div>
        </CustomModal>
      </LeftPageContainer>
    );
  }

  return (
    <div
      className="login-container reset-new-password"
      // style={{ marginTop: "7rem" }}
    >
      {status === "failure" ? (
        <div>
          <div className="successGif">
            <img src={errorSign} alt="status" height="71px" width="70px" />
          </div>
          <p className="otp-title mb-2 text-center rpc-msg">
            {"Your password reset link has been expired"}
          </p>
          {/* {status === 'success' && <p>You can now sign in with your new password.</p>} */}
          <NormalButton
            label={t("login:goBack")}
            customClass="login-button mt-3"
            isPrimary
            type="button"
            onClick={() => handleRedirect(status)}
          />
        </div>
      ) : status === "success" && reset ? (
        <div>
          <div className="successGif">
            <img
              src={status === "success" ? successGif : errorSign}
              alt="status"
              height="71px"
              width="70px"
            />
          </div>
          <p className="otp-title mb-2 text-center rpc-msg font-normal text-2xl ">
            {status === "success"
              ? t("popup:yourPasswordHasBeenSuccessfullyReset")
              : t("popup:yourPasswordResetLinkHasBeenExpired")}
          </p>
          {status === "success" && (
            <p className="font-normal text-lg text-center">
              {t("youCanNowSignInNewPasword")}
            </p>
          )}
          <NormalButton
            label={status === "success" ? t("login:signin") : t("login:goBack")}
            customClass="login-button mt-3"
            isPrimary
            type="button"
            onClick={() => handleRedirect(status)}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <label className="login-title"> {t(formTitle)} </label>

          <InputBox
            titleLabel={t("password.text")}
            className="login-input inputBox mb-0"
            name="password"
            type="password"
            PasswordIcon={true}
            register={register}
            rules={{
              required: t("password.error"),
              validate: (value) => passwordValidator(t("password.text"), value),
            }}
            error={errors.password}
            isRequired
            tooltipIcon
            tooltipMessage={t("password.tooltip")}
          />
          <div className="mt-3">
            <InputBox
              titleLabel={t("re_enter_password.text")}
              className="login-input inputBox mb-0"
              name="reEnterPassword"
              type="password"
              PasswordIcon={true}
              register={register}
              rules={{
                required: t("re_enter_password.error"),
                validate: (value) =>
                  value === watch("password") || "Passwords do not match",
              }}
              error={errors.reEnterPassword}
              isRequired
              tooltipIcon
              tooltipMessage={t("re_enter_password.text")}
            />
          </div>

          <NormalButton
            label={t("submit")}
            customClass="login-button mt-3"
            isPrimary
            type="submit"
          />
        </form>
      )}
    </div>
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

const mapDispatchToProps = {
  showToast,
};

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordComp);
