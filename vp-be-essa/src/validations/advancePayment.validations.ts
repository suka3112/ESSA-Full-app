import Joi from "joi";

const createAdvancePaymentSchema = Joi.object({
  type_of_invoice: Joi.number().valid(1, 2).required(),
  value: Joi.number().positive().required(),
  currency: Joi.string().trim().uppercase().required(),
  attachment_type: Joi.string().optional(),
  payment_files: Joi.array()
    .items(
      Joi.object({
        file: Joi.string().required(),
        attachment_type: Joi.string().required(),
      }),
    )
    .optional(),
  invoices: Joi.array().items(
    Joi.object({
      header_id: Joi.number().required(),
      inv_number: Joi.string().required(),
    }),
  ),
  submission_date: Joi.date().iso().required(),
  status: Joi.number().integer().default(1),
  cost_responsible: Joi.number().integer().positive().required(),
});

const updateAdvancePaymentSchema = Joi.object({
  value_of_advance_payment: Joi.number().positive().optional(),
  currency: Joi.string().optional(),
  attachment_type: Joi.string().optional(),
  status: Joi.number().integer().default(1),
  payment_files: Joi.array()
    .items(
      Joi.object({
        file: Joi.string().required(),
        attachment_type: Joi.string().required(),
      }),
    )
    .optional(),
});

const getAdvancePaymentsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  search: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  status: Joi.number().integer().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

const getAdvancePaymentsForCSVSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  format: Joi.string().valid("csv", "xlsx").optional(),
});

const sendAdvancePaymentReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
});

export default {
  createAdvancePaymentSchema,
  updateAdvancePaymentSchema,
  getAdvancePaymentsSchema,
  getAdvancePaymentsForCSVSchema,
  sendAdvancePaymentReportSchema,
};
