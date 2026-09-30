import { coerceNull } from "../extractors/utils.js";
import {
  extractInvoicePoNumber,
  extractPoNumberFromDocument,
  extractPurchaseOrderPoNumber,
  parsePoNumber,
} from "../utils/poNumber.js";
import {
  DOCUMENT_SCHEMAS,
  SCHEMA_VERSION,
  getDocumentSchema,
  resolveSchemaId,
} from "../constants/documentFieldSchemas.js";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function collectRawPairs(extraction) {
  /** @type {Map<string, unknown>} */
  const pairs = new Map();

  const add = (key, value) => {
    if (key == null || value == null) return;
    const coerced = coerceNull(value);
    if (coerced == null) return;
    const normalized = normalizeKey(key);
    if (!normalized || pairs.has(normalized)) return;
    pairs.set(normalized, coerced);
  };

  for (const [key, value] of Object.entries(extraction.header || {})) {
    add(key, value);
  }

  for (const field of extraction.fields || []) {
    if (field?.name != null) add(field.name, field.value);
    if (field?.label != null) add(field.label, field.value);
    if (field?.fieldName != null) add(field.fieldName, field.fieldValue ?? field.value);
  }

  if (coerceNull(extraction.summary)) {
    add("summary", extraction.summary);
  }

  return pairs;
}

/**
 * @param {Map<string, unknown>} pairs
 * @param {{ key: string, aliases?: string[] }} fieldDef
 */
function pickScalarValue(pairs, fieldDef) {
  const candidates = [fieldDef.key, ...(fieldDef.aliases || [])].map(normalizeKey);

  for (const candidate of candidates) {
    if (pairs.has(candidate)) {
      return pairs.get(candidate);
    }
  }

  for (const [key, value] of pairs) {
    if (candidates.some((candidate) => {
      if (candidate.length < 4) return key === candidate;
      return key === candidate || key.includes(candidate) || candidate.includes(key);
    })) {
      return value;
    }
  }

  return null;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function coerceStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => coerceNull(item)).filter(Boolean);
  }

  const text = coerceNull(value);
  if (!text) return [];

  if (text.includes(",")) {
    return text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [text];
}

/**
 * @param {Record<string, unknown>} item
 * @param {Array<{ key: string, aliases?: string[] }>} fieldDefs
 */
function getHeaderValue(header, keys) {
  for (const key of keys) {
    const value = coerceNull(header?.[key]);
    if (value != null) return value;
  }
  return null;
}

function getFieldValueByName(fields, patterns) {
  for (const field of fields || []) {
    const name = normalizeKey(field?.name || field?.label || field?.fieldName || "");
    const value = coerceNull(field.value ?? field.fieldValue);
    if (value == null) continue;
    if (patterns.some((pattern) => name.includes(normalizeKey(pattern)))) {
      return value;
    }
  }
  return null;
}

function parsePeriodRange(text) {
  const value = coerceNull(text);
  if (!value) return { start: null, end: null };

  const parts = value.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    return { start: parts[0].trim(), end: parts.slice(1).join("-").trim() };
  }
  return { start: value, end: null };
}

const INDONESIAN_MONTHS = {
  januari: "January",
  februari: "February",
  maret: "March",
  april: "April",
  mei: "May",
  juni: "June",
  juli: "July",
  agustus: "August",
  september: "September",
  oktober: "October",
  november: "November",
  desember: "December",
};

function normalizeMonthNameInDate(text) {
  const value = String(text || "").trim();
  const parts = value.split(/\s+/);
  if (parts.length < 3) return value;

  const monthKey = parts[1].toLowerCase();
  const englishMonth = INDONESIAN_MONTHS[monthKey];
  if (!englishMonth) return value;

  return [parts[0], englishMonth, ...parts.slice(2)].join(" ");
}

function parseDateFromText(text) {
  const value = coerceNull(text);
  if (!value) return null;
  const match = value.match(
    /(\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4})/,
  );
  const extracted = match ? match[1].trim() : value.trim();
  return normalizeMonthNameInDate(extracted);
}

function findFakturPajakDate(extraction, fields, pairs, schema) {
  const dateFieldDef = schema.fields.find((field) => field.key === "date");
  const candidates = [
    fields.date,
    dateFieldDef ? pickScalarValue(pairs, dateFieldDef) : null,
    getFieldValueByName(extraction.fields, [
      "tempat dan tanggal ditandatangani",
      "tanggal faktur",
      "tanggal faktur pajak",
      "tanggal",
      "tax invoice date",
      "signing date",
    ]),
    getHeaderValue(extraction.header, [
      "date",
      "Tempat dan Tanggal Ditandatangani",
      "Tanggal",
      "tanggalFaktur",
      "Tanggal Faktur",
    ]),
  ];

  for (const [key, value] of Object.entries(extraction.header || {})) {
    if (/tanggal|ditandatangani|^date$/i.test(key)) {
      candidates.push(value);
    }
  }

  for (const candidate of candidates) {
    const parsed = parseDateFromText(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function splitBankNameAndBranch(combined) {
  const value = coerceNull(combined);
  if (!value) return { bankName: null, bankBranch: null };

  const cabangMatch = value.match(/^(.*?)(?:\s+)?cabang\s+(.+)$/i);
  if (cabangMatch) {
    return {
      bankName: cabangMatch[1].trim(),
      bankBranch: cabangMatch[2].trim(),
    };
  }
  return { bankName: value, bankBranch: null };
}

function computeHoursFromInOut(inTime, outTime) {
  const start = coerceNull(inTime);
  const end = coerceNull(outTime);
  if (!start || !end || start === "-" || end === "-") return null;

  const parse = (time) => {
    const match = String(time).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const startMinutes = parse(start);
  const endMinutes = parse(end);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return `${start}-${end}`;
  }

  const hours = ((endMinutes - startMinutes) / 60).toFixed(2);
  return String(hours);
}

function isTotalRow(item) {
  const label = normalizeKey(
    item?.No ?? item?.no ?? item?.Name ?? item?.name ?? item?.Position,
  );
  return label === "total" || label.includes("total");
}

function tableRowsToObjects(table) {
  const headers = table?.headers || [];
  return (table?.rows || []).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? null;
    });
    return obj;
  });
}

