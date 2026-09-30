import Joi from "joi";

const createFAQHeaderSchema = Joi.object({
  title: Joi.string().required(),
});

const updateFAQHeaderSchema = Joi.object({
  title: Joi.string().required(),
});

const createFAQQuestionSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
  attachment_urls: Joi.array().items(Joi.string()).optional(),
  video_urls: Joi.array().items(Joi.string()).optional(),
});

const updateFAQQuestionSchema = Joi.object({
  question: Joi.string().required(),
  answer: Joi.string().required(),
  attachment_urls: Joi.array().items(Joi.string()).optional(),
  video_urls: Joi.array().items(Joi.string()).optional(),
});

export default {
  createFAQHeaderSchema,
  updateFAQHeaderSchema,
  createFAQQuestionSchema,
  updateFAQQuestionSchema,
};
