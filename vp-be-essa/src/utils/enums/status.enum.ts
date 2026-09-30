export enum StatusEnum {
  "Submitted for Review" = 1,
  "Under Review" = 2,
  "Under Approval" = 3,
  "Approved" = 4,
  "Rejected" = 5,
  "Paid" = 6,
  "Draft" = 7,
  "RESOLVED" = 8,
}

export enum ReconcileStatus {
  MISMATCH = 1,
  RECONCILED = 2,
}

export enum ReconcileStatusString {
  MISMATCH = "MISMATCH",
  RECONCILED = "RECONCILED",
}

export enum StatusCodeEnum {
  HTTP_OK = 200,
  HTTP_CREATED = 201,
  HTTP_BAD_REQUEST = 400,
  HTTP_UNAUTHORIZED = 401,
  HTTP_FORBIDDEN = 403,
  HTTP_NOT_FOUND = 404,
  HTTP_METHOD_NOT_ALLOWED = 405,
  HTTP_CONFLICT = 409,
  HTTP_GONE = 410,
  HTTP_LOCKED = 423,
  HTTP_TOO_MANY_REQUESTS = 429,
  HTTP_INTERNAL_SERVER_ERROR = 500,
}