function mapLineItem(item, fieldDefs) {
  if (!item || typeof item !== "object") return null;

  /** @type {Record<string, unknown>} */
  const pairs = new Map();
  for (const [key, value] of Object.entries(item)) {
    pairs.set(normalizeKey(key), value);
  }

  /** @type {Record<string, unknown>} */
  const mapped = {};
  for (const fieldDef of fieldDefs) {
    mapped[fieldDef.key] = pickScalarValue(pairs, fieldDef);
  }

  const hasValue = Object.values(mapped).some((value) => coerceNull(value) != null);
  return hasValue ? mapped : null;
}

function pickNoticeTaxInvoiceNumber(pairs, extraction) {
  const explicitKeys = [
    "nomorfakturpajak",
    "nofakturpajak",
    "taxinvoiceno",
    "taxinvoicenumber",
    "kodedannomorserifakturpajak",
    "fakturpajakno",
  ];

  for (const key of explicitKeys) {
    if (pairs.has(key)) return pairs.get(key);
  }

  const paymentFor = pickScalarValue(pairs, {
    key: "untuk pembayaran",
    aliases: ["for payment", "payment for"],
  });
  if (paymentFor) {
    const match = String(paymentFor).match(
      /(?:faktur\s*pajak|tax\s*invoice)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([A-Za-z0-9./\-]+)/i,
    );
    if (match) return match[1];
  }

  for (const field of extraction.fields || []) {
    const name = normalizeKey(field?.name);
    if (explicitKeys.some((key) => name.includes(key.replace("nomor", "faktur")))) {
      return coerceNull(field.value);
    }
  }

  return null;
}

function enrichInvoiceBankFields(fields, pairs, extraction) {
  if (!fields.bankAccountName) {
    fields.bankAccountName = getFieldValueByName(extraction.fields, [
      "bank - account name",
      "bank account name",
    ]);
  }

  const bankNameBranch = getFieldValueByName(extraction.fields, [
    "bank - bank name",
    "bank name / branch",
    "bank address",
  ]);
  if (bankNameBranch) {
    const split = splitBankNameAndBranch(bankNameBranch);
    fields.bankName = split.bankName;
    fields.bankBranch = split.bankBranch;
  }

  if (!fields.bankAccountNumber) {
    fields.bankAccountNumber = getFieldValueByName(extraction.fields, [
      "bank - account number",
      "bank account",
      "account number",
    ]) || getHeaderValue(extraction.header, ["bankAccountNumber", "accountNumber"]);
  }

  if (!fields.authorizedSignatory) {
    fields.authorizedSignatory =
      getHeaderValue(extraction.header, ["authorizedSignature", "authorizedSignatory"]) ||
      getFieldValueByName(extraction.fields, ["authorized", "director", "signed"]);
  }

  const bankFieldDefs = [
    { key: "bankAccountName", aliases: ["account name", "account holder", "nama rekening"] },
    { key: "bankName", aliases: ["bank name", "nama bank"] },
    { key: "bankBranch", aliases: ["branch", "cabang", "bank branch"] },
    { key: "bankAccountNumber", aliases: ["account number", "no rekening", "rekening", "nomor rekening"] },
    { key: "authorizedSignatory", aliases: ["signatory", "authorized by", "signature", "director", "penandatangan"] },
  ];

  for (const fieldDef of bankFieldDefs) {
    if (coerceNull(fields[fieldDef.key]) != null) continue;
    fields[fieldDef.key] = pickScalarValue(pairs, fieldDef) || null;
  }

  const mohonDikirimkan = getHeaderValue(extraction.header, ["Mohon Dikirimkan Di"]);
  if (mohonDikirimkan) {
    const accountMatch = String(mohonDikirimkan).match(/(\d[\d\-]+)/);
    const cabangMatch = String(mohonDikirimkan).match(/cabang\s+([^0-9]+?)(?:\s+\d|$)/i);
    const bankMatch = String(mohonDikirimkan).match(/bank\s+([A-Za-z0-9 .()]+?)(?:\s+cabang|\s+\d|$)/i);
    if (!fields.bankAccountNumber && accountMatch) {
      fields.bankAccountNumber = accountMatch[1];
    }
    if (!fields.bankBranch && cabangMatch) {
      fields.bankBranch = cabangMatch[1].trim();
    }
    if (!fields.bankName && bankMatch) {
      fields.bankName = bankMatch[1].trim();
    }
    if (!fields.bankAccountName) {
      const nameMatch = String(mohonDikirimkan).match(/(\d[\d\-]+)\s+(.+)$/);
      if (nameMatch) fields.bankAccountName = nameMatch[2].trim();
    }
  }

  const legacyBank = pickScalarValue(pairs, { key: "bank", aliases: ["nama bank"] });
  const legacyBranch = pickScalarValue(pairs, { key: "cabang", aliases: ["branch"] });
  const legacyAccount = pickScalarValue(pairs, {
    key: "no rekening",
    aliases: ["rekening", "account number"],
  });

  if (!fields.bankName && legacyBank) {
    fields.bankName = legacyBranch ? `${legacyBank} ${legacyBranch}`.trim() : legacyBank;
  }
  if (!fields.bankBranch && legacyBranch) {
    fields.bankBranch = legacyBranch;
  }
  if (!fields.bankAccountNumber && legacyAccount) {
    fields.bankAccountNumber = legacyAccount;
  }
}

function parseBeritaAcaraMetric(value) {
  const raw = String(value ?? "")
    .replace(/\s*hours?\s*$/i, "")
    .replace(/%/g, "")
    .trim();
  if (!raw) return null;

  const commaMatch = raw.match(/^(\d+),(\d{1,3})$/);
  if (commaMatch) return `${commaMatch[1]}.${commaMatch[2]}`;

  return coerceNull(value);
}

function buildBeritaAcaraCorpus(extraction) {
  const parts = [];
  for (const [key, value] of Object.entries(extraction.header || {})) {
    if (value != null && value !== "") parts.push(`${key}: ${value}`);
  }
  for (const field of extraction.fields || []) {
    const name = field?.fieldName || field?.name;
    if (!name) continue;
    const value = field?.fieldValue ?? field?.value;
    if (value != null && value !== "") parts.push(`${name}: ${value}`);
  }
  if (coerceNull(extraction.summary)) parts.push(String(extraction.summary));
  return parts.join("\n");
}

