import { NormalButton } from 'components/Common'
import TableComponent from 'components/Common/TableComponent'
import React, { useState } from 'react'
import './style.scss'
import { InputBox } from 'components/Common/InputBox'
import { Controller, useForm } from 'react-hook-form'
import CustomModal from 'components/Common/Modal'
import { SelectBox } from 'components/Common/SelectBox'
import tooltip from '../../../../../assets/icons/tooltip.svg'
import { SearchInputTable } from 'components/Common/TableComponent/TableComponent.style'
import SearchInput from 'components/Common/SearchInput'

const UsersComp = () => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()
  const [addUser, setAddUser] = useState(false)

  const handleAddUser = () => {
    setAddUser(true)
  }

  const handleCancelSubmit = () => {
    setAddUser(false)
  }

  const handleConfirmSubmit = () => {
    setAddUser(false)
  }

  const paymentTermsOptions = [
    { label: '90 days', value: '90' },
    { label: 'others', value: 'others' }
  ]
  return (
    <div className="users-container">
      <div className="sub-header">
        <label>User Details</label>
      </div>
      <TableComponent />
      <CustomModal open={addUser} onClose={handleCancelSubmit} closeIcon>
        <p className="modalTxt mb-4">Add New User</p>
        <InputBox
          titleLabel="Name"
          className="signInInput inputBox mb-3"
          name="name"
          type="text"
          register={register}
          isRequired
          tooltipIcon
        />
        <InputBox
          titleLabel="Email"
          className="signInInput inputBox mb-3"
          name="email"
          type="text"
          register={register}
          isRequired
          tooltipIcon
        />
        <div className="d-flex">
          <div>
            <label className="selectLabel">Select Payment Terms</label>
            <span className="required">*</span>
          </div>
          <img src={tooltip} alt="info icon" className="ms-1" />
        </div>
        <Controller
          name="role"
          control={control}
          defaultValue="90" // Set the default value
          rules={{ required: 'Payment terms is required' }}
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <div className="select-container">

              <SelectBox
                className="custom-select-box mt-1"
                error={error}
                label="Select Role"
                onChange={(e) => onChange(e.target.value)} // Update react-hook-form value
                options={paymentTermsOptions}
                name="role"
                isRequired
                placeholder="Select"
              />
            </div>
          )}
        />
        <div className="my-4 w-100">
          <NormalButton
            label="Submit For Review"
            isPrimary
            onClick={handleConfirmSubmit}
            customClass="w-100"
          />
        </div>
      </CustomModal>
    </div>
  )
}

export default UsersComp
