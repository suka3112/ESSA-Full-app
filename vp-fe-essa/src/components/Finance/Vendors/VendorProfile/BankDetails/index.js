import React from 'react'
import './style.scss'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'

const BankDetailsComp = ({ isEditable }) => {
  const {
    register,
    formState: { errors }
  } = useForm()
  return (
    <div className="bt-container">
      <label className="mb-4">Bank Details</label>
      <div className="bt-details">
        <div className="bank-fields">
          <div>
            <label>Payment By:</label>
            <label>Bank Name:</label>
            <label>Bank Account:</label>
            <label>SWIFT Code:</label>
            <label>Street/Building No. (Bank):</label>
            <label>Bank Charge Indicator:</label>
          </div>
          <div>
            <label>Normal Bank Transfer</label>
            <label>Emirates NBD</label>
            <label>**********1234</label>
            <label>******EBI</label>
            <label>Sheikh Zayed Road, Building 12</label>
            <label>Sheikh Zayed Road, Building 12</label>
          </div>
        </div>
        <div className="bank-fields">
          <div>
            <label>Invoice Currency:</label>
            <label>Bank Account Currency:</label>
            <label>Bank Country:</label>
            <label>IBAN Number:</label>
            <label>Postal Code:</label>
            <label>City:</label>
          </div>
          <div>
            <label>AED (United Arab Emirates Dirham)</label>
            <label>AED (United Arab Emirates Dirham)</label>
            <label>United Arab Emirates (UAE)</label>
            <label>**** **** **** **** **** 456</label>
            <label>Dubai</label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BankDetailsComp