function extractBeritaAcaraProgressFields(corpus = "", tables = [], header = {}) {
  const result = {
    manhourPercentageCompletion: null,
    thisManhours: null,
  };

  const directPct =
    header.manhourCompletionPct ||
    header.manhourPercentageCompletion ||
    header.thisPeriodCompletion;
  if (coerceNull(directPct)) {
    result.manhourPercentageCompletion = parseBeritaAcaraMetric(directPct);
  }

  const directMh =
    header.thisManhours || header.thisPeriodManhours || header.thisManHours;
  if (coerceNull(directMh)) {
    result.thisManhours = parseBeritaAcaraMetric(directMh);
  }

  for (const table of tables || []) {
    if (!table?.rows?.length) continue;
    const headers = (table.headers || []).map((cell) => String(cell ?? "").toLowerCase());
    const thisPeriodIdx = headers.findIndex((label) =>
      /this\s*period|periode\s*ini|period\s*ini/i.test(label),
    );
    const valueIdx = thisPeriodIdx >= 0 ? thisPeriodIdx : 2;

    for (const row of table.rows) {
      if (!Array.isArray(row) || !row.length) continue;
      const description = String(row[0] ?? "").toLowerCase();

      if (
        !result.manhourPercentageCompletion &&
        /progress|completion|persentase/i.test(description)
      ) {
        const cell = row[valueIdx] ?? row[2] ?? row[1];
        const parsed = parseBeritaAcaraMetric(cell);
        if (parsed) result.manhourPercentageCompletion = parsed;
      }

      if (!result.thisManhours && /man\s*hours?|manhour|jam\s*kerja/i.test(description)) {
        const cell = row[valueIdx] ?? row[2];
        const parsed = parseBeritaAcaraMetric(cell);
        if (parsed) result.thisManhours = parsed;
      }
    }
  }

  const text = String(corpus || "");
  const progressStart = text.search(
    /progress\s+as\s+follow|performed\s+the\s+work\s+with\s+the\s+progress|kemajuan\s+pekerjaan/i,
  );
  const slice = progressStart >= 0 ? text.slice(progressStart, progressStart + 1400) : text;

  if (!result.manhourPercentageCompletion) {
    const pctMatch = slice.match(/this\s*period\s*[:\s]*([0-9][0-9.,]+)\s*%/i);
    if (pctMatch?.[1]) {
      result.manhourPercentageCompletion = parseBeritaAcaraMetric(pctMatch[1]);
    }
  }

  if (!result.thisManhours) {
    const mhMatch = slice.match(/this\s*man\s*hours?\s*[:\s]*([0-9][0-9.,]+)/i);
    if (mhMatch?.[1]) {
      result.thisManhours = parseBeritaAcaraMetric(mhMatch[1]);
    }
  }

  return result;
}

function buildPoHeaderInformation(extraction) {
  const header = extraction.header || {};
  const poNumber =
    extractPurchaseOrderPoNumber(extraction) ||
    coerceNull(header.poNumber) ||
    null;
  const parts = [
    poNumber,
    header.poDate,
    header.poDate,
    header.buyerName || header.companyName,
    header.vendorName,
    header.projectName || header.locationProjectName,
    header.orderType,
    header.totalPriceText || header.totalPrice,
  ]
    .map((part) => coerceNull(part))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(" | ");

  const pairs = collectRawPairs(extraction);
  return pickScalarValue(pairs, {
    key: "poHeaderInformation",
    aliases: ["po number", "po no", "header"],
  });
}

function enrichBeritaAcaraFields(fields, extraction) {
  const header = extraction.header || {};
  const corpus = buildBeritaAcaraCorpus(extraction);
  const progress = extractBeritaAcaraProgressFields(
    corpus,
    extraction.tables || [],
    { ...header, ...fields },
  );

  if (!fields.poNumber) {
    fields.poNumber = extractPoNumberFromDocument(extraction) || fields.poNumber;
    if (fields.poNumber) {
      const match = String(fields.poNumber).match(/PO\s*([A-Za-z0-9]+)/i);
      if (match) fields.poNumber = match[1];
    }
  }

  if (!fields.periodStart || !fields.periodEnd) {
    const period = parsePeriodRange(
      getHeaderValue(header, ["Periode Kontrak", "ClaimPeriod", "Period", "periodStart"]),
    );
    fields.periodStart =
      fields.periodStart ||
      getHeaderValue(header, ["periodStart", "Period From", "Periode Mulai"]) ||
      period.start;
    fields.periodEnd =
      fields.periodEnd ||
      getHeaderValue(header, ["periodEnd", "Period To", "Periode Akhir"]) ||
      period.end;
  }

  if (!fields.serviceName) {
    fields.serviceName =
      getHeaderValue(header, ["Paket Pekerjaan", "Nama Proyek", "serviceName"]) ||
      fields.serviceName;
  }

  if (!fields.manhourPercentageCompletion && progress.manhourPercentageCompletion) {
    fields.manhourPercentageCompletion = progress.manhourPercentageCompletion;
  }

  if (!fields.thisManhours && progress.thisManhours) {
    fields.thisManhours = progress.thisManhours;
  }

  if (!fields.approvalPrepared) {
    fields.approvalPrepared =
      getHeaderValue(header, ["preparedBy", "Prepared By"]) ||
      getFieldValueByName(extraction.fields, ["prepared by", "prepared", "dibuat oleh"]);
  }
  if (!fields.approvalReviewed) {
    fields.approvalReviewed =
      getHeaderValue(header, ["reviewedBy", "Reviewed By"]) ||
      getFieldValueByName(extraction.fields, ["reviewed by", "reviewed", "diperiksa oleh"]);
  }
  if (!fields.approvalAcknowledged) {
    fields.approvalAcknowledged =
      getHeaderValue(header, ["acknowledgedBy", "Acknowledged By"]) ||
      getFieldValueByName(extraction.fields, [
        "acknowledged by",
        "acknowledged",
        "diketahui oleh",
        "mengetahui",
      ]);
  }
  if (!fields.approvalApproved) {
    fields.approvalApproved =
      getHeaderValue(header, ["approvedBy", "Approved By"]) ||
      getFieldValueByName(extraction.fields, ["approved by", "approved", "disetujui oleh"]);
  }
}

