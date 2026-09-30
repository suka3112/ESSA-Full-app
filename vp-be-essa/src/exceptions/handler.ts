export class ExceptionErrors extends Error {
  constructor() {
    super();
  }

  static internalServerErr(req: any, err: any) {
    return "Something went wrong. Please try again " + err.message;
  }

  static unableToProcess(req: any) {
    return "unable to process request";
  }
}
