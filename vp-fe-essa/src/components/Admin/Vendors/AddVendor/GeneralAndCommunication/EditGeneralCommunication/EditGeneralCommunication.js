import React, { useState } from "react";
import styles from "./EditGeneralCommunication.module.scss";
import { InputBox } from "components/Common/InputBox";
import { Controller, useForm } from "react-hook-form";
import { NormalButton } from "components/Common/NormalButton";
import { useNavigate } from "react-router-dom";
import { SelectBox } from "components/Common/SelectBox";
import tooltipIcon from "../../../../../../assets/icons/tooltip.svg";

const EditGeneralCommunicationComp = ({ isEditable, onNextClick }) => {
  const {
    register,
    formState: { errors },
    control,
  } = useForm();

  const navigate = useNavigate();

  const fields = [
    {
      titleLabel: "Daikin Entity Name",
      name: "diakinEntityName",
      isRequired: false,
      type: "text",
    },
    {
      titleLabel: "Daikin Contact Name",
      name: "diakinContactName",
      isRequired: false,
      type: "text",
    },
    {
      titleLabel: "Vendor Name",
      name: "vendorName",
      isRequired: true,
      type: "text",
    },
    {
      titleLabel: "Street/House No.",
      name: "streetHouseNo",
      isRequired: true,
      type: "text",
    },
    {
      titleLabel: "Postal Code",
      name: "postalCode",
      isRequired: true,
      type: "text",
    },
    {
      titleLabel: "Country",
      name: "country",
      isRequired: true,
      type: "select",
      options: [
        { label: "India", value: "india" },
        { label: "USA", value: "usa" },
      ],
      placeholder: "Select Country",
    },
    {
      titleLabel: "City",
      name: "city",
      isRequired: true,
      type: "select",
      options: [
        { label: "Chennai", value: "chennai" },
        { label: "New York", value: "new-york" },
      ],
      placeholder: "Select City",
    },
    {
      titleLabel: "Region",
      name: "region",
      isRequired: true,
      type: "select",
      options: [
        { label: "Asia", value: "asia" },
        { label: "Europe", value: "europe" },
      ],
      placeholder: "Select Region",
    },
    {
      titleLabel: "Phone Number",
      name: "phoneNumber",
      isRequired: true,
      type: "number",
      pattern: {
        value: /^[0-9]{10}$/,
        message: "Phone number must be 10 digits",
      },
    },
    {
      titleLabel: "Fax",
      name: "fax",
      isRequired: true,
      type: "number",
      pattern: {
        value: /^[0-9-+()\s]{7,15}$/,
        message: "Fax number is invalid",
      },
    },
    {
      titleLabel: "Industry Type",
      name: "industryType",
      isRequired: true,
      type: "select",
      options: [
        { label: "Manufacturing", value: "manufacturing" },
        { label: "IT", value: "it" },
      ],
    },
    {
      titleLabel: "Industry Key",
      name: "industryKey",
      isRequired: true,
      type: "text",
    },
    {
      titleLabel: "WHT Applicable",
      name: "whtApplicable",
      isRequired: true,
      type: "radio",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
    {
      titleLabel: "WHT Rate",
      name: "whtRate",
      isRequired: true,
      type: "select",
      options: [
        { label: "Manufacturing", value: "manufacturing" },
        { label: "IT", value: "it" },
      ],
    },
    {
      titleLabel: "Taxable Basis",
      name: "taxableBasis",
      isRequired: true,
      type: "select",
      options: [
        { label: "Manufacturing", value: "manufacturing" },
        { label: "IT", value: "it" },
      ],
    },
  ];

  const [emailFields, setEmailFields] = useState([0]);

  const addEmailField = (index) => {
    const newFields = [...emailFields];
    newFields.splice(index + 1, 0, emailFields.length);
    setEmailFields(newFields);
  };

  const removeEmailField = (indexToRemove) => {
    setEmailFields(emailFields.filter((_, index) => index !== indexToRemove));
  };

  // Find index of "fax" field in the fields array
  const faxFieldIndex = fields.findIndex((field) => field.name === "fax");

  // Split fields before the "fax" field, after "fax", and include email fields in between
  const fieldsBeforeFax = fields.slice(0, faxFieldIndex + 1);
  const fieldsAfterFax = fields.slice(faxFieldIndex + 1);

  return (
    <div className={styles.gcDetailsContainer}>
      <div className={styles.formHeader}>
        <label className="mb-4">General and Communication</label>
      </div>
      <form>
        <div className={styles.formFieldsContainer}>
          {/* Render fields before fax */}
          {fieldsBeforeFax.map((field, index) => (
            <div key={index} className="form-field">
              {field.type === "text" ||
              (field.type === "number" && field.name !== "phoneNumber") ? (
                <InputBox
                  titleLabel={field.titleLabel}
                  className="signInInput inputBox"
                  name={field.name}
                  type="text"
                  register={register}
                  rules={{
                    required: field.isRequired
                      ? `${field.titleLabel} is required`
                      : false,
                    pattern: field.pattern,
                  }}
                  error={errors[field.name]}
                  tooltipIcon
                  isRequired={field.isRequired}
                  labelSize="headLabelForm"
                />
              ) : field.type === "select" ? (
                <Controller
                  name={field.name}
                  control={control}
                  rules={{ required: `${field.titleLabel} is required` }}
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <div className="select-container  mb-4">
                      <div className="d-flex items-center mb-2">
                        <div>
                          <label className="selectLabel">
                            {field.titleLabel}
                          </label>
                          <span className="required inline-block">
                            {field.isRequired && "*"}
                          </span>
                        </div>
                        <img
                          src={tooltipIcon}
                          alt="info icon"
                          className="ms-1 h-[12px]"
                        />
                      </div>
                      <SelectBox
                        value={value}
                        onChange={onChange}
                        options={field.options}
                        name={field.name}
                        isRequired={field.isRequired}
                        className="custom-select-box"
                        placeholder={
                          field.placeholder ? field.placeholder : "Select"
                        }
                        error={error}
                      />
                    </div>
                  )}
                />
              ) : field.type === "radio" ? (
                <div className="radio-container">
                  <label className="mt-2">{field.titleLabel}</label>
                  <label className="required">{field.isRequired && "*"}</label>
                  <div className="d-flex mt-4">
                    {field.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="radio-option me-2">
                        <input
                          type="radio"
                          name={field.name}
                          value={option.value}
                          {...register(field.name, {
                            required: `${field.titleLabel} is required`,
                          })}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  {errors[field.name] && (
                    <p className="error-text">{errors[field.name].message}</p>
                  )}
                </div>
              ) : field.name == "phoneNumber" ? (
                <div>
                  <label
                    htmlFor="fileInput"
                    className="headLabelForm d-flex mb-3"
                  >
                    Phone Number<span className="required">*</span>
                    <img src={tooltipIcon} alt="info icon" className="ms-1" />
                  </label>
                  <div className="phone-input-container">
                    <select className="country-code-select">
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                    </select>
                    <div className="divider"></div>
                    <input
                      type="text"
                      name="phoneNumber"
                      {...register("phoneNumber", {
                        required: "Phone number is required",
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: "Phone number must be 10 digits",
                        },
                      })}
                      className="phone-number-input"
                      placeholder="Enter phone number"
                      maxLength="10"
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="error-phoneText">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ))}

          {/* Render dynamic email fields in between fax and industry type */}
          {emailFields.map((_, emailIndex) => (
            <div key={emailIndex} className="form-field">
              <InputBox
                titleLabel={
                  emailIndex === 0 ? "Email" : `Email ${emailIndex + 1}`
                }
                className="signInInput inputBox"
                name={`email${emailIndex === 0 ? "" : emailIndex + 1}`}
                type="text"
                register={register}
                rules={{
                  required: emailIndex === 0 ? "Email is required" : false,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email address",
                  },
                }}
                error={errors[`email${emailIndex === 0 ? "" : emailIndex + 1}`]}
                tooltipIcon
                isRequired={true}
                addEmail={emailIndex === 0 ? "+" : "-"}
                handleAddEmail={() => addEmailField(emailIndex)}
                handleRemoveEmail={() => removeEmailField(emailIndex)}
              />
            </div>
          ))}

          {/* Render fields after fax */}
          {fieldsAfterFax.map((field, index) => (
            <div key={index} className="form-field">
              {field.type === "text" ||
              (field.type === "number" && field.name !== "phoneNumber") ? (
                <InputBox
                  titleLabel={field.titleLabel}
                  className="signInInput inputBox"
                  name={field.name}
                  type="text"
                  register={register}
                  rules={{
                    required: field.isRequired
                      ? `${field.titleLabel} is required`
                      : false,
                    pattern: field.pattern,
                  }}
                  error={errors[field.name]}
                  tooltipIcon
                  isRequired={field.isRequired}
                />
              ) : field.type === "select" ? (
                <div className=" mb-4">
                  <Controller
                    name={field.name}
                    control={control}
                    rules={{ required: `${field.titleLabel} is required` }}
                    render={({
                      field: { onChange, value },
                      fieldState: { error },
                    }) => (
                      <div className="select-container mb-4">
                        <div className="d-flex">
                          <div>
                            <label className="selectLabel">
                              {field.titleLabel}
                            </label>
                            <span className="required">
                              {field.isRequired && "*"}
                            </span>
                          </div>
                          <img
                            src={tooltipIcon}
                            alt="info icon"
                            className="ms-1"
                          />
                        </div>
                        <SelectBox
                          value={value}
                          onChange={onChange}
                          options={field.options}
                          name={field.name}
                          isRequired={field.isRequired}
                          className="custom-select-box mt-1"
                          placeholder={
                            field.placeholder ? field.placeholder : "Select"
                          }
                          error={error}
                        />
                      </div>
                    )}
                  />
                </div>
              ) : field.type === "radio" ? (
                <div className="radio-container">
                  <label className="mt-2 selectLabel mb-2">
                    {field.titleLabel}
                    <span className="required">{field.isRequired && "*"}</span>
                  </label>

                  <div className="d-flex h-[45px] items-center">
                    {field.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        className="radio-option flex items-center me-2"
                      >
                        <InputBox
                          type="radio"
                          name={field.name}
                          value={option.value}
                          rules={{
                            required: field.isRequired
                              ? `${field.titleLabel} is required`
                              : false,
                            pattern: field.pattern,
                          }}
                          tooltipIcon
                          isRequired={field.isRequired}
                          register={register}
                          className="me-1"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  {errors[field.name] && (
                    <p className="error-text">{errors[field.name].message}</p>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="d-flex justify-content-end">
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

export default EditGeneralCommunicationComp;