function buildSesHeaderInformation(extraction) {
  const pairs = collectRawPairs(extraction);
  return pickScalarValue(pairs, {
    key: "sesHeaderInfo",
    aliases: ["ses no", "ses number", "document number", "header"],
  });
}

const INVOICE_TRAVEL_ROW_DEFS = [
  { key: "description", aliases: ["description", "item", "claim", "uraian", "keterangan"] },
  { key: "passengerName", aliases: ["passenger name", "name", "nama", "nama penumpang", "passenger"] },
  { key: "ticketClass", aliases: ["ticket class", "class", "kelas", "booking class"] },
  { key: "routeFrom", aliases: ["from", "departure", "berangkat", "asal", "origin"] },
  { key: "routeTo", aliases: ["to", "destination", "tujuan", "arrival"] },
  { key: "routing", aliases: ["route", "routing", "rute"] },
  { key: "confirmNo", aliases: ["confirm no", "confirmation no", "booking ref", "pnr", "no konfirmasi"] },
  { key: "ticketNo", aliases: ["ticket no", "ticket number", "e-ticket", "nomor tiket"] },
  { key: "airline", aliases: ["airline", "maskapai", "carrier"] },
  { key: "flightNo", aliases: ["flight no", "flight", "flight number", "no penerbangan"] },
  { key: "routeCodeFrom", aliases: ["route code from", "from code", "kode asal"] },
  { key: "routeCodeTo", aliases: ["route code to", "to code", "kode tujuan"] },
  { key: "role", aliases: ["position", "jabatan", "trade", "posisi", "role of manpower"] },
  { key: "quantity", aliases: ["qty", "quantity", "jumlah", "q'ty"] },
  { key: "unit", aliases: ["unit", "uom", "satuan"] },
  { key: "unitPrice", aliases: ["unit price", "rate", "harga satuan", "price", "manhour rate"] },
  { key: "amount", aliases: ["amount", "amount idr", "amount (idr)", "total", "jumlah", "nilai"] },
];

function isTravelTicketInvoice(extraction, fields = {}) {
  const service = String(
    fields.serviceName ||
      extraction.header?.serviceName ||
      extraction.invoiceLineItems?.[0]?.description ||
      extraction.lineItems?.[0]?.description ||
      "",
  ).toLowerCase();
  const po =
    parsePoNumber(fields.poNumber) ||
    parsePoNumber(extraction.header?.poNumber) ||
    extractInvoicePoNumber(extraction);
  return /ticket|travel|flight|wisata|shuttle/.test(service) && !po;
}

function extractTravelFieldsFromTables(extraction) {
  /** @type {Record<string, unknown>} */
  const found = {};

  for (const table of extraction.tables || []) {
    for (const row of table.rows || []) {
      if (!Array.isArray(row) || row.length < 2) continue;
      const label = normalizeKey(row[0]);
      const value = coerceNull(row[1]);
      if (!label || value == null) continue;

      for (const fieldDef of INVOICE_TRAVEL_ROW_DEFS) {
        if (fieldDef.key === "description" || fieldDef.key === "amount") continue;
        const aliases = [fieldDef.key, ...(fieldDef.aliases || [])].map(normalizeKey);
        if (aliases.some((alias) => label === alias || label.includes(alias) || alias.includes(label))) {
          if (found[fieldDef.key] == null) found[fieldDef.key] = value;
        }
      }
    }
  }

  return found;
}

