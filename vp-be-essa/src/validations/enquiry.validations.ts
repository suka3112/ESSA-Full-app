import Joi from "joi";

const createEnquirySchema = Joi.object({
  Enquiry_Type: Joi.string().required(),
  Assigned_Contact_Person: Joi.number().integer().required(),
  Subject: Joi.string().optional(),
  Enquiry_Description: Joi.string().required(),
  Attachment_Type: Joi.string().required(),
  Supporting_File: Joi.string().required(),
});

const getEnquirySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string())
    .optional(),
  status: Joi.number().integer().optional(),
  assignedPerson: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

const downloadEnquirySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  format: Joi.string().valid("csv", "xlsx").optional(),
});

const sendEnquirySchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});

export default {
  createEnquirySchema,
  getEnquirySchema,
  downloadEnquirySchema,
  sendEnquirySchema,
};
