import { slugifyCategoryId } from "./categoryUtils.js";

/**
 * Canonical ESSA document field schemas.
 * Frontend can rely on `documents[].fields` keys and `documents[].entries` shapes
 * being identical for every upload of the same document type.
 */
export const SCHEMA_VERSION = "1.0";

/**
 * Fixed ESSA document types for PDF classification (letters A–K, no J).
 * categoryId values are the only allowed classification outputs besides "unclassified".
 */
export const CLASSIFICATION_CATEGORIES = [
  {
    categoryId: "invoice",
    typeCode: "A",
    categoryLabel: "A. Invoice",
    identifiers:
      "Commercial invoice titled INVOICE (large heading). Inv No like 568/PT.ALE-PAU/04/2026, Date, Payment Terms, claim line-item table, VAT, Grand Total, bank details. One page near the start. Not a Kwitansi and not a Faktur Pajak.",
  },
  {
    categoryId: "faktur_pajak",
    typeCode: "B",
    categoryLabel: "B. Tax Invoice (VAT)",
    identifiers:
      "Indonesian Faktur Pajak / e-Faktur: DJP logo, QR code, 'Kode dan Nomor Seri Faktur Pajak'. DPP and PPN boxes. Not the commercial invoice and not a kwitansi.",
  },
  {
    categoryId: "notice",
    typeCode: "C",
    categoryLabel: "C. Notice",
    identifiers:
      "Payment receipt titled KWITANSI / Receipt. Sudah Terima Dari, Untuk Pembayaran, amount in words, received stamp. Usually page 1. Do not classify as invoice even when PO and amount match.",
  },
  {
    categoryId: "berita_acara",
    typeCode: "D",
    categoryLabel: "D. Work Progress Certificate (Berita Acara)",
    identifiers:
      "Page titled Berita Acara / Work Progress Certificate / BAP, or a 4-block Prepared / Reviewed / Acknowledged / Approved grid. A PO number, period, or manhours on an invoice or summary is not enough. Do not invent this type when the title is missing.",
  },
  {
    categoryId: "summary_calculation_manhour",
    typeCode: "E",
    categoryLabel: "E. Summary Calculation Manhour",
    identifiers:
      "Summary of Claim / Summary Calculation Manhour / Nth Claim tables: worker names, Regular/Overtime hours, contract value, previous vs this-period claim. Multi-page tables after Berita Acara. NOT an invoice.",
  },
  {
    categoryId: "daily_timesheet",
    typeCode: "F",
    categoryLabel: "F. Daily Time Sheet",
    identifiers:
      "Landscape DAILY TIME SHEET grid: Date, IN/OUT, Sign Workers, Daily Activity, Approved by. A PO number in the header does NOT make this a purchase order. Most pages in a manpower bundle are this type.",
  },
  {
    categoryId: "daily_attendance",
    typeCode: "G",
    categoryLabel: "G. Daily Attendance (Biometrics)",
    identifiers:
      "Biometric log screenshot: Face Finger, Fabrication Report, or authentication log with Date, Username, Event (check-in/out, 1:N face), device id. Interleaved with timesheets. Not a daily time sheet.",
  },
  {
    categoryId: "purchase_order",
    typeCode: "H",
    categoryLabel: "H. PO",
    identifiers:
      "Formal PURCHASE ORDER cover page: title PURCHASE ORDER, PO Number, PO Date, vendor. Requisition No is optional. Usually one scanned page immediately before Appendix - 1. Not a timesheet and not a PO appendix.",
  },
  {
    categoryId: "purchase_order_appendix",
    typeCode: "I",
    categoryLabel: "I. PO Appendix",
    identifiers:
      "Pages headed Appendix - 1/2/3, PRICE BREAKDOWN AND DESCRIPTION OF PURCHASE ORDER, SPECIFIC/SPECIAL TERMS, or GENERAL TERMS & CONDITIONS. Often the last 8–12 pages. Repeating PO Number/PO Date still means appendix, not the SAP PO cover.",
  },
  {
    categoryId: "service_entry_sheet",
    typeCode: "K",
    categoryLabel: "K. Service Entry Sheet (SES)",
    identifiers:
      "Service Entry Sheet (SES) with header info and quantity",
  },
];

