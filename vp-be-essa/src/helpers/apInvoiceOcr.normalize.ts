/** Indonesian / ESSA invoice field normalization helpers. */

const PO_LABELED_PATTERN =
  /(?:contract\s+order\s+no\.?\s*)?\bpo\s*(?:no\.?|number)?[:\s#-]*(4203\d{6})/i;

const PO_NOMOR_PATTERN = /nomor\s+po[:\s#-]*(4203\d{6})/i;

const ALE_INVOICE_RE = /\b(\d{3}\/PT\.ALE-PAU\/\d{2}\/\d{4})\b/i;

const ALE_INVOICE_LABELED_RE =
  /(?:invoice\s*no\.?|no\.?)\s*[:\-]?\s*(\d{3}\/PT\.ALE-PAU\/\d{2}\/\d{4})/i;

const ALE_PREFIX_FIX: Record<string, string> = {
  SJBY: "568",
  SJBF: "568",
  SBY: "568",
  S68: "568",
  "5JBY": "568",
};

const ALE_PAU_SEGMENT_RE = /^PT\.ALE-PAU?$/i;

function normalizeAlePauSegment(segment: string): string {
  return ALE_PAU_SEGMENT_RE.test(segment.trim()) ? "PT.ALE-PAU" : segment;
}

function isAleLikeOcrValue(value: string): boolean {
  return /PT\.ALE-PA/i.test(value) || /^[A-Z0-9]{3,4}\/PT\.ALE/i.test(value);
}

function extractMmYyyyFromCorpus(corpus: string): { month: string; year: string } | null {
  const patterns = [
    /invoiceDate\s*[:\s]*\d{1,2}[\/\-](\d{2})[\/\-](\d{4})/i,
    /\bdate\s*[:\s]*\d{1,2}[\/\-](\d{2})[\/\-](\d{4})/i,
    /\bDATE\s*[:\-]?\s*\d{1,2}[\/\-](\d{2})[\/\-](\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = corpus.match(pattern);
    if (match?.[1] && match?.[2]) {
      return { month: match[1], year: match[2] };
    }
  }
  return null;
}

function ocrLettersToDigits(prefix: string): string | null {
  const digits = prefix
    .toUpperCase()
    .replace(/S/g, "5")
    .replace(/[BJF]/g, "8")
    .replace(/G/g, "6")
    .replace(/[IL]/g, "1")
    .replace(/[OQ]/g, "0")
    .replace(/Z/g, "2");
  return /^\d{3}$/.test(digits) ? digits : null;
}

const INVOICE_NO_PATTERNS = [
  ALE_INVOICE_LABELED_RE,
  ALE_INVOICE_RE,
  /\b((?:INV|KW)\/[A-Z0-9]{2,}\/[0-9]+\/[0-9]+)\b/i,
  /invoice\s*no\.?[\s\S]{0,120}?\b((?:INV|KW)[\/\-][A-Z0-9][A-Z0-9\-\/\.]+)/i,
  /invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*((?:INV|KW)[A-Z0-9\-\/\.]+)/i,
  /nomor\s*(?:invoice|faktur)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/\.]+)/i,
  /kwitansi[\s\S]{0,200}?no\.?\s*[:\-]?\s*([0-9]{2,}[A-Z0-9\-\/\.]+)/i,
  /invoice\s*(?:no\.?|number|#)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/\.]+)/i,
];

const INVOICE_NUMBER_BLOCKLIST = new Set([
  "invoice",
  "date",
  "page",
  "no",
  "number",
]);

const PPN_AMOUNT_PATTERNS = [
  /\bppn\s*[:\-]?\s*(?:rp\.?\s*)?([0-9][0-9.,]+)/i,
  /(?:^|[\s,])(?:ppn|vat)\s*(?:11%?)?\s*[:\-]?\s*(?:rp\.?\s*)?([0-9][0-9.,]+)/im,
];

const PAYMENT_TERMS_PATTERNS = [
  /terms?\s+of\s+paym?e?nt\s*[:\-]?\s*([\s\S]{0,400}?)(?=\n\s*[-•]|\n\s*this\s+is\s+a\s+computer|$)/i,
  /payment\s+terms?\s*[:\-]?\s*([^\n]+)/i,
  /invoice\s+payment\s+due\s+by\s+([^\n]+)/i,
];

const TRAVEL_BANK_PATTERN =
  /(?:^|[-•]\s*)(.+?)\s+bank\s+([A-Za-z][A-Za-z0-9]*)\s*[:\-]?\s*([0-9][0-9\-]+)/im;

const PAGE_MARKER = /--\s*\d+\s+of\s+\d+\s*--/i;

const NULLISH_STRINGS = /^(null|undefined|n\/a|na|-|none)$/i;

export function coerceNullish(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s || NULLISH_STRINGS.test(s)) return null;
  return s;
}

export function isPoOnlyNumber(value?: string | null): boolean {
  return !!value && /^4203\d{6}$/.test(String(value).trim());
}

export function isLikelyInvoiceNumber(value?: string | null): boolean {
  if (!value || isPoOnlyNumber(value)) return false;
  const v = String(value).trim();
  if (INVOICE_NUMBER_BLOCKLIST.has(v.toLowerCase())) return false;
  return /[\/\-.]/.test(v) || /[A-Za-z]{2,}/.test(v);
}

export function parseIndonesianAmount(value?: string | null): number | null {
  if (value == null || value === "") return null;

  let s = String(value).replace(/Rp\.?/gi, "").replace(/\s/g, "").trim();
  s = s.replace(/[^\d.,-]/g, "");
  if (!s) return null;

  const dotCount = (s.match(/\./g) || []).length;
  const commaCount = (s.match(/,/g) || []).length;

  if (dotCount > 1) {
    s = s.replace(/\./g, "");
  } else if (commaCount > 1) {
    s = s.replace(/,/g, "");
  } else if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = s.replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }

  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

export function formatAmountString(value?: string | null): string | null {
  const parsed = parseIndonesianAmount(value);
  return parsed == null ? null : String(parsed);
}

export function splitPdfPages(text: string): string[] {
  const chunks = text.split(PAGE_MARKER).map((part) => part.trim());
  return chunks.filter((part) => part.length > 40);
}

export function scoreInvoicePage(text: string): number {
  let score = 0;
  const upper = text.toUpperCase();

  if (/\bINVOICE\b/.test(upper)) score += 12;
  if (/INVOICE\s*NO/i.test(text)) score += 10;
  if (/GRAND\s*TOTAL/i.test(upper)) score += 8;
  if (/PAYMENT\s*TERM/i.test(upper)) score += 4;
  if (/BANK\s*ACCOUNT|ACCOUNT\s*NAME|BANK\s*ADDRESS|BANK\s*REMITTANCE/i.test(upper)) {
    score += 6;
  }
  if (/DESCRIPTION/i.test(upper) && /AMOUNT/i.test(upper)) score += 7;
  if (/VAT\s*11%|PPN/i.test(upper)) score += 4;
  if (/KWITANSI/i.test(upper)) score += 3;

  if (/APPENDIX\s*-\s*\d+/i.test(text)) score -= 8;
  if (/PRICE\s*BREAKDOWN/i.test(upper)) score -= 10;
  if (/PURCHASE\s*ORDER/i.test(upper) && !/\bINVOICE\b/.test(upper)) score -= 10;
  if (/GENERAL\s*TERMS/i.test(upper)) score -= 12;
  if (/PO\s*(?:NUMBER|NO\.?)/i.test(text) && !/INVOICE\s*NO/i.test(text)) score -= 15;
  if (!/GRAND\s*TOTAL|UNTUK\s*PEMBAYARAN|JUMLAH/i.test(upper)) score -= 4;
  if (/KWITANSI/i.test(upper) && !/GRAND\s*TOTAL/i.test(upper)) score -= 6;

  return score;
}

/** Minimum score for a page to be treated as the invoice page (else vision). */
export const INVOICE_PAGE_MIN_SCORE = 18;

export function invoicePageHasMarker(text: string): boolean {
  return scoreInvoicePage(text) >= INVOICE_PAGE_MIN_SCORE;
}

export function selectInvoicePageText(fullText: string): {
  text: string;
  pageIndex: number;
  pageCount: number;
  score: number;
} {
  const pages = splitPdfPages(fullText);
  if (pages.length <= 1) {
    const score = scoreInvoicePage(fullText);
    return { text: fullText, pageIndex: 1, pageCount: 1, score };
  }

  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  pages.forEach((page, index) => {
    const score = scoreInvoicePage(page);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return {
    text: pages[bestIndex],
    pageIndex: bestIndex + 1,
    pageCount: pages.length,
    score: bestScore,
  };
}

export function extractPoNumber(text: string): string | null {
  const labeled = text.match(PO_LABELED_PATTERN);
  if (labeled?.[1]) return labeled[1];

  const nomor = text.match(PO_NOMOR_PATTERN);
  if (nomor?.[1]) return nomor[1];

  const beforeAppendix = text.split(/appendix\s*-\s*\d+/i)[0] || text;
  const bare = beforeAppendix.match(/\b(4203\d{6})\b/);
  return bare?.[1] || null;
}

function isAleVendor(text?: string | null): boolean {
  return /amanah\s+lestari|pt\.?\s*ale\b/i.test(String(text ?? ""));
}

function isAleInvoiceNumber(value?: string | null): boolean {
  return !!value && /^\d{3}\/PT\.ALE-PAU\/\d{2}\/\d{4}$/i.test(String(value).trim());
}

function extractAleInvoiceFromText(text: string): string | null {
  const labeled = text.match(ALE_INVOICE_LABELED_RE);
  if (labeled?.[1]) return labeled[1];
  const bare = text.match(ALE_INVOICE_RE);
  return bare?.[1] ?? null;
}

function repairAleInvoiceNumber(
  value: string | null | undefined,
  corpus = "",
): string | null {
  const raw = coerceNullish(value);
  if (!raw) return null;
  if (isAleInvoiceNumber(raw)) return raw;

  const parts = raw.split("/").filter(Boolean);
  const pauIdx = parts.findIndex((part) => ALE_PAU_SEGMENT_RE.test(part.trim()));
  if (pauIdx !== 1) return null;

  const dateHint = extractMmYyyyFromCorpus(corpus);
  let month: string | null = null;
  let year: string | null = null;

  if (parts.length === 5 && parts[2] === parts[3]) {
    month = parts[2];
    year = dateHint?.year ?? parts[4];
  } else if (parts.length === 4) {
    month = parts[2];
    year = dateHint?.year ?? parts[3];
  } else {
    return null;
  }

  if (dateHint?.month && dateHint.month === month) {
    year = dateHint.year;
  }

  const prefix =
    ALE_PREFIX_FIX[parts[0].toUpperCase()] ?? ocrLettersToDigits(parts[0]);
  if (!prefix) return null;

  return `${prefix}/PT.ALE-PAU/${month}/${year}`;
}

function finalizeInvoiceNumber(
  value: string | null | undefined,
  corpus: string,
  invoiceDate?: string | null,
): string | null {
  const fullCorpus = [corpus, invoiceDate ? `invoiceDate: ${invoiceDate}` : ""]
    .filter(Boolean)
    .join("\n");

  const fromCorpus = extractAleInvoiceFromText(fullCorpus);
  if (fromCorpus) return fromCorpus;

  const repaired = repairAleInvoiceNumber(value, fullCorpus);
  if (repaired) return repaired;

  const raw = coerceNullish(value);
  if (!raw) return null;
  if (isAleInvoiceNumber(raw)) return raw;

  if (isAleVendor(fullCorpus)) {
    if (isAleLikeOcrValue(raw) || /^INV\//i.test(raw)) return null;
  }

  return isLikelyInvoiceNumber(raw) ? raw : null;
}

export function extractInvoiceNumber(text: string): string | null {
  const aleVendor = isAleVendor(text);

  for (const pattern of INVOICE_NO_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      if (isAleInvoiceNumber(candidate)) return candidate;
      if (
        aleVendor &&
        isAleLikeOcrValue(candidate) &&
        !isAleInvoiceNumber(candidate)
      ) {
        continue;
      }
      if (aleVendor && /^INV\//i.test(candidate) && /-PAU/i.test(candidate)) {
        continue;
      }
      if (isLikelyInvoiceNumber(candidate)) return candidate;
    }
  }

  const repaired = repairAleInvoiceNumber(null, text);
  if (repaired) return repaired;

  return extractAleInvoiceFromText(text);
}

export type InvoiceWorkflow = "PO" | "NON_PO";

export function detectInvoiceWorkflow(
  poNumber?: string | null,
): InvoiceWorkflow {
  const po = coerceNullish(poNumber);
  if (!po) return "NON_PO";
  const digits = po.replace(/\D/g, "");
  return isPoOnlyNumber(digits) ? "PO" : "NON_PO";
}

export function extractPpnAmount(text: string): string | null {
  for (const pattern of PPN_AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const formatted = formatAmountString(match[1]);
    if (formatted != null) return formatted;
  }
  return null;
}

export function extractPaymentTerms(text: string): string | null {
  const block = text.match(
    /terms?\s+of\s+paym?e?nt\s*[:\-]?\s*([\s\S]*?)(?=\n\s*this\s+is\s+a\s+computer|$)/i,
  );
  if (block?.[1]) {
    const bullets = block[1]
      .split("\n")
      .map((line) => line.replace(/^[-•]\s*/, "").trim())
      .filter((line) => line.length >= 8);
    if (bullets.length) return bullets.join(" · ");
  }

  for (const pattern of PAYMENT_TERMS_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const raw = match[1]
      .replace(/\s+/g, " ")
      .replace(/^[-•]\s*/, "")
      .trim();
    if (raw.length >= 8) return raw;
  }
  return null;
}

export function extractTravelBankDetails(text: string): {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
} {
  const match = text.match(TRAVEL_BANK_PATTERN);
  if (!match) {
    return { bankName: null, bankAccount: null, accountHolder: null };
  }

  const holder = match[1].replace(/^[-•]\s*/, "").trim();
  const bankName = `Bank ${match[2].trim()}`;
  const account = match[3].replace(/\s/g, "");

  return {
    bankName,
    bankAccount: account || null,
    accountHolder: holder || null,
  };
}

/** Parse Indonesian receipt lines such as "Bank MANDIRI Cabang Luwuk 151-00-1017369-5 PT. …". */
export function extractIndonesianBankDetails(text: string): {
  bankName: string | null;
  bankAccount: string | null;
  accountHolder: string | null;
  bankBranch: string | null;
} {
  if (!text) {
    return { bankName: null, bankAccount: null, accountHolder: null, bankBranch: null };
  }
  const source = String(text).trim();

  const cabangMatch = source.match(
    /bank\s+(.+?)\s+cabang\s+(.+?)\s+([\d][\d\-\s]+?)\s+(.+)$/i,
  );
  if (cabangMatch) {
    return {
      bankName: `Bank ${cabangMatch[1].trim()}`,
      bankBranch: `Cabang ${cabangMatch[2].trim()}`,
      bankAccount: cabangMatch[3].replace(/\s/g, ""),
      accountHolder: cabangMatch[4].trim(),
    };
  }

  const travel = extractTravelBankDetails(source);
  return { ...travel, bankBranch: null };
}

export function normalizeBankAccountNumber(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits || null;
}

/** True when two bank account values match after stripping separators. */
export function bankAccountsMatch(left: unknown, right: unknown): boolean {
  const a = normalizeBankAccountNumber(left);
  const b = normalizeBankAccountNumber(right);
  if (!a || !b) return false;
  return a === b;
}

function sumLineItemAmounts(
  lineItems: Array<{ amount?: string | null; description?: string | null }>,
): number | null {
  let sum = 0;
  let found = false;
  for (const item of lineItems) {
    const parsed = parseIndonesianAmount(item.amount);
    if (parsed != null && parsed > 0) {
      sum += parsed;
      found = true;
    }
  }
  return found ? sum : null;
}

function reconcileTravelInvoiceTotals(
  header: Record<string, string | null>,
  lineItems: Array<{ amount?: string | null; description?: string | null }>,
  corpus: string,
): Record<string, string | null> {
  const next = { ...header };

  if (!next.taxAmount) {
    const ppn = extractPpnAmount(corpus);
    if (ppn) next.taxAmount = ppn;
  }

  const lineSum = sumLineItemAmounts(lineItems);
  const subtotal = parseIndonesianAmount(next.subtotal);
  const tax = parseIndonesianAmount(next.taxAmount) ?? 0;
  const totalAmount = parseIndonesianAmount(next.totalAmount);
  const grandTotal = parseIndonesianAmount(next.grandTotal);

  if (lineSum != null && (!subtotal || Math.abs(subtotal - lineSum) > 1)) {
    next.subtotal = String(lineSum);
  }

  const resolvedSubtotal =
    parseIndonesianAmount(next.subtotal) ?? lineSum ?? subtotal;

  const saneTax =
    resolvedSubtotal != null && tax > resolvedSubtotal
      ? extractPpnAmount(corpus)
        ? parseIndonesianAmount(extractPpnAmount(corpus))
        : null
      : tax;

  if (resolvedSubtotal != null && saneTax != null && saneTax > 0) {
    const combined = resolvedSubtotal + saneTax;
    if (saneTax !== tax) next.taxAmount = String(saneTax);
    if (grandTotal != null && Math.abs(grandTotal - combined) <= 1) {
      next.grandTotal = String(combined);
      next.totalAmount = String(combined);
    } else if (totalAmount != null && Math.abs(totalAmount - combined) <= 1) {
      next.grandTotal = String(totalAmount);
    } else if (
      totalAmount != null &&
      totalAmount > resolvedSubtotal + 0.5 &&
      Math.abs(totalAmount - combined) <= 1
    ) {
      next.grandTotal = String(totalAmount);
    } else if (!next.grandTotal && !next.totalAmount) {
      next.grandTotal = String(combined);
      next.totalAmount = String(combined);
    } else if (
      grandTotal != null &&
      Math.abs(grandTotal - resolvedSubtotal) < 1 &&
      totalAmount != null &&
      totalAmount > grandTotal
    ) {
      next.grandTotal = String(totalAmount);
    }
  } else if (resolvedSubtotal != null && tax > 0) {
    const combined = resolvedSubtotal + tax;
    if (!next.grandTotal && !next.totalAmount) {
      next.grandTotal = String(combined);
      next.totalAmount = String(combined);
    }
  }

  return next;
}

function flattenTablesToText(tables: unknown[] = []): string {
  const parts: string[] = [];
  for (const table of tables) {
    if (!table || typeof table !== "object") continue;
    const rows = (table as { rows?: unknown[] }).rows;
    if (!Array.isArray(rows) || !rows.length) continue;
    for (const row of rows) {
      if (Array.isArray(row)) {
        const line = row
          .map((cell) => String(cell ?? "").trim())
          .filter(Boolean)
          .join(" ");
        if (line) parts.push(line);
      } else if (row && typeof row === "object") {
        const line = Object.values(row as Record<string, unknown>)
          .map((cell) => String(cell ?? "").trim())
          .filter(Boolean)
          .join(" ");
        if (line) parts.push(line);
      }
    }
  }
  return parts.join("\n");
}

export function buildTextCorpus(
  header: Record<string, string | null>,
  fields: Array<{ fieldName: string; fieldValue: string }>,
  lineItems: Array<object>,
  options: { tables?: unknown[]; summary?: string | null } = {},
): string {
  const { tables, summary } = options;
  return [
    ...Object.entries(header).map(([k, v]) => `${k}: ${v}`),
    ...fields.map((f) => `${f.fieldName}: ${f.fieldValue}`),
    ...lineItems.map((line) =>
      Object.values(line as Record<string, unknown>)
        .filter((v) => v != null && v !== "")
        .join(" "),
    ),
    summary ? String(summary) : "",
    flattenTablesToText(tables),
  ]
    .filter(Boolean)
    .join("\n");
}

export function reconcileInvoiceHeader(
  header: Record<string, string | null>,
  corpus: string,
  lineItems: Array<{ amount?: string | null; description?: string | null }> = [],
): Record<string, string | null> {
  const next = { ...header };
  const extractedInvoice = extractInvoiceNumber(corpus);
  const extractedPo = extractPoNumber(corpus);

  if (extractedInvoice) {
    next.invoiceNumber = extractedInvoice;
  } else if (next.invoiceNumber && isPoOnlyNumber(next.invoiceNumber)) {
    if (!next.poNumber) next.poNumber = next.invoiceNumber;
    next.invoiceNumber = null;
  } else if (next.invoiceNumber && !isLikelyInvoiceNumber(next.invoiceNumber)) {
    next.invoiceNumber = null;
  }

  next.invoiceNumber = finalizeInvoiceNumber(
    next.invoiceNumber,
    [corpus, next.vendorName].filter(Boolean).join("\n"),
    next.invoiceDate,
  );

  if (extractedPo) {
    next.poNumber = extractedPo;
  } else if (next.poNumber && !isPoOnlyNumber(String(next.poNumber).replace(/\D/g, ""))) {
    const digits = String(next.poNumber).replace(/\D/g, "");
    if (!next.ticketNo && /^\d{10}$/.test(digits)) {
      next.ticketNo = String(next.poNumber).trim();
    }
    next.poNumber = null;
  } else if (!next.poNumber && next.invoiceNumber && isPoOnlyNumber(next.invoiceNumber)) {
    next.poNumber = next.invoiceNumber;
    next.invoiceNumber = extractedInvoice;
  }

  if (!next.paymentTerms) {
    const terms = extractPaymentTerms(corpus);
    if (terms) next.paymentTerms = terms;
  }

  if (!next.dueDate) {
    const dueMatch = corpus.match(
      /(?:invoice\s+due\s+date|due\s+date|jatuh\s+tempo)\s*[:\-]?\s*([0-9]{1,2}[-/][A-Za-z]{3,}[-/][0-9]{2,4}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i,
    );
    if (dueMatch?.[1]) next.dueDate = dueMatch[1].trim();
  }

  if (!next.bankAccount || !next.bankName) {
    const bank = extractTravelBankDetails(corpus);
    if (!next.bankName && bank.bankName) next.bankName = bank.bankName;
    if (!next.bankAccount && bank.bankAccount) next.bankAccount = bank.bankAccount;
    if (!next.accountHolder && bank.accountHolder) {
      next.accountHolder = bank.accountHolder;
    }
  }

  if (!next.serviceName && lineItems.length) {
    const primary = lineItems.find((item) => coerceNullish(item.description));
    if (primary?.description) next.serviceName = primary.description.trim();
  }

  const reconciledTotals = reconcileTravelInvoiceTotals(next, lineItems, corpus);
  Object.assign(next, reconciledTotals);

  for (const key of [
    "subtotal",
    "taxAmount",
    "totalAmount",
    "grandTotal",
    "manhourUnitRate",
  ] as const) {
    const formatted = formatAmountString(next[key]);
    if (formatted != null) next[key] = formatted;
  }

  if (!next.grandTotal && next.totalAmount) {
    next.grandTotal = next.totalAmount;
  }
  if (!next.totalAmount && next.grandTotal) {
    next.totalAmount = next.grandTotal;
  }

  next.invoiceWorkflow = detectInvoiceWorkflow(next.poNumber);

  return next;
}

export function normalizeLineItemAmounts<
  T extends {
    amount?: string;
    unitPrice?: string;
    manhourUnitRate?: string;
    quantity?: string;
  },
>(lineItems: T[]): T[] {
  return lineItems.map((item) => {
    const next = { ...item };
    for (const key of [
      "amount",
      "unitPrice",
      "manhourUnitRate",
      "quantity",
    ] as const) {
      const value = next[key];
      if (value) {
        const formatted = formatAmountString(value);
        if (formatted != null) next[key] = formatted;
      }
    }
    return next;
  });
}

type InvoiceLineDraft = {
  description: string | null;
  amount: string | null;
};

function normalizeDescriptionKey(desc: unknown): string {
  return String(desc ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function pickTableCell(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = coerceNullish(row[key]);
    if (value) return value;
  }
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().replace(/\s+/g, " ");
    if (
      keys.some((candidate) => normalized.includes(candidate.toLowerCase())) &&
      coerceNullish(value)
    ) {
      return coerceNullish(value);
    }
  }
  return null;
}

function normalizeInvoiceTableRow(row: Record<string, unknown>): InvoiceLineDraft | null {
  const description = pickTableCell(
    row,
    "description",
    "Description",
    "DESCRIPTION",
    "item",
    "Item",
  );
  if (!description) return null;

  const amountRaw = pickTableCell(
    row,
    "amount",
    "Amount",
    "AMOUNT (IDR)",
    "AMOUNT",
    "Total (IDR)",
    "Total Amount (Rp)",
  );

  return {
    description,
    amount: formatAmountString(amountRaw),
  };
}

export function lineItemsFromTables(tables: unknown[] = []): InvoiceLineDraft[] {
  const tableList = Array.isArray(tables) ? tables : [];
  const table =
    tableList.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        Array.isArray((entry as { rows?: unknown[] }).rows) &&
        (entry as { rows: unknown[] }).rows.length > 0,
    ) || tableList[0];

  if (!table || typeof table !== "object") return [];

  const rows = (table as { rows?: unknown[] }).rows || [];
  if (!rows.length) return [];

  const columnDefs =
    (table as { columns?: unknown[]; headers?: unknown[] }).columns ||
    (table as { headers?: unknown[] }).headers;

  if (!columnDefs?.length) {
    return rows
      .filter((row) => row && typeof row === "object" && !Array.isArray(row))
      .map((row) => normalizeInvoiceTableRow(row as Record<string, unknown>))
      .filter((row): row is InvoiceLineDraft => Boolean(row));
  }

  const headerKeys = columnDefs.map((col, index) => {
    if (typeof col === "string") return col;
    const record = col as { key?: string; name?: string; label?: string };
    return record.key || record.name || record.label || `col_${index}`;
  });

  let dataRows = rows;
  if (dataRows.length && Array.isArray(dataRows[0])) {
    const headerLabels = columnDefs.map((col) =>
      typeof col === "string" ? col : (col as { label?: string; name?: string }).label || (col as { name?: string }).name || "",
    );
    const first = dataRows[0] as unknown[];
    const matchesHeader = headerLabels.every((label, index) => {
      if (!label) return true;
      return (
        String(first[index] ?? "")
          .trim()
          .toLowerCase() === String(label).trim().toLowerCase()
      );
    });
    if (matchesHeader) dataRows = dataRows.slice(1);
  }

  return dataRows
    .map((row) => {
      if (Array.isArray(row)) {
        const record = Object.fromEntries(
          headerKeys.map((key, index) => [key, row[index] ?? null]),
        );
        return normalizeInvoiceTableRow(record);
      }
      if (row && typeof row === "object") {
        return normalizeInvoiceTableRow(row as Record<string, unknown>);
      }
      return null;
    })
    .filter((row): row is InvoiceLineDraft => Boolean(row));
}

function extractAmountNearIndex(text: string, start: number): string | null {
  const slice = text.slice(start, start + 80);
  const match = slice.match(/(?:Rp\.?\s*)?([0-9][0-9.,]+)/i);
  return match ? formatAmountString(match[1]) : null;
}

export function extractInvoiceLinesFromCorpus(corpus: string): InvoiceLineDraft[] {
  const results: InvoiceLineDraft[] = [];
  const seen = new Set<string>();

  const pushLine = (description: unknown, amount: string | null) => {
    const desc = coerceNullish(description);
    if (!desc) return;
    const key = normalizeDescriptionKey(desc);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ description: desc, amount });
  };

  for (const rawLine of corpus.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || line.length < 12) continue;
    if (/^(description|amount|invoice|total|vat|grand total|subtotal)\b/i.test(line)) {
      continue;
    }

    const inlineClaim = line.match(
      /^(\d+(?:st|nd|rd|th)?\s+Claim\s+for\s+.+?)\s+(?:Rp\.?\s*)?([0-9][0-9.,]+)\s*$/i,
    );
    if (inlineClaim) {
      pushLine(inlineClaim[1], formatAmountString(inlineClaim[2]));
      continue;
    }

    const spacedColumns = line.match(/^(.{12,}?)\s{2,}(?:Rp\.?\s*)?([0-9][0-9.,]+)\s*$/);
    if (
      spacedColumns &&
      /claim|direct cost|overtime|stationery|ppe|mcu|overhead|office/i.test(
        spacedColumns[1],
      )
    ) {
      pushLine(spacedColumns[1], formatAmountString(spacedColumns[2]));
    }
  }

  const claimPatterns = [
    /(\d+(?:st|nd|rd|th)?\s+Claim\s+for\s+[\s\S]{0,160}?(?:Direct Cost Welder|Direct Cost Fitter|Overtime Welder|Overtime Fitter|Stationery, Postage, Transportation|Overhead and Profit|Office|MCU|PPE))(?:[\s.:;(-]|$)(?:[\s\S]{0,40}?)(?:Rp\.?\s*)?([0-9][0-9.,]+)/gi,
    /(Direct Cost Welder|Direct Cost Fitter|Overtime Welder|Overtime Fitter)(?:[\s.:;(-]|$)(?:[\s\S]{0,40}?)(?:Rp\.?\s*)?([0-9][0-9.,]+)/gi,
  ];

  for (const pattern of claimPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(corpus)) !== null) {
      pushLine(match[1], formatAmountString(match[2]));
    }
  }

  return results;
}

