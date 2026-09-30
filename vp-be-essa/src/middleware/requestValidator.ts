import Joi from "joi";
import Response from "../responses/response";

const validationOptions = {
  abortEarly: false, // abort after the last validation error
  allowUnknown: true, // allow unknown keys that will be ignored
  stripUnknown: true, // remove unknown keys from the validated data
};

export class RequestValidator {
  static checkValidate(_schema: Joi.ObjectSchema<any>) {
    return (req: any, res: any, next: any) => {
      let reqType = req?.body;

      if (req.method === "GET") {
        reqType = req?.query;
      }

      if (_schema) {
        let joiValidation = _schema?.validate(reqType, validationOptions);

        if (joiValidation?.error) {
          return Response?.joierrors(req, res, joiValidation?.error);
        }

        next();
      }
    };
  }
}