/** @type {Record<string, string>} */
export const CATEGORY_TO_SCHEMA = {
  notice: "notice",
  kwitansi: "notice",
  receipt: "notice",
  payment_notice: "notice",
  invoice: "invoice",
  tax_invoice: "faktur_pajak",
  faktur_pajak: "faktur_pajak",
  berita_acara: "berita_acara",
  work_progress_certificate: "berita_acara",
  summary_calculation_manhour: "summary_calculation_manhour",
  summary_calculation: "summary_calculation_manhour",
  summary_calculation_manhour_claim: "summary_calculation_manhour",
  summary_calculation_overtime_claim: "summary_calculation_manhour",
  daily_timesheet: "daily_timesheet",
  daily_time_sheet: "daily_timesheet",
  timesheet: "daily_timesheet",
  face_finger: "daily_attendance",
  fabrication_report: "daily_attendance",
  attendance_sheet: "daily_attendance",
  daily_attendance: "daily_attendance",
  purchase_order: "purchase_order",
  po: "purchase_order",
  purchase_order_appendix: "purchase_order_appendix",
  purchase_order_terms: "purchase_order_appendix",
  po_appendix: "purchase_order_appendix",
  service_entry_sheet: "service_entry_sheet",
  ses: "service_entry_sheet",
};

/**
 * @typedef {{ key: string, label: string, aliases?: string[] }} ScalarFieldDef
 * @typedef {{ key: string, label: string, fields: ScalarFieldDef[] }} EntryFieldDef
 */