function mergeInvoiceLineItems(
  existing: InvoiceLineDraft[],
  supplemental: InvoiceLineDraft[],
): InvoiceLineDraft[] {
  const byKey = new Map<string, InvoiceLineDraft>();

  for (const item of existing) {
    const desc = coerceNullish(item.description);
    if (!desc) continue;
    byKey.set(normalizeDescriptionKey(desc), {
      description: desc,
      amount: formatAmountString(item.amount),
    });
  }

  for (const item of supplemental) {
    const desc = coerceNullish(item.description);
    if (!desc) continue;
    const key = normalizeDescriptionKey(desc);
    const amount = formatAmountString(item.amount);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { description: desc, amount });
      continue;
    }
    if (!prev.amount && amount) {
      byKey.set(key, { description: desc, amount });
    }
  }

  const merged: InvoiceLineDraft[] = [];
  const seen = new Set<string>();

  for (const item of existing) {
    const desc = coerceNullish(item.description);
    if (!desc) continue;
    const key = normalizeDescriptionKey(desc);
    if (seen.has(key)) continue;
    seen.add(key);
    const row = byKey.get(key);
    if (row) merged.push(row);
  }

  for (const [key, item] of byKey.entries()) {
    if (!seen.has(key)) merged.push(item);
  }

  return merged;
}