function enrichTravelInvoiceFields(fields, extraction) {
  if (!isTravelTicketInvoice(extraction, fields)) return;

  const pairs = collectRawPairs(extraction);
  const fromTables = extractTravelFieldsFromTables(extraction);
  const line =
    (Array.isArray(extraction.invoiceLineItems) && extraction.invoiceLineItems[0]) ||
    (Array.isArray(extraction.lineItems) && extraction.lineItems[0]) ||
    {};
  const header = extraction.header || {};

  for (const fieldDef of INVOICE_TRAVEL_ROW_DEFS) {
    if (fieldDef.key === "description" || fieldDef.key === "amount") continue;
    if (coerceNull(fields[fieldDef.key]) != null) continue;

    fields[fieldDef.key] =
      coerceNull(header[fieldDef.key]) ||
      coerceNull(line[fieldDef.key]) ||
      coerceNull(fromTables[fieldDef.key]) ||
      pickScalarValue(pairs, fieldDef) ||
      getFieldValueByName(extraction.fields, fieldDef.aliases || []) ||
      null;
  }

  if (!fields.routeFrom || !fields.routeTo) {
    const routing =
      fields.routing ||
      header.routing ||
      line.routing ||
      pickScalarValue(pairs, { key: "routing", aliases: ["route", "routing", "rute"] });
    if (routing) {
      const parts = String(routing)
        .split(/\s*-\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (!fields.routeFrom && parts[0]) fields.routeFrom = parts[0];
      if (!fields.routeTo && parts.length > 1) fields.routeTo = parts[parts.length - 1];
    }
  }

  if (!fields.routeCodeFrom || !fields.routeCodeTo) {
    const corpus = [
      fields.routing,
      line.routing,
      header.routing,
      extraction.summary,
      ...Object.values(fromTables),
    ]
      .filter(Boolean)
      .join("\n");
    const match = String(corpus).match(/\b([A-Z]{3})\s*[-/]\s*([A-Z]{3})\b/i);
    if (match) {
      if (!fields.routeCodeFrom) fields.routeCodeFrom = match[1].toUpperCase();
      if (!fields.routeCodeTo) fields.routeCodeTo = match[2].toUpperCase();
    }
  }
}

function isInvoiceSummaryRow(item) {
  const label = normalizeKey(
    item?.description ??
      item?.Description ??
      item?.No ??
      item?.no ??
      item?.Name ??
      item?.name,
  );
  if (!label) return false;
  return (
    label === "total" ||
    label === "subtotal" ||
    label === "grandtotal" ||
    label.includes("grand total") ||
    label.includes("sub total") ||
    /^vat\b/.test(label) ||
    label.includes("ppn") ||
    label.includes("tax amount")
  );
}

function extractInvoiceLineItems(extraction) {
  const rowDefs = INVOICE_TRAVEL_ROW_DEFS;

  const source = [
    ...(Array.isArray(extraction.invoiceLineItems) ? extraction.invoiceLineItems : []),
    ...(Array.isArray(extraction.lineItems) ? extraction.lineItems : []),
  ];

  const entries = [];
  const seen = new Set();

  for (const item of source) {
    if (isInvoiceSummaryRow(item)) continue;

    const mapped = mapLineItem(item, rowDefs);
    if (mapped) {
      const signature = JSON.stringify(mapped);
      if (seen.has(signature)) continue;
      seen.add(signature);
      entries.push(mapped);
      continue;
    }

    const description =
      coerceNull(item.description) ||
      coerceNull(item.Description) ||
      coerceNull(item.CLAIM) ||
      coerceNull(item.Claim) ||
      coerceNull(item.Item);
    if (!description) continue;

    const fallback = {
      description,
      passengerName:
        coerceNull(item.passengerName) ||
        coerceNull(item.name) ||
        coerceNull(item.Name) ||
        null,
      ticketClass: coerceNull(item.ticketClass) || coerceNull(item["Ticket Class"]) || null,
      routeFrom: coerceNull(item.routeFrom) || coerceNull(item.From) || coerceNull(item.from) || null,
      routeTo: coerceNull(item.routeTo) || coerceNull(item.To) || coerceNull(item.to) || null,
      routing: coerceNull(item.routing) || coerceNull(item.Routing) || null,
      confirmNo: coerceNull(item.confirmNo) || coerceNull(item["Confirm No"]) || null,
      ticketNo: coerceNull(item.ticketNo) || coerceNull(item["Ticket No"]) || null,
      airline: coerceNull(item.airline) || coerceNull(item.Airline) || null,
      flightNo:
        coerceNull(item.flightNo) ||
        coerceNull(item.flight) ||
        coerceNull(item["Flight No"]) ||
        null,
      routeCodeFrom:
        coerceNull(item.routeCodeFrom) || coerceNull(item["Route Code From"]) || null,
      routeCodeTo: coerceNull(item.routeCodeTo) || coerceNull(item["Route Code To"]) || null,
      role:
        coerceNull(item.role) ||
        coerceNull(item.Role) ||
        coerceNull(item.Position) ||
        coerceNull(item.position) ||
        null,
      quantity:
        coerceNull(item.quantity) ||
        coerceNull(item.Quantity) ||
        coerceNull(item.qty) ||
        coerceNull(item.Qty) ||
        null,
      unit: coerceNull(item.unit) || coerceNull(item.Unit) || null,
      unitPrice:
        coerceNull(item.unitPrice) ||
        coerceNull(item["Unit Price"]) ||
        coerceNull(item.rate) ||
        coerceNull(item.Rate) ||
        null,
      amount:
        coerceNull(item.amount) ||
        coerceNull(item.Amount) ||
        coerceNull(item["AMOUNT (IDR)"]) ||
        coerceNull(item["Amount (IDR)"]) ||
        null,
    };

    const signature = JSON.stringify(fallback);
    if (seen.has(signature)) continue;
    seen.add(signature);
    entries.push(fallback);
  }

  if (!entries.length && isTravelTicketInvoice(extraction)) {
    const travelHeader = {};
    enrichTravelInvoiceFields(travelHeader, extraction);
    const hasTravel = Object.entries(travelHeader).some(
      ([key, value]) => key !== "description" && coerceNull(value) != null,
    );
    if (hasTravel) {
      entries.push({
        description:
          extraction.header?.serviceName ||
          extraction.lineItems?.[0]?.description ||
          "Ticket Domestic",
        ...travelHeader,
        amount:
          extraction.header?.subtotal ||
          extraction.header?.totalAmount ||
          extraction.lineItems?.[0]?.amount ||
          null,
      });
    }
  }

  return entries;
}

function extractManpowerRoles(extraction) {
  const roles = new Set();

  for (const item of extraction.lineItems || []) {
    const role =
      coerceNull(item.role) ||
      coerceNull(item.Position) ||
      coerceNull(item.position) ||
      coerceNull(item.Role);
    if (role) roles.add(role);
  }

  const pairs = collectRawPairs(extraction);
  const fromScalar = pickScalarValue(pairs, {
    key: "rolesOfManpower",
    aliases: ["manpower roles", "position"],
  });
  for (const role of coerceStringArray(fromScalar)) {
    roles.add(role);
  }

  const serviceName = pickScalarValue(pairs, {
    key: "serviceName",
    aliases: ["description", "untuk pembayaran"],
  });
  const descriptions = [
    serviceName,
    ...(extraction.lineItems || []).map(
      (item) => coerceNull(item.Description) || coerceNull(item.description),
    ),
  ].filter(Boolean);

  for (const text of descriptions) {
    const match = text.match(/\(([^)]+)\)/);
    if (match) {
      for (const role of match[1].split(/,|\band\b/i).map((part) => part.trim())) {
        if (role) roles.add(role);
      }
    }
  }

  return [...roles].map((role) => ({ role, name: null }));
}

function extractManpowerFromLineItems(extraction) {
  const entries = [];

  for (const item of extraction.lineItems || []) {
    const mapped = mapLineItem(item, [
      { key: "role", aliases: ["position", "jabatan"] },
      { key: "name", aliases: ["nama", "name"] },
    ]);
    if (mapped) entries.push(mapped);
  }

  return entries;
}

