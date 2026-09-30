import { InputBox } from "../../../Common/InputBox";
import { NormalButton } from "../../../Common/NormalButton";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { trackApplication } from "api/TrackApplication";
import { connect } from "react-redux";
import { setApplicationStatus } from "../../../../redux/actions/trackApplication";
import { showToast } from "../../../../redux/actions/toastActions";
import { Validator } from "../../../../services/validation/formValidations";
import { useTranslation } from "react-i18next";
import { AUTH_SETUP, VENDOR_PORTAL } from "constants/userType";
import { toast } from "react-toastify";
import { useEffect } from "react";

function TrackApplicationFormComp({
  setApplicationStatus,
  userInfo: { userType },
  showToast,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation(["login", "legal_identification_comp"]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({ mode: "onChange" });

  const licenseValue = watch("license_number");

  // convert to uppercase on every change
  useEffect(() => {
    if (licenseValue) {
      const upper = licenseValue.toUpperCase();
      if (upper !== licenseValue) {
        setValue("license_number", upper, { shouldValidate: true });
      }
    }
  }, [licenseValue, setValue]);

  const onSubmit = (data) => {
    const query = {
      company_name: data?.vendor_name,
      reference_number: data?.reference_number,
      trade_licence_number: data?.license_number,
    };
    trackApplication(query)
      .then((res) => {
        setApplicationStatus({
          registration_status: res?.data?.data?.Status,
          comments: res?.data?.data?.Comments,
          applicationId: res?.data?.data?.ID,
        });
        navigate(`/${AUTH_SETUP}/track-application/progress`);
      })
      .catch((err) => {
        console.error(err);
        //showToast('Error.', `${err?.response?.data?.message}`, 'error')
        toast.error(
          err?.response?.data?.message || "Failed to track application"
        );
      });
  };

  const alphaNumericValidator = new Validator()
    .validateNotEmptySpace()
    .validateNoSymbols()
    //.validateMaxLength(60)
    .build();

  const alphaNumericWithNotOnlyNumberValidator = new Validator()
    .validateNotEmptySpace()
    //.validateNoSymbols()
    .validateNotOnlyNumbers()
    .validateMaxLength(70)
    .build();

  return (
    <div className="login-container track-container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <label className="login-title">{t("track_my_application")}</label>
        <div className="mb-3">
          <InputBox
            titleLabel={t("referenceNumber.text")}
            placeholder={t("referenceNumber.text")}
            className="login-input inputBox mb-0"
            name="reference_number"
            type="text"
            register={register}
            rules={{
              required: t("referenceNumber.error"),
              validate: (value) =>
                alphaNumericValidator("Reference Number", value),
            }}
            error={errors.reference_number}
            isRequired
            tooltipIcon
            tooltipMessage={t("referenceNumber.tooltip")}
            maxLength={10}
          />
        </div>
        <div className="mb-3">
          <InputBox
            titleLabel={t("companyName.text")}
            className="login-input inputBox mb-0"
            placeholder={t("companyName.text")}
            name="vendor_name"
            type="text"
            isRequired
            tooltipIcon
            tooltipMessage={t("companyName.tooltip")}
            register={register}
            rules={{
              required: t("companyName.error"),
              validate: (value) =>
                alphaNumericWithNotOnlyNumberValidator("Company Name", value),
            }}
            error={errors.vendor_name}
            maxLength={70}
          />
        </div>

        <div className="mb-3">
          <InputBox
            titleLabel={t("tradeLicenceNumber.text")}
            className="login-input inputBox mb-0"
            placeholder={t("tradeLicenceNumber.text")}
            name="license_number"
            type="text"
            isRequired
            tooltipIcon
            // placeholder={t('legal_identification_comp:licenseNo.tooltip')}
            tooltipMessage={t("tradeLicenceNumber.tooltip")}
            register={register}
            rules={{
              required: t("tradeLicenceNumber.error"),
              validate: (value) =>
                alphaNumericValidator("Trade License Number", value),
            }}
            error={errors.license_number}
            maxLength={60}
          />
        </div>

        <NormalButton
          label={t("trackYourApplication")}
          customClass="login-button mt-3"
          isPrimary
          type="submit"
        />
        {/* <hr className="divider" /> */}
      </form>
      {/* <NormalButton
        label={t("signin")}
        customClass="login-button"
        outlineBtn
        onClick={() => navigate(`/${AUTH_SETUP}/login`)}
      /> */}
    </div>
  );
}

const mapDispatchToProps = {
  setApplicationStatus,
  showToast,
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TrackApplicationFormComp);
