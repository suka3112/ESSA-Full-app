import { fillTemplate, getPromptsConfig } from "./loadConfig.js";
import {
  buildExtractionJsonExample,
  getDocumentSchema,
} from "../constants/documentFieldSchemas.js";
import { getDocumentExtractionHints } from "./documentExtractionHints.js";

function buildSchemaInstruction(categoryId) {
  const resolved = getDocumentSchema(categoryId);
  if (!resolved) return "";

  const { schema, schemaId } = resolved;
  const jsonExample = buildExtractionJsonExample(categoryId);
  const typeHints = getDocumentExtractionHints(schemaId);

  const mirrorNote =
    schema.entries?.mirrorLineItems
      ? `- Mirror every "${schema.entries.key}" row identically in "lineItems" (same order, same values)`
      : "";

  return [
    "",
    "ESSA structured extraction — return JSON matching this EXACT shape every time:",
    jsonExample,
    "",
    "Rules:",
    `- Document code: ${schema.typeCode} — ${schema.typeLabel}`,
    "- Include every key shown above on every call; use null for missing scalars",
    schema.entries
      ? `- Put repeatable table rows in "${schema.entries.key}"; each row uses keys: ${schema.entries.fields.map((field) => field.key).join(", ")}`
      : "- No entry array for this type; keep lineItems as []",
    mirrorNote,
    "- header holds document-level scalar fields only",
    "- fields and tables are optional extras; prefer header and entry array keys",
    "- Do not rename, omit, or add keys outside this schema",
    "- Do not invent values not present in the document",
    "- PO numbers must come only from this document's own pages — never from the upload filename or other documents in the bundle",
    typeHints ? ["", "Document-specific extraction rules:", typeHints].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Prompt Builder–only mode: ZERO ocr-demo schema / documentExtractionHints /
 * extraction system templates. The Prompt Builder text is the entire extraction
 * template, plus a fixed JSON response contract so downstream merging works.
 */
function buildPromptBuilderOnlyPrompt(extractionPrompt) {
  return {
    system: [
      "You are a document OCR extraction engine.",
      "Use ONLY the extraction template below. Do not use any other built-in document schemas, field catalogs, or extraction hints.",
      "Return valid JSON only. Use null for missing values. Do not invent values.",
      "",
      "CRITICAL RESPONSE SHAPE:",
      "Return ONE flat JSON object with top-level keys exactly:",
      '- "header": object of ALL scalar fields from the template (exact field names as keys)',
      '- "invoiceLineItems": array of line-item objects (use [] if none)',
      '- "lineItems": mirror of invoiceLineItems (same rows, same order)',
      "Do NOT nest fields under document names like \"Invoice\": { ... }.",
      "Do NOT put scalar invoice fields only at the JSON root — put them under header.",
      "Include every scalar key listed in the template inside header (null if absent).",
      "",
      extractionPrompt,
    ].join("\n"),
    user: "Extract structured data from the document. Return JSON with header + invoiceLineItems + lineItems only.",
  };
}

export function getDynamicExtractionPrompt(categoryId, categoryLabel, options = {}) {
  const override = String(options.extractionPrompt || "").trim();
  if (override) {
    return buildPromptBuilderOnlyPrompt(override);
  }

  const prompts = getPromptsConfig().extraction;
  const schemaInstruction = buildSchemaInstruction(categoryId);
  return {
    system: `${fillTemplate(prompts.systemTemplate, { categoryId, categoryLabel })}${schemaInstruction}`,
    user: fillTemplate(prompts.userTemplate, { categoryId, categoryLabel }),
  };
}

export function getVisionExtractionPrompt(categoryId, categoryLabel, options = {}) {
  const override = String(options.extractionPrompt || "").trim();
  if (override) {
    return buildPromptBuilderOnlyPrompt(override);
  }

  const prompts = getPromptsConfig().visionExtraction;
  const schemaInstruction = buildSchemaInstruction(categoryId);
  return {
    system: `${fillTemplate(prompts.systemTemplate, { categoryId, categoryLabel })}${schemaInstruction}`,
    user: fillTemplate(prompts.userTemplate, { categoryId, categoryLabel }),
  };
}