/** @type {Record<string, { typeCode: string, typeLabel: string, fields: ScalarFieldDef[], entries?: EntryFieldDef }>} */
export const DOCUMENT_SCHEMAS = {
  invoice: {
    typeCode: "A",
    typeLabel: "A. Invoice",
    fields: [
      { key: "invNo", label: "Inv No", aliases: ["invoice no", "invoice number", "inv no", "nomor invoice", "no invoice", "invoiceno", "invoice no."] },
      { key: "date", label: "Date", aliases: ["tanggal", "invoice date", "invoice date:", "date:"] },
      { key: "dueDate", label: "Due Date", aliases: ["due date", "jatuh tempo", "tanggal jatuh tempo", "payment due"] },
      { key: "vendorName", label: "Vendor Name", aliases: ["vendor", "seller", "supplier", "issued by", "dari", "penjual"] },
      { key: "vendorAddress", label: "Vendor Address", aliases: ["vendor address", "seller address", "alamat penjual", "address"] },
      { key: "vendorTaxId", label: "Vendor Tax ID", aliases: ["vendor tax id", "npwp", "tax id", "npwp penjual"] },
      { key: "buyerName", label: "Buyer Name", aliases: ["buyer", "bill to", "customer", "pembeli", "kepada"] },
      { key: "poNumber", label: "PO Number", aliases: ["po no", "po number", "contract order no", "contract order"] },
      { key: "serviceName", label: "Service Name (Activity Name)", aliases: ["service", "activity name", "nama jasa", "untuk pembayaran", "pekerjaan"] },
      { key: "passengerName", label: "Name", aliases: ["passenger name", "name", "nama", "nama penumpang", "passenger", "guest name"] },
      { key: "ticketClass", label: "Ticket Class", aliases: ["ticket class", "class", "kelas", "booking class", "cabin class"] },
      { key: "routeFrom", label: "From", aliases: ["from", "departure", "berangkat", "asal", "origin"] },
      { key: "routeTo", label: "To", aliases: ["to", "destination", "tujuan", "arrival"] },
      { key: "confirmNo", label: "Confirm No", aliases: ["confirm no", "confirmation no", "booking ref", "pnr", "no konfirmasi", "booking reference"] },
      { key: "ticketNo", label: "Ticket No", aliases: ["ticket no", "ticket number", "e-ticket", "nomor tiket", "eticket"] },
      { key: "airline", label: "Airline", aliases: ["airline", "maskapai", "carrier", "airline confirm no"] },
      { key: "flightNo", label: "Flight No", aliases: ["flight no", "flight", "flight number", "no penerbangan", "flight number"] },
      { key: "routeCodeFrom", label: "Route Code From", aliases: ["route code from", "from code", "kode asal", "departure code"] },
      { key: "routeCodeTo", label: "Route Code To", aliases: ["route code to", "to code", "kode tujuan", "arrival code"] },
      { key: "currency", label: "Currency", aliases: ["curr", "mata uang", "idr", "rp"] },
      { key: "paymentTerms", label: "Payment Terms", aliases: ["payment term", "paymentterm", "terms of payment", "syarat pembayaran"] },
      { key: "manhourUnitRate", label: "Manhour Unit Rate", aliases: ["unit rate", "manhour rate", "rate per manhour", "rate/mh", "harga satuan", "tarif"] },
      { key: "calculation", label: "Calculation", aliases: ["calculation details", "perhitungan"] },
      { key: "subtotal", label: "Subtotal", aliases: ["sub total", "sub-total", "total before tax", "jumlah sebelum pajak"] },
      { key: "totalAmount", label: "Total Amount", aliases: ["total", "jumlah", "net total"] },
      { key: "vatAmount", label: "VAT Amount", aliases: ["vat", "vat 10%", "vat 11%", "ppn", "pajak", "tax amount", "tax"] },
      { key: "grandTotal", label: "Grand Total", aliases: ["grand total", "amount due", "total invoice", "grandtotal", "total payable"] },
      { key: "contractValue", label: "Contract Value", aliases: ["original contract", "contract amount", "nilai kontrak"] },
      { key: "contractNumber", label: "Contract Number", aliases: ["contract no", "nomor kontrak", "agreement no"] },
      { key: "ourRef", label: "Our Ref", aliases: ["our reference", "our ref.", "ref"] },
      { key: "projectName", label: "Project Name", aliases: ["project", "nama proyek", "project title"] },
      { key: "progressDescription", label: "Progress Description", aliases: ["progress", "claim", "progress 2"] },
      { key: "thisPeriodWorkValue", label: "This Period Work Value", aliases: ["work to carried out", "current claim", "this period"] },
      { key: "thisPeriodProgressPct", label: "This Period Progress %", aliases: ["this period %", "current %", "progress this period"] },
      { key: "previousPayment", label: "Previous Payment", aliases: ["less sums previously", "previous payment", "pembayaran sebelumnya"] },
      { key: "previousProgressPct", label: "Previous Progress %", aliases: ["previous period %", "previous %"] },
      { key: "advancePaymentRecovery", label: "Advance Payment Recovery", aliases: ["dp recovery", "down payment", "uang muka"] },
      { key: "retention", label: "Retention", aliases: ["retensi", "retention amount"] },
      { key: "retentionPct", label: "Retention %", aliases: ["retention percent", "retensi %"] },
      { key: "totalValueOfWorksDue", label: "Total Value of Works Due", aliases: ["works due this claim", "total value of works"] },
      { key: "amountInWords", label: "Amount in Words", aliases: ["terbilang", "in words"] },
      { key: "bankName", label: "Bank Name", aliases: ["bank", "nama bank", "bank name", "bank address"] },
      { key: "bankBranch", label: "Bank Branch", aliases: ["branch", "cabang", "bank branch", "cabang bank"] },
      { key: "bankAccountNumber", label: "Bank Account Number", aliases: ["account number", "no rekening", "rekening", "nomor rekening", "bank account no", "bank account", "a/c no", "ac no"] },
      { key: "bankAccountName", label: "Bank Account Name", aliases: ["account name", "account holder", "atas nama", "beneficiary", "nama rekening", "nama pemilik rekening"] },
      { key: "authorizedSignatory", label: "Authorized Signatory", aliases: ["signatory", "authorized by", "signature", "director", "penandatangan", "penandatangan sah"] },
      { key: "rolesOfManpower", label: "Roles of Manpower", aliases: ["manpower roles", "position", "role", "jabatan"] },
    ],
    entries: {
      key: "invoiceLineItems",
      label: "Invoice Line Items",
      mirrorLineItems: true,
      fields: [
        { key: "description", label: "Description", aliases: ["item", "claim", "uraian", "description of goods", "keterangan"] },
        { key: "passengerName", label: "Name", aliases: ["passenger name", "name", "nama", "nama penumpang", "passenger"] },
        { key: "ticketClass", label: "Ticket Class", aliases: ["ticket class", "class", "kelas", "booking class"] },
        { key: "routeFrom", label: "From", aliases: ["from", "departure", "berangkat", "asal"] },
        { key: "routeTo", label: "To", aliases: ["to", "destination", "tujuan"] },
        { key: "routing", label: "Routing", aliases: ["route", "routing", "rute"] },
        { key: "confirmNo", label: "Confirm No", aliases: ["confirm no", "confirmation no", "booking ref", "pnr", "no konfirmasi"] },
        { key: "ticketNo", label: "Ticket No", aliases: ["ticket no", "ticket number", "e-ticket", "nomor tiket"] },
        { key: "airline", label: "Airline", aliases: ["airline", "maskapai", "carrier"] },
        { key: "flightNo", label: "Flight No", aliases: ["flight no", "flight", "flight number", "no penerbangan"] },
        { key: "routeCodeFrom", label: "Route Code From", aliases: ["route code from", "from code", "kode asal"] },
        { key: "routeCodeTo", label: "Route Code To", aliases: ["route code to", "to code", "kode tujuan"] },
        { key: "role", label: "Role", aliases: ["position", "jabatan", "trade", "posisi", "role of manpower"] },
        { key: "quantity", label: "Quantity", aliases: ["qty", "jumlah", "q'ty"] },
        { key: "unit", label: "Unit", aliases: ["uom", "satuan", "unit of measure"] },
        { key: "unitPrice", label: "Unit Price", aliases: ["unit price", "rate", "harga satuan", "price"] },
        { key: "amount", label: "Amount", aliases: ["amount idr", "amount (idr)", "total", "jumlah", "nilai"] },
      ],
    },
  },
  faktur_pajak: {
    typeCode: "B",
    typeLabel: "B. Tax Invoice (VAT)",
    fields: [
      { key: "taxInvoiceNumber", label: "Tax Invoice Number", aliases: ["kode dan nomor seri faktur pajak", "nomor faktur pajak", "faktur pajak no", "tax invoice no"] },
      { key: "date", label: "Tax Invoice Date", aliases: ["tanggal", "tanggal faktur", "tanggal faktur pajak", "tempat dan tanggal ditandatangani", "signing date", "tax invoice date", "date"] },
      { key: "vatAmount", label: "VAT Amount", aliases: ["ppn", "vat", "pajak pertambahan nilai", "jumlah ppn"] },
    ],
  },
  notice: {
    typeCode: "C",
    typeLabel: "C. Notice",
    fields: [
      { key: "taxInvoiceNumber", label: "Tax Invoice Number", aliases: ["nomor faktur pajak", "faktur pajak no", "tax invoice no", "no faktur pajak", "kode dan nomor seri faktur pajak"] },
      { key: "date", label: "Date", aliases: ["tanggal"] },
      { key: "vatAmount", label: "VAT Amount", aliases: ["ppn", "vat", "pajak pertambahan nilai", "jumlah ppn", "vat amount"] },
    ],
  },
  berita_acara: {
    typeCode: "D",
    typeLabel: "D. Work Progress Certificate (Berita Acara)",
    fields: [
      { key: "poNumber", label: "PO Number", aliases: ["po no", "purchase order", "nomor po", "no po"] },
      { key: "periodStart", label: "Period Start", aliases: ["period from", "start date", "dari tanggal", "periode mulai"] },
      { key: "periodEnd", label: "Period End", aliases: ["period to", "end date", "sampai tanggal", "periode akhir"] },
      { key: "manhourPercentageCompletion", label: "Manhour percentage completion", aliases: ["percentage completion", "progress", "persentase", "% completion", "manhour completion", "this period"] },
      { key: "thisManhours", label: "This Man Hours", aliases: ["this man hours", "this period manhour", "this period manhours", "man hours this period", "jam kerja periode ini"] },
      { key: "approvalPrepared", label: "Approval - Prepared", aliases: ["prepared by", "prepared", "disiapkan"] },
      { key: "approvalReviewed", label: "Approval - Reviewed", aliases: ["reviewed by", "reviewed", "ditinjau"] },
      { key: "approvalAcknowledged", label: "Approval - Acknowledged", aliases: ["acknowledged by", "acknowledged", "diakui"] },
      { key: "approvalApproved", label: "Approval - Approved", aliases: ["approved by", "approved", "disetujui"] },
      { key: "serviceName", label: "Service Name", aliases: ["service", "activity name", "nama jasa", "pekerjaan"] },
      { key: "rolesOfManpower", label: "Roles of Manpower", aliases: ["manpower roles", "position", "role"] },
      { key: "certificateNumber", label: "Certificate Number", aliases: ["certificate no", "nomor berita acara", "ba no"] },
      { key: "contractNumber", label: "Contract Number", aliases: ["contract no", "nomor kontrak"] },
      { key: "workPackage", label: "Work Package", aliases: ["str", "ars", "mep", "paket pekerjaan"] },
      { key: "contractDate", label: "Contract Date", aliases: ["tanggal kontrak"] },
      { key: "workLocation", label: "Work Location", aliases: ["location", "lokasi", "site"] },
      { key: "previousPeriodProgress", label: "Previous Period Progress %", aliases: ["previous period", "previous %"] },
      { key: "thisPeriodProgress", label: "This Period Progress %", aliases: ["this period", "this period %"] },
      { key: "cumulativeProgress", label: "Cumulative Progress %", aliases: ["cumulative", "kumulatif"] },
    ],
    entries: {
      key: "manpower",
      label: "Manpower",
      fields: [
        { key: "role", label: "Role", aliases: ["position", "jabatan", "role of manpower"] },
        { key: "name", label: "Name of Manpower", aliases: ["nama", "name", "worker name"] },
      ],
    },
  },
  summary_calculation_manhour: {
    typeCode: "E",
    typeLabel: "E. Summary Calculation Manhour",
    fields: [],
    entries: {
      key: "manhourSummary",
      label: "Manhour Summary",
      fields: [
        { key: "name", label: "Name of Manpower", aliases: ["nama", "name", "worker name", "manpower", "namer"] },
        { key: "role", label: "Roles of Manpower", aliases: ["position", "role", "jabatan", "trade"] },
        { key: "regularManhour", label: "Regular Manhour", aliases: ["regular", "man-month", "man month", "regular hours", "manhour", "actual mhr", "regular mh", "column b"] },
        { key: "overtimeManhour", label: "Overtime Manhour", aliases: ["overtime", "overtime hour", "ot hours", "lembur", "total ot", "ot total"] },
        { key: "overtimeMondaySaturdayManhour", label: "Overtime Mon-Sat", aliases: ["overtime monday saturday", "ot mon-sat", "column c", "ot weekday"] },
        { key: "overtimeSundayHolidayManhour", label: "Overtime Sun/PH", aliases: ["overtime sunday", "ot sun", "public holiday", "column d", "ot sun/ph"] },
        { key: "unitPrice", label: "Unit Price / Hour", aliases: ["unit price per hour", "unit price / hour", "rate", "unit rate", "harga per jam", "unitpriceperhour", "hourly rate"] },
        { key: "regularAmount", label: "Regular Amount", aliases: ["amount mhr", "regular amount", "amount regular"] },
        { key: "overtimeAmount", label: "Overtime Amount", aliases: ["amount ot", "overtime amount"] },
      ],
    },
  },
  daily_timesheet: {
    typeCode: "F",
    typeLabel: "F. Daily Time Sheet",
    fields: [],
    entries: {
      key: "timesheetEntries",
      label: "Daily Time Sheet Entries",
      fields: [
        { key: "date", label: "Date", aliases: ["tanggal"] },
        { key: "username", label: "Username", aliases: ["name", "nama", "employee", "worker", "id no", "nik"] },
        { key: "regularManhour", label: "Regular Manhour", aliases: ["regular", "regular hours", "normal hours", "manhour"] },
        { key: "overtimeManhour", label: "Overtime Manhour", aliases: ["overtime", "ot", "lembur", "overtime hours"] },
        { key: "role", label: "Roles of Manpower", aliases: ["position", "role", "jabatan"] },
        { key: "name", label: "Name of Manpower", aliases: ["nama", "worker name", "employee name"] },
      ],
    },
  },
  daily_attendance: {
    typeCode: "G",
    typeLabel: "G. Daily Attendance (Biometrics)",
    fields: [],
    entries: {
      key: "attendanceEntries",
      label: "Attendance Entries",
      fields: [
        { key: "date", label: "Date", aliases: ["tanggal"] },
        { key: "username", label: "Username", aliases: ["name", "nama", "nik", "description", "employee"] },
        { key: "event", label: "Event", aliases: ["status", "remarks", "time", "in out", "check in", "check out"] },
      ],
    },
  },
  purchase_order: {
    typeCode: "H",
    typeLabel: "H. PO",
    fields: [
      { key: "poNumber", label: "PO Number", aliases: ["po no", "po number", "purchase order", "nomor po", "no po", "sap po"] },
      { key: "poDate", label: "PO Date", aliases: ["date", "tanggal po"] },
      { key: "vendorName", label: "Vendor", aliases: ["to", "kepada", "supplier", "vendor"] },
      { key: "vendorCode", label: "Vendor Code", aliases: ["vendor code", "kode vendor", "vendor no", "kode pemasok"] },
      { key: "buyerName", label: "Buyer", aliases: ["from", "buyer", "issued by", "company", "buyer name"] },
      { key: "projectName", label: "Project", aliases: ["project", "project name", "nama proyek", "project code"] },
      { key: "description", label: "Description", aliases: ["item description", "scope of work", "uraian"] },
      { key: "deliveryDate", label: "Delivery Date", aliases: ["delivery", "end date", "tanggal pengiriman", "due date"] },
      { key: "paymentTerms", label: "Payment Terms", aliases: ["payment terms", "terms of payment", "syarat pembayaran", "cara pembayaran"] },
      { key: "incoterms", label: "Incoterms", aliases: ["delivery terms", "incoterms", "syarat pengiriman", "terms"] },
      { key: "totalAmount", label: "Total Amount", aliases: ["total", "total price", "grand total", "po value", "total amount", "jumlah", "total jumlah"] },
      { key: "currency", label: "Currency", aliases: ["currency", "mata uang"] },
      { key: "poHeaderInformation", label: "PO Header Information", aliases: ["header info", "header"] },
    ],
    entries: {
      key: "poLineItems",
      label: "PO Line Items",
      fields: [
        { key: "no", label: "No", aliases: ["line no", "item no"] },
        { key: "description", label: "Description", aliases: ["item", "uraian"] },
        { key: "qty", label: "Qty", aliases: ["quantity", "jumlah"] },
        { key: "uom", label: "UOM", aliases: ["unit", "satuan"] },
        { key: "unitPrice", label: "Unit Price", aliases: ["unit price", "harga satuan"] },
        { key: "amount", label: "Amount", aliases: ["total price", "amount", "total amount"] },
        { key: "deliveryDate", label: "Delivery Date", aliases: ["end date", "delivery"] },
      ],
    },
  },
  purchase_order_appendix: {
    typeCode: "I",
    typeLabel: "I. PO Appendix",
    fields: [
      { key: "poHeaderInformation", label: "PO Header Information", aliases: ["po number", "po no", "header"] },
    ],
    entries: {
      key: "appendixItems",
      label: "PO Appendix Items",
      fields: [
        { key: "description", label: "Description", aliases: ["item", "uraian"] },
        { key: "unitPrice", label: "Unit Price", aliases: ["price", "rate", "harga satuan"] },
        { key: "qty", label: "Qty", aliases: ["quantity", "jumlah"] },
        { key: "uom", label: "UOM", aliases: ["unit", "satuan"] },
        { key: "amount", label: "Amount", aliases: ["total", "jumlah"] },
        { key: "roleOfManpower", label: "Role of Manpower", aliases: ["role", "position", "jabatan", "manpower role"] },
      ],
    },
  },
  transmittal: {
    typeCode: "L",
    typeLabel: "L. Transmittal",
    fields: [
      { key: "date", label: "Date", aliases: ["tanggal"] },
      { key: "vendorName", label: "From Company", aliases: ["from", "sender"] },
      { key: "buyerName", label: "To Company", aliases: ["to", "kepada"] },
      { key: "attention", label: "Attention", aliases: ["attn", "up"] },
      { key: "fromName", label: "From Person", aliases: ["from"] },
      { key: "purpose", label: "Sent For", aliases: ["this is sent for", "your file"] },
      { key: "invNo", label: "Enclosed Invoice No", aliases: ["inv no", "invoice no"] },
      { key: "progressDescription", label: "Progress Description", aliases: ["progress"] },
      { key: "receivedBy", label: "Received By", aliases: ["received"] },
      { key: "receivedDate", label: "Received Date" },
    ],
    entries: {
      key: "transmittalItems",
      label: "Enclosed Documents",
      fields: [
        { key: "description", label: "Document", aliases: ["item"] },
        { key: "remarks", label: "Remarks", aliases: ["original", "copy"] },
      ],
    },
  },
  notice_letter: {
    typeCode: "M",
    typeLabel: "M. Notice Letter",
    fields: [
      { key: "ourRef", label: "Our Ref", aliases: ["ref", "letter no"] },
      { key: "receiptNo", label: "Receipt No", aliases: ["no", "kwitansi"] },
      { key: "invNo", label: "Invoice No", aliases: ["invoice number"] },
      { key: "date", label: "Date", aliases: ["tanggal"] },
      { key: "vendorName", label: "Vendor Name" },
      { key: "vendorTaxId", label: "Vendor Tax ID", aliases: ["npwp"] },
      { key: "buyerName", label: "Buyer / Received From", aliases: ["received from"] },
      { key: "attention", label: "Attention" },
      { key: "projectName", label: "Project Name" },
      { key: "subject", label: "Subject", aliases: ["perihal"] },
      { key: "progressDescription", label: "Progress Description" },
      { key: "previousProgressPct", label: "Previous Progress %" },
      { key: "thisPeriodProgressPct", label: "This Period Progress %" },
      { key: "contractValue", label: "Contract Value" },
      { key: "payableAmount", label: "Payable Amount" },
      { key: "grandTotal", label: "Amount" },
      { key: "amountInWords", label: "Amount in Words", aliases: ["terbilang"] },
      { key: "vatAmount", label: "VAT Amount", aliases: ["ppn"] },
      { key: "authorizedSignatory", label: "Authorized Signatory" },
    ],
  },
  monthly_progress_report: {
    typeCode: "N",
    typeLabel: "N. Monthly Progress Report",
    fields: [
      { key: "projectName", label: "Project Name" },
      { key: "periodStart", label: "Period Start" },
      { key: "periodEnd", label: "Period End" },
      { key: "vendorName", label: "Contractor" },
      { key: "buyerName", label: "Client" },
      { key: "contractValue", label: "Original Contract Total" },
      { key: "previousProgressPct", label: "Previous Progress %" },
      { key: "thisPeriodProgressPct", label: "Current Progress %" },
      { key: "cumulativeProgressPct", label: "Cumulative Progress %" },
      { key: "previousBill", label: "Previous Bill" },
      { key: "currentBill", label: "Current Bill" },
      { key: "cumulativeBill", label: "Cumulative Bill" },
    ],
    entries: {
      key: "progressLineItems",
      label: "WBS Progress Rows",
      fields: [
        { key: "poLineNo", label: "PO Line No", aliases: ["line no"] },
        { key: "description", label: "Description", aliases: ["uraian"] },
        { key: "wbsNo", label: "WBS No", aliases: ["wbs"] },
        { key: "unitPrice", label: "Unit Price", aliases: ["original contract"] },
        { key: "weightFactor", label: "Weight Factor" },
        { key: "previousPct", label: "Previous %" },
        { key: "currentPct", label: "Current %" },
        { key: "cumulativePct", label: "Cumulative %" },
        { key: "previousBill", label: "Previous Bill" },
        { key: "currentBill", label: "Current Bill" },
        { key: "cumulativeAmount", label: "Cumulative Amount" },
      ],
    },
  },
  sertifikat_badan_usaha: {
    typeCode: "O",
    typeLabel: "O. Sertifikat Badan Usaha",
    fields: [
      { key: "certificateNumber", label: "Certificate Number", aliases: ["nomor", "pb-umku"] },
      { key: "pbUmku", label: "PB-UMKU" },
      { key: "vendorName", label: "Nama Pelaku Usaha" },
      { key: "nib", label: "NIB", aliases: ["nomor induk berusaha"] },
      { key: "officeAddress", label: "Alamat Kantor" },
      { key: "investmentStatus", label: "Status Penanaman Modal", aliases: ["pmdn"] },
      { key: "kbliCode", label: "Kode KBLI" },
      { key: "kbliDescription", label: "KBLI Description" },
      { key: "issueDate", label: "Issue Date" },
      { key: "validUntil", label: "Valid Until" },
      { key: "npwp", label: "NPWP" },
      { key: "lpjkRegistrationNumber", label: "LPJK Registration" },
      { key: "qualification", label: "Kualifikasi" },
    ],
    entries: {
      key: "classifications",
      label: "Subklasifikasi",
      fields: [
        { key: "kodeSubklas", label: "Kode Subklas" },
        { key: "sifat", label: "Sifat" },
        { key: "kbliCode", label: "KBLI" },
        { key: "subclassificationName", label: "Subklasifikasi" },
        { key: "pjskbuName", label: "PJSKBU" },
      ],
    },
  },
  izin_usaha_jasa_konstruksi: {
    typeCode: "P",
    typeLabel: "P. Izin Usaha Jasa Konstruksi",
    fields: [
      { key: "licenseNumber", label: "Nomor IUJK", aliases: ["nomor"] },
      { key: "vendorName", label: "Nama Perusahaan" },
      { key: "vendorAddress", label: "Alamat Perusahaan" },
      { key: "phone", label: "Telepon / Fax" },
      { key: "responsiblePerson", label: "Penanggungjawab" },
      { key: "netWorth", label: "Kekayaan Bersih" },
      { key: "npwp", label: "NPWP" },
      { key: "businessCategory", label: "Kegiatan Usaha" },
      { key: "issueDate", label: "Tanggal Terbit" },
      { key: "validUntil", label: "Berlaku Sampai" },
      { key: "issuingAuthority", label: "Penerbit" },
    ],
    entries: {
      key: "classifications",
      label: "Klasifikasi Bidang",
      fields: [
        { key: "bidang", label: "Bidang" },
        { key: "subKlasifikasi", label: "Sub Klasifikasi" },
        { key: "kode", label: "Kode" },
        { key: "kualifikasi", label: "Kualifikasi" },
      ],
    },
  },
  service_entry_sheet: {
    typeCode: "K",
    typeLabel: "K. Service Entry Sheet (SES)",
    fields: [
      { key: "sesHeaderInfo", label: "SES Header Info", aliases: ["ses no", "ses number", "header", "document number"] },
      { key: "qty", label: "Qty", aliases: ["quantity", "jumlah"] },
    ],
    entries: {
      key: "sesLineItems",
      label: "SES Line Items",
      fields: [
        { key: "description", label: "Description", aliases: ["item", "service"] },
        { key: "qty", label: "Qty", aliases: ["quantity", "jumlah"] },
      ],
    },
  },
};

