import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Generates a validator function for phone numbers based on the selected country code.
 * @param {() => string} getCountryCodeFn - Function that returns the current country code (e.g., '+91')
 * @returns {(value: string) => true | string}
 */
export const createPhoneValidator = (getCountryCodeFn) => {
  return (value) => {
    const countryCode = getCountryCodeFn(); // e.g., "+91"
    const cleaned = value.replace(/\D/g, '');
    const fullNumber = `+${countryCode.replace(/\D/g, '')}${cleaned}`; // Make sure we prepend '+'

    const phoneNumber = parsePhoneNumberFromString(fullNumber);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return 'Invalid phone number for selected country';
    }

    return true;
  };
};
