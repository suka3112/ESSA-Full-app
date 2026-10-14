/**
 * WHT rule taxonomy — the only valid Category → Condition → Sub-condition combinations,
 * taken from the WHT Matrix update (Oct 2026). The WHT article and reference master are
 * fixed per combination, so the rule form does not ask for them.
 *
 * Served to the screen (GET /wht-config) so the dependent dropdowns and the server
 * validation use the same source.
 */

export type WhtSubCondition = { code: string; label: string; reference?: string | null };
export type WhtCondition = {
  code: string;
  label: string;
  article: string;
  reference?: string | null;
  subConditions: WhtSubCondition[];
};
export type WhtCategory = { code: string; label: string; step: number; note?: string; conditions: WhtCondition[] };

export const WHT_TAXONOMY: WhtCategory[] = [
  {
    code: "OFFSHORE",
    label: "Offshore",
    step: 1,
    conditions: [
      { code: "NO_DGT", label: "No DGT Form", article: "Art. 26", subConditions: [] },
      {
        code: "WITH_DGT",
        label: "With DGT Form",
        article: "Art. 26",
        reference: "TAX_TREATY",
        subConditions: [
          { code: "DIVIDEND_INTEREST", label: "Dividend / Interest" },
          { code: "SERVICES", label: "Services" },
          { code: "ROYALTY", label: "Royalty" },
          { code: "TECHNICAL_SERVICE", label: "Technical Service" },
        ],
      },
    ],
  },
  {
    code: "INDIVIDUAL",
    label: "Individual Vendor",
    step: 2,
    conditions: [{ code: "NOT_RENTAL", label: "Not Rental", article: "Art. 21", reference: "PPH21_TARIFF", subConditions: [] }],
  },
  {
    code: "FACILITY",
    label: "Facility",
    step: 3,
    note: "Domestic company",
    conditions: [
      { code: "HAS_SKB", label: "Has SKB", article: "Art. 23", reference: "SKB", subConditions: [] },
      { code: "PP23", label: "PP23 Eligible", article: "Art. 4(2)", reference: "PP23", subConditions: [] },
    ],
  },
  {
    code: "RENTAL",
    label: "Rental",
    step: 4,
    note: "Domestic company",
    conditions: [
      { code: "LAND_BUILDING", label: "Land / Building", article: "Art. 4(2)", subConditions: [] },
      { code: "MOVABLE_ASSET", label: "Movable Asset", article: "Art. 23", subConditions: [] },
    ],
  },
  {
    code: "CONSTRUCTION",
    label: "Construction",
    step: 5,
    note: "Domestic company",
    conditions: [
      {
        code: "EXECUTION",
        label: "Execution",
        article: "Art. 4(2)",
        subConditions: [
          { code: "SBUJK_SMALL", label: "SBUJK + Small", reference: "SBUJK" },
          { code: "SBUJK_NON_SMALL", label: "SBUJK + Non-small", reference: "SBUJK" },
          { code: "NO_SBUJK", label: "No SBUJK" },
        ],
      },
      {
        code: "PLANNING_CONSULTING",
        label: "Planning / Consulting",
        article: "Art. 4(2)",
        subConditions: [
          { code: "SBUJK", label: "SBUJK", reference: "SBUJK" },
          { code: "NO_SBUJK", label: "No SBUJK" },
        ],
      },
    ],
  },
  {
    code: "SERVICE",
    label: "Service",
    step: 6,
    note: "Domestic company",
    conditions: [
      { code: "NOT_VAT", label: "Not Subject to VAT", article: "Art. 23", subConditions: [] },
      { code: "FREIGHT_TRAVEL", label: "Freight / Travel", article: "Art. 23", subConditions: [] },
      { code: "ROYALTY_LICENSE", label: "Royalty / License", article: "Art. 23", subConditions: [] },
      { code: "INTEREST", label: "Interest", article: "Art. 23", subConditions: [] },
      { code: "DOMESTIC_SHIPPING", label: "Domestic Shipping", article: "Art. 15", subConditions: [] },
      { code: "DOMESTIC_AIRLINE", label: "Domestic Airline", article: "Art. 15", subConditions: [] },
      { code: "FOREIGN_SHIPPING", label: "Foreign Shipping", article: "Art. 15", subConditions: [] },
    ],
  },
  {
    code: "DEFAULT",
    label: "Default",
    step: 7,
    note: "Domestic company",
    conditions: [{ code: "OTHER_SERVICES", label: "Other Services", article: "Art. 23", subConditions: [] }],
  },
];

/** SAP WHT codes used by the WHT Matrix (one rule row per code). */
export const SAP_WHT_CODES: { code: string; group: string }[] = [
  ...["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "H1", "H2", "H3", "H5"].map((code) => ({ code, group: "Art. 26 (offshore)" })),
  { code: "D1", group: "Art. 21 (individual)" },
  ...["E1", "E2", "E3", "E5", "E7", "E8", "E9"].map((code) => ({ code, group: "Art. 23" })),
  ...["I1", "I2", "I3", "I4", "I5", "I6", "I7"].map((code) => ({ code, group: "Art. 4(2)" })),
  ...["J1", "J2", "J3"].map((code) => ({ code, group: "Art. 15" })),
];

export const RATE_TYPES = [
  { value: "FIXED", label: "Percentage" },
  { value: "TREATY", label: "Tax treaty rate" },
  { value: "PROGRESSIVE", label: "Progressive (PPh 21)" },
];

export function resolveCombination(categoryCode: string, conditionCode: string, subConditionCode?: string | null) {
  const category = WHT_TAXONOMY.find((c) => c.code === categoryCode);
  if (!category) return { error: "Select a valid category" };
  const condition = category.conditions.find((c) => c.code === conditionCode);
  if (!condition) return { error: `"${conditionCode || "—"}" is not a condition of ${category.label}` };
  let sub: WhtSubCondition | null = null;
  if (condition.subConditions.length) {
    sub = condition.subConditions.find((s) => s.code === subConditionCode) || null;
    if (!sub) return { error: `Select a sub-condition for ${category.label} · ${condition.label}` };
  } else if (subConditionCode) {
    return { error: `${condition.label} has no sub-conditions` };
  }
  return { category, condition, sub, reference: sub?.reference ?? condition.reference ?? null };
}

export function categoryOfLabel(label: string) {
  return WHT_TAXONOMY.find((c) => c.label.toLowerCase() === String(label || "").toLowerCase());
}