/**
 * @param {string} categoryId
 * @returns {string}
 */
export function resolveSchemaId(categoryId) {
  const slug = slugifyCategoryId(categoryId);
  return CATEGORY_TO_SCHEMA[slug] || slug;
}

/**
 * Map any alias categoryId to the canonical classification slug.
 * @param {string} categoryId
 */
export function resolveCanonicalCategoryId(categoryId) {
  return resolveSchemaId(categoryId);
}

/**
 * @param {string} categoryId
 */
export function resolveCategoryDisplayLabel(categoryId) {
  const schemaId = resolveSchemaId(categoryId);
  const schema = DOCUMENT_SCHEMAS[schemaId];
  return schema?.typeLabel || categoryId;
}

/**
 * Plain-text catalog for classification prompts.
 */
export function getClassificationCatalogText() {
  return CLASSIFICATION_CATEGORIES.map(
    (entry) =>
      `- ${entry.categoryId} → ${entry.categoryLabel}\n  Identify by: ${entry.identifiers}`,
  ).join("\n");
}

/**
 * Allowed categoryId values for classification (plus unclassified).
 */
export function getAllowedCategoryIds() {
  return CLASSIFICATION_CATEGORIES.map((entry) => entry.categoryId);
}

/**
 * Build a strict JSON skeleton the model must follow for extraction.
 * @param {string} categoryId
 */