function extractManhourSummaryEntries(extraction) {
  const entries = [];

  for (const item of extraction.lineItems || []) {
    if (isTotalRow(item)) continue;

    const regular =
      coerceNull(item["Actual Mhr"]) ||
      coerceNull(item.actualMhr) ||
      coerceNull(item["Day Work"]) ||
      coerceNull(item.dayWork);
    const overtimeMonSat =
      coerceNull(item["Overtime Monday-Saturday"]) ||
      coerceNull(item.overtimeMondaySaturday);
    const overtimeSunPh =
      coerceNull(item["Overtime Sunday & Public Holiday"]) ||
      coerceNull(item.overtimeSundayPublicHoliday);
    const overtimeParts = [overtimeMonSat, overtimeSunPh].filter(Boolean);
    const overtime = overtimeParts.length ? overtimeParts.join(" + ") : null;

    const entry = {
      regularManhour: regular,
      overtimeManhour: overtime,
      role: coerceNull(item.Position) || coerceNull(item.position) || coerceNull(item.role),
      name: coerceNull(item.Name) || coerceNull(item.name),
    };

    if (Object.values(entry).some((value) => coerceNull(value) != null)) {
      entries.push(entry);
    }
  }

  if (entries.length > 0) return entries;

  for (const item of extraction.lineItems || []) {
    const mapped = mapLineItem(item, [
      { key: "regularManhour", aliases: ["man-month", "man month", "rate", "manhour", "actual mhr"] },
      { key: "overtimeManhour", aliases: ["overtime hour", "overtime", "lembur"] },
      { key: "role", aliases: ["position", "jabatan"] },
      { key: "name", aliases: ["nama", "name"] },
    ]);
    if (mapped) entries.push(mapped);
  }

  return entries;
}

function resolveTimesheetEmployeeContext(extraction) {
  const header = extraction.header || {};
  return {
    username:
      getHeaderValue(header, [
        "Page1_Name",
        "HandwrittenPages_Name",
        "page9_Name",
        "pages10-15_Name",
        "page16_Name",
      ]) || null,
    role:
      getHeaderValue(header, [
        "Page1_Position",
        "HandwrittenPages_Classification",
        "page9_Classification",
        "pages10-15_Classification",
        "page16_Classification",
      ]) || null,
    name:
      getHeaderValue(header, [
        "HandwrittenPages_Name",
        "page9_Name",
        "pages10-15_Name",
        "page16_Name",
      ]) || getHeaderValue(header, ["Page1_Name"]),
  };
}

function mapTimesheetLineItem(item, employeeContext) {
  const regularFromInOut = computeHoursFromInOut(item.in ?? item.In, item.out ?? item.Out);
  const mapped = mapLineItem(item, [
    { key: "date", aliases: ["tanggal", "date"] },
    { key: "username", aliases: ["name", "nik", "id no", "employee", "badge"] },
    { key: "regularManhour", aliases: ["regular", "hours", "manhour", "work hours"] },
    { key: "overtimeManhour", aliases: ["overtime", "ot", "lembur", "total ot paid"] },
    { key: "role", aliases: ["position", "jabatan", "classification"] },
    { key: "name", aliases: ["nama", "worker name", "headername"] },
  ]);

  if (!mapped) return null;

  if (!mapped.regularManhour && regularFromInOut) {
    mapped.regularManhour = regularFromInOut;
  }
  if (!mapped.username) mapped.username = employeeContext.username;
  if (!mapped.role) mapped.role = employeeContext.role;
  if (!mapped.name) mapped.name = employeeContext.name ?? mapped.username;

  return mapped;
}

function extractTimesheetEntries(extraction) {
  const entries = [];
  const employeeContext = resolveTimesheetEmployeeContext(extraction);

  const source =
    (Array.isArray(extraction.timesheets) && extraction.timesheets.length > 0
      ? extraction.timesheets
      : extraction.lineItems) || [];

  for (const item of source) {
    const mapped = mapTimesheetLineItem(item, employeeContext);
    if (mapped) entries.push(mapped);
  }

  for (const table of extraction.tables || []) {
    const name = normalizeKey(table?.name);
    if (!name.includes("timesheet") && !name.includes("daily")) continue;

    for (const row of tableRowsToObjects(table)) {
      const mapped = mapTimesheetLineItem(row, employeeContext);
      if (mapped) entries.push(mapped);
    }
  }

  return entries;
}

function extractAttendanceFromTables(extraction) {
  const entries = [];

  for (const table of extraction.tables || []) {
    const headers = (table.headers || []).map((header) => normalizeKey(header));
    const dateIdx = headers.findIndex((header) => header === "date");
    const userIdx = headers.findIndex((header) => header === "user");
    const eventIdx = headers.findIndex((header) => header === "event");
    if (dateIdx < 0) continue;

    for (const row of table.rows || []) {
      const entry = {
        date: coerceNull(row[dateIdx]),
        username: userIdx >= 0 ? coerceNull(row[userIdx]) : null,
        event: eventIdx >= 0 ? coerceNull(row[eventIdx]) : null,
      };
      if (entry.date || entry.username || entry.event) entries.push(entry);
    }
  }

  return entries;
}

function extractAttendanceEntries(extraction) {
  const fromTables = extractAttendanceFromTables(extraction);
  if (fromTables.length > 0) return fromTables;

  const entries = [];
  for (const item of extraction.lineItems || []) {
    const mapped = mapLineItem(item, [
      { key: "date", aliases: ["tanggal"] },
      { key: "username", aliases: ["name", "nik", "description", "employee", "user"] },
      { key: "event", aliases: ["status", "remarks", "time", "in", "out", "event"] },
    ]);
    if (mapped) {
      if (!mapped.event && item.Time && item.Status) {
        mapped.event = `${item.Status}${item.Remarks ? ` - ${item.Remarks}` : ""} (${item.Time})`;
      }
      entries.push(mapped);
    }
  }

  return entries;
}

function extractPoLineItems(extraction) {
  const entries = [];

  for (const item of extraction.lineItems || []) {
    const mapped = mapLineItem(item, [
      { key: "description", aliases: ["item", "uraian"] },
      { key: "deliveryDate", aliases: ["end date", "delivery", "start date"] },
    ]);
    if (mapped) entries.push(mapped);
  }

  return entries;
}

