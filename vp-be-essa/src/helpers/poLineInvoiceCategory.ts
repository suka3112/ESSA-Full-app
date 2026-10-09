/**
 * Map a service PO (series 4203, shared by several invoice types) to one
 * invoice category from PO appendix line text.
 *
 * Longer codes win. Everything except letters and digits is ignored, so
 * "Food & Beverage", "food+beverage" and "food_beverage" compare as the same token.
 */

export const PO_LINE_CATEGORY_RULES: Array<{
  code: string;
  invoiceTypeId: string;
}> = [
  { code: "mpwr_svc-sup", invoiceTypeId: "HOUSEKEEPING" },
  { code: "hrg-lift_eqp", invoiceTypeId: "RENTAL_EQUIPMENT" },
  { code: "rental", invoiceTypeId: "RENTAL_EQUIPMENT" },
  { code: "mpwr_svc", invoiceTypeId: "MANPOWER_SERVICES" },
  { code: "manpower_service", invoiceTypeId: "MANPOWER_SERVICES" },
  { code: "technical_service", invoiceTypeId: "CIVIL_CONTRACTOR" },
  { code: "food+bevrg-meal", invoiceTypeId: "CAMP_SERVICE_AND_CATERING" },
  { code: "food+bevrg", invoiceTypeId: "CAMP_SERVICE_AND_CATERING" },
  { code: "food+beverage", invoiceTypeId: "CAMP_SERVICE_AND_CATERING" },
  { code: "camp maintenance", invoiceTypeId: "CAMP_SERVICE_AND_CATERING" },
  { code: "mnt_svc-bldg", invoiceTypeId: "CAMP_SERVICE_AND_CATERING" },
];

export type PoLineCategoryMatch = {
  invoiceTypeId: string | null;
  /** Distinct categories hit across the lines. More than one means review. */
  invoiceTypeIds: string[];
  matchedCodes: string[];
};

/** Lowercase and keep letters and digits, so "Food & Beverage" matches "food+beverage". */
export function normalizePoLineToken(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const RULES_BY_LENGTH = PO_LINE_CATEGORY_RULES.map((rule) => ({
  ...rule,
  token: normalizePoLineToken(rule.code),
})).sort((a, b) => b.token.length - a.token.length);

/**
 * One category when every matching line agrees. Lines with no keyword are
 * ignored. No keyword, or two categories, leaves invoiceTypeId null.
 */
export function matchInvoiceCategoryFromLineTexts(
  texts: string[],
): PoLineCategoryMatch {
  const matchedCodes = new Set<string>();
  const invoiceTypeIds = new Set<string>();

  for (const text of texts || []) {
    const normalized = normalizePoLineToken(text);
    if (!normalized) continue;
    const hit = RULES_BY_LENGTH.find(
      (rule) => rule.token && normalized.includes(rule.token),
    );
    if (!hit) continue;
    matchedCodes.add(hit.code);
    invoiceTypeIds.add(hit.invoiceTypeId);
  }

  let ids = [...invoiceTypeIds];
  // Crane/equipment rental POs also carry MPWR_SVC operator lines.
  // Those operator lines stay with rental instead of forcing a review.
  if (
    ids.includes("RENTAL_EQUIPMENT") &&
    ids.includes("MANPOWER_SERVICES") &&
    ids.every((id) => id === "RENTAL_EQUIPMENT" || id === "MANPOWER_SERVICES")
  ) {
    ids = ["RENTAL_EQUIPMENT"];
  }
  return {
    invoiceTypeId: ids.length === 1 ? ids[0] : null,
    invoiceTypeIds: ids,
    matchedCodes: [...matchedCodes],
  };
}
