import ResponseCode from "../responses/response";
import { ResponseStatus } from "../responses/code";
import { ExceptionErrors } from "../exceptions/handler";

import { ConsoleLog } from "../utils/consoleLog";

export class BaseController {
  public success: any;
  public errors: any;
  public status: any;
  public exceptions: any;
  public consolelogs: any;
  public customMsg: any;
  constructor() {
    // Method to send success response
    this.success = ResponseCode?.success;
    // Method to send error response
    this.errors = ResponseCode?.errors;
    // Status code
    this.status = ResponseStatus;
    // Success status message
    // Exception messages
    this.exceptions = ExceptionErrors;
    this.consolelogs = ConsoleLog;
  }
}
