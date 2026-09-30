import Joi from "joi";

export const registerVendorSchema = Joi.object({
    entity_user_id: Joi.number().integer().required(),
    vendor_name: Joi.string().max(255).required(),
    email: Joi.string().email().required(),
    street_and_house_number: Joi.string().max(255).required(),
    postel_code: Joi.number().integer().required(),
    country_id: Joi.number().integer().required(),
    city_id: Joi.number().integer().required(),
    region_id: Joi.number().integer().required(),
    phone_number: Joi.string()
        .pattern(/^[0-9]+$/)
        .max(15)
        .required(),
    fax: Joi.number().integer().required(),
    industry_type_id: Joi.number().integer().required(),
    industry_type_key: Joi.number().integer().required(),
    wht_applicable: Joi.boolean().required(),
    wht_rate: Joi.number().integer().required(),
    license_number: Joi.number().integer().required(),
    license_expiry_date: Joi.date().iso().required(),
    license_file: Joi.array().items(Joi.string().uri()).required(),
    national_id_number: Joi.number().integer().required(),
    national_id_expiry_date: Joi.date().iso().required(),
    national_file: Joi.array().items(Joi.string().uri()).required(),
    is_vat: Joi.boolean().required(),
    vat_number: Joi.number().integer().required(),
    vat_group_name: Joi.string().max(255).required(),
    payment_terms: Joi.number().integer().required(),
    creditnote_payment_terms: Joi.string().max(255).required(),
    incoterms: Joi.number().integer().required(),
    incoterms_location: Joi.number().integer().required(),
    entity_id: Joi.number().integer().required(),
    vendor_register_id: Joi.number().integer().required(),
    payment_by: Joi.string().max(50).required(),
    bank_charge_indicator: Joi.string().max(10).required(),
    bank_name: Joi.string().max(255).required(),
    bank_account_number: Joi.number().integer().required(),
    bank_account_currency: Joi.string().max(10).required(),
    bank_country: Joi.string().max(100).required(),
    bank_city: Joi.string().max(100).required(),
    bank_postal: Joi.number().integer().required(),
    swift_code: Joi.number().integer().required(),
    invoice_currency: Joi.number().integer().required(),
    street_and_building_number: Joi.number().integer().required(),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(255).required(),
});

export const inviteVendorSchema = Joi.object({
    vendor_name: Joi.string().min(3).max(255).required(),
    vendor_email: Joi.string().email().required(),
    entity_id: Joi.number().integer().positive().required(),
    cr_person_id: Joi.number().integer().positive().required(),
});

export const trackMyApplicationSchema = Joi.object({
    reference_number: Joi.string().max(100).required(),
    license_number: Joi.string().max(100).required(),
    vendor_name: Joi.string().min(3).max(255).required(),
});

export default {
    registerVendorSchema,
    loginSchema,
    inviteVendorSchema,
    trackMyApplicationSchema,
};
