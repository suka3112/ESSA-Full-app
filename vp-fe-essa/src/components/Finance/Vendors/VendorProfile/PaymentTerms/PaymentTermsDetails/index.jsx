import React from 'react'
import styles from './PaymentTermsDetails.module.scss'
import { InputBox } from 'components/Common/InputBox'
import { useForm } from 'react-hook-form'

const PaymentTermsComp = () => {
  const {
    register,
    formState: { errors },
    control
  } = useForm()
  return (
    <div className={styles.ptContainer}>
      <label className="mb-4">Payment Terms</label>
      <form>
        <div className={styles.ptInputs}>
          <div>
            <InputBox
              titleLabel="Payment Terms"
              className="signInInput inputBox mb-4"
              name="paymentTerms"
              type="text"
              register={register}
              rules={{
                required: 'Payment Terms is required'
              }}
              error={errors.paymentTerms}
              disabled
            />
            <InputBox
              titleLabel="Credit Note Payment Terms"
              className="signInInput inputBox mb-4"
              name="cnpt"
              type="text"
              register={register}
              rules={{
                required: 'Credit Note Payment Terms is required'
              }}
              error={errors.cnpt}
              disabled
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
                required: 'Incoterms is required'
              }}
              error={errors.incoterms}
              disabled
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
                required: 'Incoterms Location is required'
              }}
              error={errors.incotermsLocation}
              disabled
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default PaymentTermsComp