function extractAppendixItems(extraction) {
  const entries = [];

  const walk = (items) => {
    for (const item of items || []) {
      if (Array.isArray(item.subItems) && item.subItems.length > 0) {
        walk(item.subItems);
        continue;
      }

      const unitPrice = coerceNull(item.unitPrice) ?? coerceNull(item.unitprice);
      const qty = coerceNull(item.qty) ?? coerceNull(item.quantity);
      if (unitPrice == null && qty == null) continue;

      const mapped = mapLineItem(item, [
        { key: "unitPrice", aliases: ["price", "rate", "harga satuan", "unit price"] },
        { key: "qty", aliases: ["quantity", "jumlah"] },
        { key: "roleOfManpower", aliases: ["role", "position", "jabatan"] },
      ]);
      if (mapped) entries.push(mapped);
    }
  };

  walk(extraction.lineItems);
  return entries;
}

function extractSesLineItems(extraction) {
  const entries = [];

  for (const item of extraction.lineItems || []) {
    const mapped = mapLineItem(item, [
      { key: "description", aliases: ["item", "service", "nama barang"] },
      { key: "qty", aliases: ["quantity", "jumlah"] },
    ]);
    if (mapped) entries.push(mapped);
  }

  return entries;
}

function buildScalarFields(schemaId, schema, extraction) {
  const pairs = collectRawPairs(extraction);
  /** @type {Record<string, unknown>} */
  const fields = {};

  for (const fieldDef of schema.fields) {
    if (fieldDef.key === "poNumber") {
      if (schemaId === "invoice") {
        fields.poNumber = extractInvoicePoNumber(extraction);
      } else if (
        schemaId === "purchase_order" ||
        schemaId === "purchase_order_appendix"
      ) {
        fields.poNumber =
          extractPurchaseOrderPoNumber(extraction) ||
          parsePoNumber(pickScalarValue(pairs, fieldDef));
      } else {
        fields.poNumber = extractPoNumberFromDocument(extraction);
      }
      continue;
    }

    if (coerceNull(extraction.header?.[fieldDef.key]) != null) {
      fields[fieldDef.key] = extraction.header[fieldDef.key];
      continue;
    }

    if (fieldDef.key === "rolesOfManpower") {
      const roleEntries = extractManpowerRoles(extraction);
      fields[fieldDef.key] =
        roleEntries.length > 0 ? roleEntries.map((entry) => entry.role) : null;
      continue;
    }

    if (fieldDef.key === "poHeaderInformation" && schemaId === "purchase_order") {
      fields[fieldDef.key] = buildPoHeaderInformation(extraction);
      continue;
    }

    if (fieldDef.key === "poHeaderInformation" && schemaId === "purchase_order_appendix") {
      fields[fieldDef.key] = buildPoHeaderInformation(extraction);
      continue;
    }

    if (fieldDef.key === "sesHeaderInfo") {
      fields[fieldDef.key] = buildSesHeaderInformation(extraction);
      continue;
    }

    if (fieldDef.key === "taxInvoiceNumber" && schemaId === "notice") {
      fields[fieldDef.key] = pickNoticeTaxInvoiceNumber(pairs, extraction);
      continue;
    }

    fields[fieldDef.key] = pickScalarValue(pairs, fieldDef);
  }

  if (schemaId === "invoice") {
    fields.invNo =
      fields.invNo ||
      getHeaderValue(extraction.header, [
        "invoiceNo",
        "Invoice No",
        "INVOICE NO",
        "invoiceNumber",
        "invNo",
      ]) ||
      null;
    fields.date =
      fields.date ||
      getHeaderValue(extraction.header, ["date", "Date", "invoiceDate"]) ||
      null;
    fields.dueDate =
      fields.dueDate ||
      getHeaderValue(extraction.header, [
        "dueDate",
        "Due Date",
        "Jatuh Tempo",
        "Tanggal Jatuh Tempo",
        "Payment Due",
      ]) ||
      null;
    fields.vendorName =
      fields.vendorName ||
      getHeaderValue(extraction.header, ["vendorName", "Vendor", "seller"]) ||
      null;
    fields.vendorAddress =
      fields.vendorAddress ||
      getHeaderValue(extraction.header, ["vendorAddress", "address"]) ||
      null;
    fields.vendorTaxId =
      fields.vendorTaxId ||
      getHeaderValue(extraction.header, ["vendorTaxId", "NPWP", "taxId"]) ||
      null;
    fields.buyerName =
      fields.buyerName ||
      getHeaderValue(extraction.header, ["buyerName", "Buyer", "billTo", "customer"]) ||
      null;
    fields.poNumber =
      extractInvoicePoNumber(extraction) ||
      fields.poNumber ||
      null;
    fields.currency =
      fields.currency ||
      getHeaderValue(extraction.header, ["currency", "Currency", "IDR"]) ||
      null;
    fields.paymentTerms =
      fields.paymentTerms ||
      getHeaderValue(extraction.header, ["paymentTerm", "Payment Term", "paymentTerms"]) ||
      null;
    if (!fields.subtotal) {
      fields.subtotal =
        getHeaderValue(extraction.header, ["subtotal", "Subtotal", "Sub Total"]) ||
        getFieldValueByName(extraction.fields, ["subtotal", "sub total"]) ||
        pickScalarValue(pairs, { key: "subtotal", aliases: ["sub total"] }) ||
        null;
    }
    if (!fields.totalAmount) {
      fields.totalAmount =
        getHeaderValue(extraction.header, ["total", "Total", "totalAmount"]) ||
        getFieldValueByName(extraction.fields, ["total (net)", "total"]) ||
        null;
    }
    if (!fields.vatAmount) {
      fields.vatAmount =
        getHeaderValue(extraction.header, [
          "vat11%",
          "vatAmount",
          "VAT 11%",
          "taxAmount",
          "PPN",
        ]) ||
        getFieldValueByName(extraction.fields, ["vat 11%", "vat", "ppn", "tax amount"]) ||
        pickScalarValue(pairs, { key: "vat", aliases: ["vat 10%", "ppn", "tax"] }) ||
        null;
    }
    if (!fields.grandTotal) {
      fields.grandTotal =
        getHeaderValue(extraction.header, ["grandTotal", "Grand Total"]) ||
        getFieldValueByName(extraction.fields, ["grand total"]) ||
        pickScalarValue(pairs, { key: "total", aliases: ["grand total", "amount due"] }) ||
        null;
    }
    enrichInvoiceBankFields(fields, pairs, extraction);
    if (!fields.serviceName) {
      fields.serviceName =
        getHeaderValue(extraction.header, ["serviceName", "service", "activityName"]) ||
        coerceNull(extraction.lineItems?.[0]?.description) ||
        coerceNull(extraction.lineItems?.[0]?.Description) ||
        coerceNull(extraction.invoiceLineItems?.[0]?.description) ||
        fields.serviceName;
    }
    if (!fields.rolesOfManpower || (Array.isArray(fields.rolesOfManpower) && !fields.rolesOfManpower.length)) {
      const roleEntries = extractManpowerRoles(extraction);
      fields.rolesOfManpower =
        roleEntries.length > 0 ? roleEntries.map((entry) => entry.role) : null;
    }
    enrichTravelInvoiceFields(fields, extraction);
  }

  if (schemaId === "berita_acara") {
    enrichBeritaAcaraFields(fields, extraction);
  }

  if (schemaId === "purchase_order" && !fields.description && extraction.lineItems?.[0]) {
    fields.description =
      coerceNull(extraction.lineItems[0].description) ||
      coerceNull(extraction.lineItems[0].Description) ||
      null;
    fields.deliveryDate =
      fields.deliveryDate ||
      coerceNull(extraction.lineItems[0].endDate) ||
      coerceNull(extraction.lineItems[0].deliveryDate) ||
      null;
  }

  if (schemaId === "purchase_order") {
    if (!fields.poNumber) {
      fields.poNumber =
        extractPurchaseOrderPoNumber(extraction) ||
        parsePoNumber(
          pickScalarValue(pairs, {
            key: "poNumber",
            aliases: ["po no", "po number", "purchase order"],
          }),
        );
    }
  }

  if (schemaId === "faktur_pajak") {
    if (!fields.taxInvoiceNumber) {
      fields.taxInvoiceNumber =
        getHeaderValue(extraction.header, ["Kode dan Nomor Seri Faktur Pajak"]) || null;
    }
    fields.date = findFakturPajakDate(extraction, fields, pairs, schema);
    if (!fields.vatAmount) {
      fields.vatAmount =
        getFieldValueByName(extraction.fields, [
          "jumlah ppn",
          "ppn",
          "vat amount",
        ]) ||
        getHeaderValue(extraction.header, ["vatAmount", "Jumlah PPN"]) ||
        fields.vatAmount;
    }
  }

  if (schemaId === "notice") {
    fields.date = parseDateFromText(
      fields.date ||
        getHeaderValue(extraction.header, [
          "Tanggal/Tempat",
          "Tanggal",
          "date",
        ]),
    );
    if (!fields.vatAmount) {
      fields.vatAmount =
        getFieldValueByName(extraction.fields, ["vat", "ppn"]) || fields.vatAmount;
    }
    if (!fields.taxInvoiceNumber) {
      fields.taxInvoiceNumber = pickNoticeTaxInvoiceNumber(pairs, extraction);
    }
  }

  return fields;
}

