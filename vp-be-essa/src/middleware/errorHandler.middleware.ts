import { Request, Response, NextFunction } from "express";
import { APIError } from "../utils/apiError.utils";

const ErrorHandler = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const errMsg = err?.message || "Something went wrong";
  let errStatus = 500;
  if (err instanceof APIError) {
    errStatus = err?.statusCode;
  }

  res?.status(errStatus).json({
    type: "E",
    status: errStatus,
    message: errMsg,
  });
  return;
};

export default ErrorHandler;
