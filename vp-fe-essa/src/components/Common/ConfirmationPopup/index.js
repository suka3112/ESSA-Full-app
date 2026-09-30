import React from 'react'
import CustomModal from '../Modal'
import { NormalButton } from '..'
import { useTranslation } from 'react-i18next'

const ConfirmationPopup = ({ open, confirmTxt, onClose, onConfirm, isLoading }) => {
    const {t} = useTranslation('otp', 'popup')
    return (
        <CustomModal
            open={open}
            header={t('popup:confirmSubmission')}
            description={confirmTxt}
            onClose={onClose}
            modalStyles={{ width: 400 }}
            closeIcon>
            {/* <p className="modalTxt">{confirmTxt}</p> */}
            <div className="d-flex justify-content-between my-2">
                <NormalButton
                    label={t('cancel')}
                    outlineBtn
                    customClass="confimationBtns"
                    onClick={onClose}
                    disabled={isLoading}
                />
                <NormalButton
                    label={t('confirm')}
                    isPrimaryModal
                    customClass="confimationBtns "
                    onClick={onConfirm}
                    isLoading={isLoading}
                />
            </div>
        </CustomModal>
    )
}

export default ConfirmationPopup