function buildEntryArrays(schemaId, schema, extraction) {
  if (schemaId === "invoice") {
    return { invoiceLineItems: extractInvoiceLineItems(extraction) };
  }

  const entryKey = schema.entries?.key;
  if (entryKey && Array.isArray(extraction[entryKey]) && extraction[entryKey].length > 0) {
    return { [entryKey]: extraction[entryKey] };
  }

  switch (schemaId) {
    case "berita_acara":
      return { manpower: extractManpowerFromLineItems(extraction) };
    case "summary_calculation_manhour":
      return { manhourSummary: extractManhourSummaryEntries(extraction) };
    case "daily_timesheet":
      return { timesheetEntries: extractTimesheetEntries(extraction) };
    case "daily_attendance":
      return { attendanceEntries: extractAttendanceEntries(extraction) };
    case "purchase_order":
      return { poLineItems: extractPoLineItems(extraction) };
    case "purchase_order_appendix":
      return { appendixItems: extractAppendixItems(extraction) };
    case "service_entry_sheet":
      return { sesLineItems: extractSesLineItems(extraction) };
    default:
      return {};
  }
}

/**
 * Normalize a raw extraction result into a stable schema for the frontend.
 * @param {string} categoryId
 * @param {object} extraction
 */
export function normalizeExtraction(categoryId, extraction) {
  const schemaId = resolveSchemaId(categoryId);
  const resolved = getDocumentSchema(categoryId);

  if (!resolved) {
    return {
      schemaVersion: SCHEMA_VERSION,
      schemaId: null,
      typeCode: null,
      typeLabel: extraction.documentTypeLabel || categoryId,
      fields: {},
      entries: {},
      hasSchema: false,
    };
  }

  const { schema } = resolved;
  const scalarFields = buildScalarFields(schemaId, schema, extraction);
  const entryArrays = buildEntryArrays(schemaId, schema, extraction);

  /** @type {Record<string, unknown>} */
  const fields = {};
  for (const fieldDef of schema.fields) {
    fields[fieldDef.key] = scalarFields[fieldDef.key] ?? null;
  }

  /** @type {Record<string, unknown[]>} */
  const entries = {};
  if (schema.entries) {
    entries[schema.entries.key] = entryArrays[schema.entries.key] || [];
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    schemaId,
    typeCode: schema.typeCode,
    typeLabel: schema.typeLabel,
    fields,
    entries,
    hasSchema: true,
  };
}

/**
 * When PO and appendix are in one section, also expose appendix-shaped data.
 * @param {string} categoryId
 * @param {object} extraction
 */
export function normalizePurchaseOrderAppendix(categoryId, extraction) {
  if (resolveSchemaId(categoryId) !== "purchase_order") return null;

  const appendixSchema = DOCUMENT_SCHEMAS.purchase_order_appendix;
  const items = extractAppendixItems(extraction);
  if (!items.length) return null;

  return {
    schemaVersion: SCHEMA_VERSION,
    schemaId: "purchase_order_appendix",
    typeCode: appendixSchema.typeCode,
    typeLabel: appendixSchema.typeLabel,
    fields: {
      poHeaderInformation: buildPoHeaderInformation(extraction),
    },
    entries: {
      appendixItems: items,
    },
    hasSchema: true,
  };
}
