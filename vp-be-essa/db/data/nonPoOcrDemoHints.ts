/**
 * Non-PO seed payload mapped from ocr-demo documentFieldSchemas + documentExtractionHints.
 * Keep in sync with epc-forked/ocr-demo when those hints change.
 */
export type NonPoFieldSeed = {
  fieldName: string;
  displayName: string;
  hint: string;
};

export type NonPoDocumentSeed = {
  documentCode: string;
  documentName: string;
  /** Enable for Non-PO testing by default */
  isEnabled: boolean;
  fields: NonPoFieldSeed[];
  /** Full ocr-demo document-level extraction rules appended under ## Document in prompt */
  documentRules?: string;
};

const INVOICE_RULES = `
Invoice OCR extraction rules:

General:
- Use OCR, embedded text layer, and layout analysis on the ENTIRE page.
- Support multilingual documents (e.g. Indonesian). Match labels by meaning.
- Never hallucinate values. Preserve exact printed values including thousand separators.
- For Non-PO invoices (travel, ticket, standalone invoices with no contract reference) set poNumber to null.

Travel / ticket agency invoices (e.g. Wisata Kawan):
- vendorName = issuing travel agency; serviceName = ticket/service line.
- Populate travel keys: passengerName, ticketClass, routeFrom, routeTo, confirmNo, ticketNo, airline, flightNo, routeCodeFrom, routeCodeTo.
- Extract EVERY invoice line-item row; mirror into lineItems.

Header keys: invNo, date, dueDate, vendorName, vendorAddress, vendorTaxId, buyerName, poNumber, serviceName, currency, subtotal, totalAmount, vatAmount, grandTotal, paymentTerms, bankName, bankBranch, bankAccountNumber, bankAccountName, authorizedSignatory.
`.trim();

const FAKTUR_RULES = `
Faktur Pajak / Indonesian tax invoice:
- taxInvoiceNumber — "Kode dan Nomor Seri Faktur Pajak" (15–17 digit e-Faktur serial). Do not confuse with commercial invoice number.
- date — signing / "Tempat dan Tanggal Ditandatangani" or QR stamp date.
- vatAmount — "Jumlah PPN (Pajak Pertambahan Nilai)".
`.trim();

const BERITA_ACARA_RULES = `
Work Progress Certificate / Berita Acara:
- Set documentType to "Berita Acara" or "Work Progress Certificate".
- Extract poNumber, periodStart, periodEnd, manhourPercentageCompletion, thisManhours.
- Extract approvalPrepared / approvalReviewed / approvalAcknowledged / approvalApproved when present.
- Extract serviceName and rolesOfManpower; manpower entry rows when printed.
`.trim();

function field(fieldName: string, label: string, aliases: string[] = []): NonPoFieldSeed {
  const aliasNote = aliases.length ? `Aliases: ${aliases.join(", ")}` : "";
  return {
    fieldName,
    displayName: label,
    hint: aliasNote,
  };
}

