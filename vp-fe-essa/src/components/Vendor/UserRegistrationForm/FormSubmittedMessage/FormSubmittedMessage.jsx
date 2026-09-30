import React from "react";
import "./FormSubmittedMessage.scss";
import { NormalButton } from "../../../Common/NormalButton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { connect } from "react-redux";
import successGif from '../../../../assets/gif/tickGreen.gif'
import { VENDOR_PORTAL } from "constants/userType";

const FormSubmittedMessageComp = ({ appRefNum, userInfo: { userType } }) => {
  const navigate = useNavigate()
  const { t } = useTranslation(['login', 'myprofile'])
  return (
    <div className="d-flex justify-content-center">
    <div className="success-container">
      <div className="successGif">
          <img src={successGif} alt="success gif" />
        </div>
      <h2>{t('formSubmitSuccessfully')}</h2>
      <p>{t('applicationReferenceNo')}<span className="ref-number">{appRefNum}</span> </p>
      <p>
        {t('youWillBeNotifiedViaEmailOnceYourApplicationHasBeen')} <br />{t('myprofile:approved')}.
      </p>
      <NormalButton label={t('trackYourApplication')} trackBtn customClass="track-btn"
        //onClick={()=>navigate(`/${userType}/track-application`)}
        onClick={() => navigate(`/auth/track-application`)}
      />
    </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
})


export default connect(mapStateToProps)(FormSubmittedMessageComp);

