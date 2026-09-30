import React from "react";
import styles from "./EditPaymentTerms.module.scss";
import { InputBox } from "components/Common/InputBox";
import { Controller, useForm } from "react-hook-form";
import { NormalButton } from "components/Common/NormalButton";
import { SelectBox } from "components/Common/SelectBox";
import tooltipIcon from "../../../../../../assets/icons/tooltip.svg";

const EditPaymentTermsComp = ({ onNextClick }) => {
  const {
    register,
    formState: { errors },
    control,
  } = useForm();

  const options = [
    { label: "Option 1", value: "1" },
    { label: "Option 2", value: "2" },
  ];
  return (
    <div className={styles.ptContainer}>
      <label className="my-3">Payment Terms</label>
      <form>
        <div className={styles.ptInputs}>
          <div>
            <div className={`${styles.userInputs} mb-4`}>
              <label className="d-flex gap-1">
                Payment Terms <span className="required">*</span>
                <img src={tooltipIcon} alt="tooltip" />
              </label>
              <Controller
                name="paymentTerms"
                control={control}
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <div className="select-container">
                    <SelectBox
                      className="custom-select-box user-input mt-3"
                      error={error}
                      label="Payment Terms"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      options={options}
                      name="paymentTerms"
                      isRequired
                    />
                  </div>
                )}
              />
            </div>
          </div>
          <div className={`${styles.userInputs} mb-4`}>
            <label className="d-flex gap-1 mb-3">
              Credit Note Payment Terms <span className="required">*</span>
              <img src={tooltipIcon} alt="tooltip" />
            </label>
            <Controller
              name="creditNotePaymentTerms"
              control={control}
              render={({
                field: { onChange, value },
                fieldState: { error },
              }) => (
                <div className="select-container">
                  <SelectBox
                    className="custom-select-box user-input"
                    error={error}
                    label="Credit Note Payment Terms"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={options}
                    name="creditNotePaymentTerms"
                    isRequired
                  />
                </div>
              )}
            />
          </div>
          <div>
            <InputBox
              titleLabel="Incoterms"
              className="signInInput inputBox mb-4"
              name="incoterms"
              type="text"
              register={register}
              rules={{
                required: "Incoterms is required",
              }}
              error={errors.incoterms}
              isRequired
              tooltipIcon
            />
          </div>
          <div>
            <InputBox
              titleLabel="Incoterms Location"
              className="signInInput inputBox mb-4"
              name="incotermsLocation"
              type="text"
              register={register}
              rules={{
                required: "Incoterms Location is required",
              }}
              error={errors.incotermsLocation}
              isRequired
              tooltipIcon
            />
          </div>
        </div>
        <div className={"d-flex justify-content-between"}>
          <NormalButton
            label="Back"
            outlineBtn
            customClass={styles.submitBtn}
          />
          <NormalButton
            label="Save & Continue"
            isPrimary
            customClass={styles.submitBtn}
            onClick={onNextClick}
          />
        </div>
      </form>
    </div>
  );
};

export default EditPaymentTermsComp;
