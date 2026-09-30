import i18n from '../../i18n'

// Simple translation helper
const getMessage = (key, fieldName, ...args) => {
  const isArabic = i18n.language === 'ar'
  
  const messages = {
    cannotBeEmpty: isArabic 
      ? `${fieldName} غير صالح: لا يمكن أن يكون فارغًا`
      : `Invalid ${fieldName}: Cannot be empty`,
    multipleSpaces: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على مسافات متتالية متعددة`
      : `Invalid ${fieldName}: Cannot contain multiple consecutive spaces`,
    minLength: isArabic
      ? `${fieldName} غير صالح: يجب أن يكون على الأقل ${args[0]} أحرف`
      : `Invalid ${fieldName}: Must be at least ${args[0]} characters long`,
    maxLength: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يتجاوز ${args[0]} حرفًا`
      : `Invalid ${fieldName}: Cannot exceed ${args[0]} characters`,
    onlyNumbers: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على أرقام فقط`
      : `Invalid ${fieldName}: Must contain only numbers`,
    notOnlyNumbers: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على أرقام فقط`
      : `Invalid ${fieldName}: Cannot contain only numbers`,
    onlyText: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على أحرف فقط`
      : `Invalid ${fieldName}: Must contain only letters`,
    notOnlyText: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على أحرف فقط`
      : `Invalid ${fieldName}: Cannot contain only letters`,
    onlySymbols: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على رموز فقط`
      : `Invalid ${fieldName}: Must contain only symbols`,
    notOnlySymbols: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على حرف أو رقم واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one letter or number`,
    alphaNumeric: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على أحرف وأرقام`
      : `Invalid ${fieldName}: Must contain both letters and numbers`,
    invalidEmail: isArabic
      ? `${fieldName} غير صالح: عنوان بريد إلكتروني غير صالح`
      : `Invalid ${fieldName}: Invalid email address`,
    noSymbols: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على رموز`
      : `Invalid ${fieldName}: Cannot contain symbols`,
    noText: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على أحرف`
      : `Invalid ${fieldName}: Cannot contain letters`,
    noNumbers: isArabic
      ? `${fieldName} غير صالح: لا يمكن أن يحتوي على أرقام`
      : `Invalid ${fieldName}: Cannot contain numbers`,
    atLeastOneCharacter: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على حرف واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one letter`,
    atLeastOneUppercase: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على حرف كبير واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one uppercase letter`,
    atLeastOneLowercase: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على حرف صغير واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one lowercase letter`,
    atLeastOneSymbol: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على رمز واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one symbol`,
    atLeastOneNumber: isArabic
      ? `${fieldName} غير صالح: يجب أن يحتوي على رقم واحد على الأقل`
      : `Invalid ${fieldName}: Must contain at least one number`,
    alphanumericNoSymbols: isArabic
      ? `${fieldName} غير صالح: الأرقام والأحرف فقط ${args[0]}مسموح بها، بدون رموز خاصة.`
      : `Invalid ${fieldName}: Only letters and numbers ${args[0]}are allowed, no special symbols.`,
    cannotPassValidation: isArabic
      ? `${fieldName} غير صالح: لا يمكن اجتياز التحقق`
      : `Invalid ${fieldName}: Cannot pass the validation`,
    postalCodeIncorrect: isArabic
      ? 'الرمز البريدي غير صحيح'
      : 'The Postal Code is Incorrect'
  }
  
  return messages[key] || messages.cannotBeEmpty
}

export class Validator {
  constructor() {
    this.validators = []
  }

  validateNotEmptySpace() {
    this.validators.push((fieldName, value) => {
      if (!value || typeof value !== 'string') {
        return getMessage('cannotBeEmpty', fieldName)
      }

      const trimmedValue = value.trim()
      const multipleSpacesRegex = /\s{2,}/

      if (trimmedValue.length === 0) {
        return getMessage('cannotBeEmpty', fieldName)
      }

      if (multipleSpacesRegex.test(trimmedValue)) {
        return getMessage('multipleSpaces', fieldName)
      }

      return true
    })
    return this
  }

  validateMinLength(minLength) {
    if (typeof minLength !== 'number') throw new Error('minLength must be a number')

    this.validators.push((fieldName, value) => {
      return value?.length >= minLength
        ? true
        : getMessage('minLength', fieldName, minLength)
    })
    return this
  }

  validateMaxLength(maxLength) {
    if (typeof maxLength !== 'number') throw new Error('maxLength must be a number')

    this.validators.push((fieldName, value) => {
      return value.length <= maxLength
        ? true
        : getMessage('maxLength', fieldName, maxLength)
    })
    return this
  }

  validateOnlyNumbers() {
    this.validators.push((fieldName, value) => {
      const onlyNumbersRegex = /^\d+$/
      return onlyNumbersRegex.test(value) ? true : getMessage('onlyNumbers', fieldName)
    })
    return this
  }

  validateNotOnlyNumbers() {
    this.validators.push((fieldName, value) => {
      return /[^0-9]/.test(value) ? true : getMessage('notOnlyNumbers', fieldName)
    })
    return this
  }

  validateOnlyText() {
    this.validators.push((fieldName, value) => {
      const onlyTextRegex = /^[a-zA-Z]+( [a-zA-Z]+)*$/
      return onlyTextRegex.test(value) ? true : getMessage('onlyText', fieldName)
    })
    return this
  }

  validateNotOnlyText() {
    this.validators.push((fieldName, value) => {
      return /[^a-zA-Z ]/.test(value) ? true : getMessage('notOnlyText', fieldName)
    })
    return this
  }

  validatePostalCode() {
    this.validators.push((fieldName, value, t) => {
      return /[^a-zA-Z ]/.test(value)
        ? true
        : t?.('postel_code.invalid') || getMessage('postalCodeIncorrect', fieldName)
    })
    return this
  }

  validateOnlySymbols() {
    this.validators.push((fieldName, value) => {
      const onlySymbolsRegex = /^[^a-zA-Z0-9 ]+$/
      return onlySymbolsRegex.test(value) ? true : getMessage('onlySymbols', fieldName)
    })
    return this
  }

  validateNotOnlySymbols() {
    this.validators.push((fieldName, value) => {
      return /[a-zA-Z0-9]/.test(value)
        ? true
        : getMessage('notOnlySymbols', fieldName)
    })
    return this
  }

  validateAlphaNumeric() {
    this.validators.push((fieldName, value) => {
      return /[a-zA-Z]/.test(value) && /\d/.test(value)
        ? true
        : getMessage('alphaNumeric', fieldName)
    })
    return this
  }

  validateFaxNumber() {
    this.validators.push((fieldName, value) => {
      const faxRegex = /^\+?\d+$/
      return faxRegex.test(value) ? true : getMessage('onlyNumbers', fieldName)
    })
    return this
  }

  validateEmail() {
    this.validators.push((fieldName, value) => {
      const emailRegex =
        /^(?!.*\.\.)[a-zA-Z0-9](\.?[a-zA-Z0-9_%+-])*@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/
      return emailRegex.test(value) ? true : getMessage('invalidEmail', fieldName)
    })
    return this
  }

  validateNoSymbols() {
    this.validators.push((fieldName, value) => {
      const noSymbolsRegex = /^[a-zA-Z0-9 ]*$/
      return noSymbolsRegex.test(value) ? true : getMessage('noSymbols', fieldName)
    })
    return this
  }

  validateNoText() {
    this.validators.push((fieldName, value) => {
      const noTextRegex = /^[^a-zA-Z]+$/
      return noTextRegex.test(value) ? true : getMessage('noText', fieldName)
    })
    return this
  }

  validateNoNumbers() {
    this.validators.push((fieldName, value) => {
      const noNumbersRegex = /^[^0-9]+$/
      return noNumbersRegex.test(value) ? true : getMessage('noNumbers', fieldName)
    })
    return this
  }

  validateAtLeastOneCharacter() {
    this.validators.push((fieldName, value) => {
      const hasLetterRegex = /[a-zA-Z]/
      return hasLetterRegex.test(value)
        ? true
        : getMessage('atLeastOneCharacter', fieldName)
    })
    return this
  }

  validateAtLeastOneUppercase() {
    this.validators.push((fieldName, value) => {
      const hasUppercase = /[A-Z]/
      return hasUppercase.test(value)
        ? true
        : getMessage('atLeastOneUppercase', fieldName)
    })
    return this
  }

  validateAtLeastOneLowercase() {
    this.validators.push((fieldName, value) => {
      const hasLowercase = /[a-z]/
      return hasLowercase.test(value)
        ? true
        : getMessage('atLeastOneLowercase', fieldName)
    })
    return this
  }

  validateAtLeastOneSymbol() {
    this.validators.push((fieldName, value) => {
      const hasSymbolRegex = /[^a-zA-Z0-9 ]/
      return hasSymbolRegex.test(value)
        ? true
        : getMessage('atLeastOneSymbol', fieldName)
    })
    return this
  }

  validateAtLeastOneNumber() {
    this.validators.push((fieldName, value) => {
      const hasNumberRegex = /[0-9]/
      return hasNumberRegex.test(value)
        ? true
        : getMessage('atLeastOneNumber', fieldName)
    })
    return this
  }

  validateAlphanumericNoSymbols(allowSpace = false) {
    this.validators.push((fieldName, value) => {
      const regex = allowSpace ? /^[a-zA-Z0-9 ]*$/ : /^[a-zA-Z0-9]*$/;
      const spaceText = allowSpace ? (i18n.language === 'ar' ? 'والمسافات ' : 'and spaces ') : '';
      return regex.test(value)
        ? true
        : getMessage('alphanumericNoSymbols', fieldName, spaceText);
    })
    return this;
  }


  and() {
    const previousValidator = this.validators.pop()
    this.validators.push((fieldName, value) => {
      const result = previousValidator(fieldName, value)
      return result === true ? true : result
    })
    return this
  }

  or() {
    const previousValidator = this.validators.pop()
    this.validators.push((fieldName, value) => {
      const result = previousValidator(fieldName, value)
      return result === true ? true : true
    })
    return this
  }

  not() {
    const previousValidator = this.validators.pop()
    this.validators.push((fieldName, value) => {
      const result = previousValidator(fieldName, value)
      return result === true ? getMessage('cannotPassValidation', fieldName) : true
    })
    return this
  }

  build() {
    return (fieldName, value, t) => {
      for (const validate of this.validators) {
        const result = validate(fieldName, value, t)
        if (result !== true) {
          return result
        }
      }
      return true
    }
  }
}