/** Documents under Non-PO that map to ocr-demo schemas/hints. */
export const NON_PO_OCR_DEMO_DOCUMENTS: NonPoDocumentSeed[] = [
  {
    documentCode: "INVOICE",
    documentName: "Invoice",
    isEnabled: true,
    documentRules: INVOICE_RULES,
    fields: [
      field("invNo", "Inv No", ["invoice no", "invoice number", "nomor invoice"]),
      field("date", "Date", ["tanggal", "invoice date"]),
      field("dueDate", "Due Date", ["jatuh tempo", "payment due"]),
      field("vendorName", "Vendor Name", ["seller", "supplier", "issued by"]),
      field("vendorAddress", "Vendor Address"),
      field("vendorTaxId", "Vendor Tax ID", ["npwp"]),
      field("buyerName", "Buyer Name", ["bill to", "customer"]),
      field("poNumber", "PO Number — null for Non-PO", ["contract order no"]),
      field("serviceName", "Service Name", ["activity name", "untuk pembayaran"]),
      field("passengerName", "Passenger Name", ["name", "nama penumpang"]),
      field("ticketClass", "Ticket Class"),
      field("routeFrom", "From"),
      field("routeTo", "To"),
      field("confirmNo", "Confirm No", ["pnr", "booking ref"]),
      field("ticketNo", "Ticket No"),
      field("airline", "Airline"),
      field("flightNo", "Flight No"),
      field("routeCodeFrom", "Route Code From"),
      field("routeCodeTo", "Route Code To"),
      field("currency", "Currency"),
      field("paymentTerms", "Payment Terms"),
      field("subtotal", "Subtotal"),
      field("totalAmount", "Total Amount"),
      field("vatAmount", "VAT Amount", ["ppn"]),
      field("grandTotal", "Grand Total"),
      field("bankName", "Bank Name"),
      field("bankBranch", "Bank Branch"),
      field("bankAccountNumber", "Bank Account Number"),
      field("bankAccountName", "Bank Account Name"),
      field("authorizedSignatory", "Authorized Signatory"),
      field(
        "invoiceLineItems",
        "Line items array",
        ["description", "quantity", "unitPrice", "amount", "travel keys"],
      ),
    ],
  },
  {
    documentCode: "TAX_INVOICE",
    documentName: "Tax Invoice",
    isEnabled: true,
    documentRules: FAKTUR_RULES,
    fields: [
      field("taxInvoiceNumber", "Tax Invoice Number", [
        "kode dan nomor seri faktur pajak",
        "nomor faktur pajak",
      ]),
      field("date", "Tax Invoice Date", [
        "tempat dan tanggal ditandatangani",
        "tanggal faktur",
      ]),
      field("vatAmount", "VAT Amount", ["jumlah ppn", "ppn"]),
    ],
  },
  {
    documentCode: "BERITA_ACARA",
    documentName: "Work Progress Certificate (Berita Acara)",
    isEnabled: true,
    documentRules: BERITA_ACARA_RULES,
    fields: [
      field("poNumber", "PO Number"),
      field("periodStart", "Period Start"),
      field("periodEnd", "Period End"),
      field("manhourPercentageCompletion", "Manhour percentage completion"),
      field("thisManhours", "This Man Hours"),
      field("approvalPrepared", "Approval - Prepared"),
      field("approvalReviewed", "Approval - Reviewed"),
      field("approvalAcknowledged", "Approval - Acknowledged"),
      field("approvalApproved", "Approval - Approved"),
      field("serviceName", "Service Name"),
      field("rolesOfManpower", "Roles of Manpower"),
      field("manpower", "Manpower entry rows (role, name)"),
    ],
  },
  // Remaining Non-PO catalog docs — present but disabled until ocr-demo schemas exist
  {
    documentCode: "LISTING_INVOICES",
    documentName: "Listing Invoices (If any)",
    isEnabled: false,
    fields: [],
  },
  {
    documentCode: "UNDERLYING_CONTRACT",
    documentName: "Underlying Contract",
    isEnabled: false,
    fields: [],
  },
  {
    documentCode: "GUARANTEE_LETTER",
    documentName: "Guarantee Letter (If any)",
    isEnabled: false,
    fields: [],
  },
  {
    documentCode: "ROOM_RESERVATION_FORM",
    documentName: "Room Reservation Form (If any)",
    isEnabled: false,
    fields: [],
  },
];

export function enrichPromptWithDocumentRules(
  basePrompt: string,
  docs: Array<{ name: string; rules?: string }>,
): string {
  let prompt = basePrompt;
  for (const doc of docs) {
    if (!doc.rules?.trim()) continue;
    const heading = `## ${doc.name}`;
    const idx = prompt.indexOf(heading);
    if (idx < 0) continue;
    const insertAt = idx + heading.length;
    const block = `\n\nDocument-specific extraction rules:\n${doc.rules.trim()}\n`;
    // Insert after heading line, before field bullets
    prompt = `${prompt.slice(0, insertAt)}${block}${prompt.slice(insertAt)}`;
  }
  return prompt;
}
