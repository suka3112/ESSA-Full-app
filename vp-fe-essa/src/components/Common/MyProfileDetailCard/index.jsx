import styles from "./MyProfileDetailCard.module.scss";
const MyProfileDetailCard = ({ label, value,customClass,pclass }) => (
  <div className="d-flex">
    <p className={`${styles.cardLabel} ${pclass || ""}`}>{label}</p>
    <h5 className={`${styles.cardValue} ${customClass || ""}`}>
      {value || "N/A"}
    </h5>
  </div>
);

export default MyProfileDetailCard;
