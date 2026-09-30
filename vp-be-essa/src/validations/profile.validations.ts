import Joi from "joi";

const editVendorSchema = Joi.object({
  id: Joi.number().integer().required(),
  vendor_name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  street_and_house_number: Joi.string().trim().optional(),
  postel_code: Joi.number().integer().optional(),
  country_id: Joi.number().integer().required(),
  city_id: Joi.number().integer().required(),
  region_id: Joi.number().integer().optional(),
  phone_number: Joi.number().integer().required(),
  fax: Joi.number().integer().optional(),
  industry_type_id: Joi.number().integer().required(),
  industry_type_key: Joi.number().integer().optional(),
  wht_applicable: Joi.boolean().required(),
  wht_rate: Joi.number().positive().optional(),
  license_number: Joi.number().integer().optional(),
  license_expiry_date: Joi.number().integer().optional(),
  license_file: Joi.array().items(Joi.string()).optional(),
  national_id_number: Joi.number().integer().optional(),
  national_id_expiry_date: Joi.number().integer().optional(),
  national_file: Joi.array().items(Joi.string()).optional(),
  is_vat: Joi.boolean().required(),
  vat_number: Joi.number().integer().optional(),
  vat_group_name: Joi.string().trim().optional(),
  payment_terms: Joi.number().integer().optional(),
  creditnote_payment_terms: Joi.string().trim().optional(),
  incoterms: Joi.number().integer().optional(),
  incoterms_location: Joi.number().integer().optional(),
  vendor_register_id: Joi.number().integer().optional(),
  payment_by: Joi.string().trim().required(),
  bank_charge_indicator: Joi.string().trim().optional(),
  bank_name: Joi.string().trim().required(),
  bank_account_number: Joi.number().integer().required(),
  bank_account_currency: Joi.string().trim().required(),
  bank_country: Joi.string().trim().required(),
  bank_city: Joi.string().trim().required(),
  bank_postal: Joi.number().integer().optional(),
  swift_code: Joi.number().integer().optional(),
  invoice_currency: Joi.number().integer().required(),
  street_and_building_number: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .optional(),
});

const addSubUserSchema = Joi.object({
  vendor_register_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.valid(null))
    .required(),
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  role: Joi.string().trim().required(),
});

const addEntitySchema = Joi.object({
  vendor_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.valid(null))
    .required(),
  entity_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.valid(null))
    .required(),
  cr_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.valid(null))
    .required(),
  status: Joi.string().valid("submitted").required(),
});
export default { editVendorSchema, addSubUserSchema, addEntitySchema };
