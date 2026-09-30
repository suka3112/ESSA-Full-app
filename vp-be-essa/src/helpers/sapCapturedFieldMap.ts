/**
 * Map SAP CapturedFieldCode → common extraction FieldName candidates.
 * Shared by invoice-config seed and SAP field-mapping mock validation.
 */
export const CAPTURED_TO_FIELD_NAMES: Record<string, string[]> = {
  INV_NO: ["invNo", "invoiceNumber", "invoiceNo"],
  INV_DATE: ["invDate", "invoiceDate"],
  VENDOR_CODE: ["vendorCode", "vendorNo"],
  VENDOR_NAME: ["vendorName"],
  PO_NUMBER: ["poNumber", "poNo"],
  CURRENCY: ["currency"],
  GROSS_AMT: ["grossAmount", "totalAmount", "grandTotal"],
  TAX_AMT: ["taxAmount", "vatAmount"],
  NET_AMT: ["netAmount", "subtotal"],
  DUE_DATE: ["dueDate"],
  TAX_CODE: ["taxCode"],
  COMPANY_CODE: ["companyCode"],
  COST_CENTER: ["costCenter"],
  GL_ACCOUNT: ["glAccount"],
  PAYMENT_TERM: ["paymentTerm", "paymentTerms"],
  BANK_ACCOUNT: ["bankAccount", "bankAccountNumber"],
  BANK_KEY: ["bankKey", "bankCode"],
  WHT_AMT: ["whtAmount", "withholdingTax"],
  SES_NO: ["sesNo", "sesNumber"],
};

export function fieldNameCandidatesForCapturedCode(
  capturedFieldCode: string,
): string[] {
  const code = String(capturedFieldCode || "").trim().toUpperCase();
  return (
    CAPTURED_TO_FIELD_NAMES[code] || [capturedFieldCode, capturedFieldCode.toLowerCase()]
  );
}