export function buildExtractionJsonExample(categoryId) {
  const resolved = getDocumentSchema(categoryId);
  if (!resolved) {
    return `{
  "documentType": "document type label",
  "header": {},
  "lineItems": [],
  "fields": [],
  "tables": [],
  "summary": null,
  "pages": []
}`;
  }

  const { schema } = resolved;
  const schemaId = resolveSchemaId(categoryId);
  const headerExample = Object.fromEntries(
    schema.fields.map((field) => [field.key, null]),
  );

  const lines = [
    "{",
    `  "documentType": "${schema.typeLabel}",`,
    `  "header": ${JSON.stringify(headerExample, null, 2).replace(/\n/g, "\n  ")},`,
  ];

  if (schema.entries) {
    const rowExample = Object.fromEntries(
      schema.entries.fields.map((field) => [field.key, null]),
    );
    lines.push(`  "${schema.entries.key}": [${JSON.stringify(rowExample)}],`);
    if (schema.entries.mirrorLineItems) {
      lines.push(`  "lineItems": [${JSON.stringify(rowExample)}],`);
    } else {
      lines.push('  "lineItems": [],');
    }
  } else {
    lines.push('  "lineItems": [],');
  }

  lines.push(
    '  "fields": [],',
    '  "tables": [],',
    '  "summary": null,',
    '  "pages": []',
    "}",
  );

  return lines.join("\n");
}

/**
 * @param {string} categoryId
 * @returns {{ schemaId: string, schema: typeof DOCUMENT_SCHEMAS[string] } | null}
 */
export function getDocumentSchema(categoryId) {
  const schemaId = resolveSchemaId(categoryId);
  const schema = DOCUMENT_SCHEMAS[schemaId];
  if (!schema) return null;
  return { schemaId, schema };
}

/**
 * Field definitions for API meta — lets the frontend render labels without hardcoding.
 */
export function getFieldSchemaCatalog() {
  return {
    schemaVersion: SCHEMA_VERSION,
    documents: Object.fromEntries(
      Object.entries(DOCUMENT_SCHEMAS).map(([schemaId, schema]) => [
        schemaId,
        {
          typeCode: schema.typeCode,
          typeLabel: schema.typeLabel,
          fields: schema.fields.map(({ key, label }) => ({ key, label })),
          entries: schema.entries
            ? {
                key: schema.entries.key,
                label: schema.entries.label,
                fields: schema.entries.fields.map(({ key, label }) => ({
                  key,
                  label,
                })),
              }
            : null,
        },
      ]),
    ),
  };
}
