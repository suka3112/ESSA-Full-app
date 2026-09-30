export class APIError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;

    // Set the prototype explicitly for extending built-in classes
    Object.setPrototypeOf(this, APIError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