export function reconcileInvoiceLineItems(
  lineItems: Array<{ description?: string | null; amount?: string | null }>,
  tables: unknown[] = [],
  corpus = "",
): InvoiceLineDraft[] {
  const normalizedExisting: InvoiceLineDraft[] = lineItems
    .map((item) => ({
      description: coerceNullish(item.description),
      amount: formatAmountString(item.amount),
    }))
    .filter((item) => item.description);

  const fromTables = lineItemsFromTables(tables);
  const fromCorpus = corpus ? extractInvoiceLinesFromCorpus(corpus) : [];

  let merged = mergeInvoiceLineItems(normalizedExisting, fromTables);
  merged = mergeInvoiceLineItems(merged, fromCorpus);

  if (!merged.length && (fromTables.length || fromCorpus.length)) {
    merged = mergeInvoiceLineItems(fromTables, fromCorpus);
  }

  return merged;
}

export const MANPOWER_INVOICE_AMOUNT_KEYS = [
  "directWelder",
  "directFitter",
  "otWelder",
  "otFitter",
] as const;

export function classifyManpowerInvoiceCategory(
  description: unknown,
): (typeof MANPOWER_INVOICE_AMOUNT_KEYS)[number] | null {
  const upper = String(description ?? "").toUpperCase();
  if (!upper) return null;
  const isWelder = /\bWELDER\b/.test(upper) && !/\bFITTER\b/.test(upper);
  const isFitter = /\bFITTER\b/.test(upper) || /\bPIPE\s*FITTER\b/.test(upper);
  const isDirect = /DIRECT\s*COST/.test(upper);
  const isOvertime = /\bOVERTIME\b/.test(upper) || /\bOT\b/.test(upper);

  if (isDirect && isWelder) return "directWelder";
  if (isDirect && isFitter) return "directFitter";
  if (isOvertime && isWelder) return "otWelder";
  if (isOvertime && isFitter) return "otFitter";
  return null;
}
