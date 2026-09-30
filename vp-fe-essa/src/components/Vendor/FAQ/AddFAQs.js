import { addFaqQuestion } from 'api/Faq'
import { NormalButton } from 'components/Common'
import { InputBox } from 'components/Common/InputBox'
import CustomModal from 'components/Common/Modal'
import TextEditor from 'components/Common/TextEditor'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'

const AddFAQs = ({ open, onClose, headerId, headerTitle, initialData, onUpdate, handleAddFAQ, showToast }) => {
    const {
        register,
        formState: { errors },
        handleSubmit,
        setError,
        clearErrors,
        reset,
        watch,
        setValue
    } = useForm({
        defaultValues: { question_EN: '', question_AR: '', answer_EN: '', answer_AR: '' },
        mode: 'onChange'
    });

    const { t } = useTranslation(['faq', 'toast', 'purchase_order'])

    const [loading, setLoading] = useState(false);

    // Watch the form values to keep them in sync
    const questionValue_EN = watch('question_EN');
    const questionValue_AR = watch('question_AR');
    const answerValue_EN = watch('answer_EN');
    const answerValue_AR = watch('answer_AR');

    const isQuillEmpty = (htmlContent) => {
        if (!htmlContent) return true;

        // Common React Quill empty states
        const emptyStates = [
            '<p><br></p>',
            '<p></p>',
            '<p><br/></p>',
            '<div><br></div>',
            '<div></div>',
            '<div><br/></div>',
            ''
        ];

        if (emptyStates.includes(htmlContent.trim())) {
            return true;
        }

        // Check for iframe, video, or image tags (for embedded media)
        if (/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/i.test(htmlContent) ||
            /<video[\s\S]*?>[\s\S]*?<\/video>/i.test(htmlContent) ||
            /<img[\s\S]*?src=['"][^'"]+['"][\s\S]*?>/i.test(htmlContent)) {
            return false;
        }

        // Remove all HTML tags and check if there's actual text content
        const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
        if (textContent) return false;

        return true;
    };

    useEffect(() => {
        // Only update if initialData changes or modal opens
        if (initialData) {
            reset({
                question_EN: initialData.question_EN || '',
                question_AR: initialData.question_AR || '',
                answer_EN: initialData.answer_EN || '',
                answer_AR: initialData.answer_AR || ''
            });
        } else if (open) {
            reset({
                question_EN: '',
                question_AR: '',
                answer_EN: '',
                answer_AR: ''
            });
        }
    }, [initialData, open, reset]);

    // Clear errors when user starts typing
    useEffect(() => {
        if (questionValue_EN && questionValue_EN.trim() && errors.question_EN) {
            clearErrors('question_EN');
        }
    }, [questionValue_EN, errors.question_EN, clearErrors]);

    useEffect(() => {
        if (questionValue_AR && questionValue_AR.trim() && errors.question_AR) {
            clearErrors('question_AR');
        }
    }, [questionValue_AR, errors.question_AR, clearErrors]);

    useEffect(() => {
        // For React Quill, check if there's actual text content (not just HTML tags)
        if (answerValue_EN && !isQuillEmpty(answerValue_EN) && errors.answer_EN) {
            clearErrors('answer_EN');
        }
    }, [answerValue_EN, errors.answer_EN, clearErrors]);

    useEffect(() => {
        // For React Quill, check if there's actual text content (not just HTML tags)
        if (answerValue_AR && !isQuillEmpty(answerValue_AR) && errors.answer_AR) {
            clearErrors('answer_AR');
        }
    }, [answerValue_AR, errors.answer_AR, clearErrors]);

    const onSubmit = async (data) => {
        // Validate questions for non-empty, non-space value
        if (!data.question_EN || !data.question_EN.trim()) {
            setError('question_EN', { type: 'manual', message: t('questionIsRequired') });
            return;
        }
        if (!data.question_AR || !data.question_AR.trim()) {
            setError('question_AR', { type: 'manual', message: t('questionIsRequired') });
            return;
        }
        if (!data.answer_EN || !data.answer_EN.trim()) {
            setError('answer_EN', { type: 'manual', message: t('faq:answerIsRequired') });
            return;
        }
        if (!data.answer_AR || !data.answer_AR.trim()) {
            setError('answer_AR', { type: 'manual', message: t('faq:answerIsRequired') });
            return;
        }

        // For React Quill, validate that there's actual text content (not just HTML tags)
        if (isQuillEmpty(data.answer_EN)) {
            setError('answer_EN', { type: 'manual', message: t('faq:answerIsRequired') });
            return;
        }
        if (isQuillEmpty(data.answer_AR)) {
            setError('answer_AR', { type: 'manual', message: t('faq:answerIsRequired') });
            return;
        }
        setLoading(true);
        const payload = {
            question_EN: data.question_EN.trim(),
            question_AR: data.question_AR.trim(),
            answer_EN: data.answer_EN,
            answer_AR: data.answer_AR
        };
        try {
            if (initialData && onUpdate) {
                await onUpdate(payload)
            } else {
                await addFaqQuestion(headerId, payload)
                showToast(t('newQuestionAndAnsAdded'), t('addedSuccessfully'), 'success');
                if (handleAddFAQ) handleAddFAQ()
            }
            reset();
            onClose();
        } catch (err) {
            toast.error(err?.message || t('failedToSaveFAQ'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomModal open={open} closeIcon onClose={onClose} modalStyles={{ width: "1000px", height: "90vh" }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <p className="modalTxt mb-4 text-left">
                    {initialData
                        ? t('updateQuestionAndAns')
                        : `${t('addQuestionAndAnsUnder')} ${headerTitle || ''}`}
                </p>
                
                {/* English Question */}
                <InputBox
                    titleLabel={t('question') + ' (English)'}
                    className="signInInput inputBox mb-3"
                    name="question_EN"
                    type="text"
                    register={register}
                    isRequired
                    clearErrors={clearErrors}
                    error={errors.question_EN}
                    value={questionValue_EN}
                    rules={{
                        required: t('questionIsRequired'),
                        validate: (value) => {
                            if (!value || !value.trim()) {
                                return t('questionIsRequired');
                            }
                            return true;
                        }
                    }}
                />
                
                {/* Arabic Question */}
                <InputBox
                    titleLabel={t('question') + ' (Arabic)'}
                    className="signInInput inputBox mb-3"
                    name="question_AR"
                    type="text"
                    register={register}
                    isRequired
                    clearErrors={clearErrors}
                    error={errors.question_AR}
                    value={questionValue_AR}
                    rules={{
                        required: t('questionIsRequired'),
                        validate: (value) => {
                            if (!value || !value.trim()) {
                                return t('questionIsRequired');
                            }
                            return true;
                        }
                    }}
                />
                
                {/* English Answer */}
                <label>{t('answer')} (English) <span className='required'>*</span></label>
                <div className={`${errors.answer_EN ? 'border border-danger' : ''}`}>
                    <TextEditor
                        placeholder={t('enterAnswerHere')}
                        value={answerValue_EN}
                        setValue={(value) => {
                            setValue('answer_EN', value);
                            if (!isQuillEmpty(value)) {
                                clearErrors('answer_EN');
                            }
                        }}
                    />
                </div>
                {errors.answer_EN && <p className="text-danger mt-1">{errors.answer_EN.message}</p>}
                
                {/* Arabic Answer */}
                <label>{t('answer')} (Arabic) <span className='required'>*</span></label>
                <div className={`${errors.answer_AR ? 'border border-danger' : ''}`}>
                    <TextEditor
                        placeholder={t('enterAnswerHere')}
                        value={answerValue_AR}
                        setValue={(value) => {
                            setValue('answer_AR', value);
                            if (!isQuillEmpty(value)) {
                                clearErrors('answer_AR');
                            }
                        }}
                    />
                </div>
                {errors.answer_AR && <p className="text-danger mt-1">{errors.answer_AR.message}</p>}
                
                <div className="my-4 w-100">
                    <NormalButton
                        label={loading ? (initialData ? t('updating') : t('adding')) : (initialData ? t('update') : t('add'))}
                        isPrimary
                        type="submit"
                        customClass='px-4'
                        disabled={loading}
                    />
                </div>
            </form>
        </CustomModal>
    );
}

export default AddFAQs
