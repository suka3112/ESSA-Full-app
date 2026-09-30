import { getCategoryGroupingPrompts } from "../config/classificationPrompt.js";
import {
  createOpenAiClient,
  requireOpenAi,
  resolveModel,
} from "../config/openai.js";
import { slugifyCategoryId } from "../constants/categoryUtils.js";
import {
  getAllowedCategoryIds,
  resolveCanonicalCategoryId,
} from "../constants/documentFieldSchemas.js";

const DISTINCT_DOCUMENT_TYPES = new Set(getAllowedCategoryIds());

function canonicalDocumentType(categoryId) {
  const resolved = resolveCanonicalCategoryId(categoryId);
  return DISTINCT_DOCUMENT_TYPES.has(resolved) ? resolved : categoryId;
}

function sanitizeCategoryGroups(rawGroups, categoryIds) {
  const allowed = new Set(categoryIds);
  const assigned = new Set();
  /** @type {Record<string, string[]>} */
  const groups = {};

  for (const members of Object.values(rawGroups || {})) {
    if (!Array.isArray(members)) continue;

    const validMembers = members
      .map((member) => slugifyCategoryId(member))
      .filter((member) => allowed.has(member) && !assigned.has(member));

    if (!validMembers.length) continue;

    /** @type {Map<string, string[]>} */
    const buckets = new Map();
    for (const member of validMembers) {
      const typeId = canonicalDocumentType(member);
      const bucket = buckets.get(typeId) || [];
      bucket.push(member);
      buckets.set(typeId, bucket);
    }

    for (const [typeId, bucket] of buckets) {
      if (bucket.length < 2) continue;
      groups[typeId] = bucket;
      for (const member of bucket) {
        assigned.add(member);
      }
    }
  }

  return groups;
}

/**
 * Ask AI which detected categories should be merged for split/extraction.
 * @param {string[]} categoryIds
 * @param {{ invoiceTypeId?: string, catalog?: object }} [options]
 */
export async function resolveCategoryGroupsWithAI(categoryIds, options = {}) {
  const uniqueIds = [
    ...new Set(categoryIds.map((id) => slugifyCategoryId(id))),
  ].filter(Boolean);
  if (uniqueIds.length <= 1) return {};

  requireOpenAi();

  const client = await createOpenAiClient();
  if (!client) return {};

  const prompts = getCategoryGroupingPrompts(
    options.invoiceTypeId,
    options.catalog,
  );
  const model = resolveModel("classification");

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompts.system },
      {
        role: "user",
        content: `${prompts.user}\n\nDetected categoryIds:\n${JSON.stringify(uniqueIds)}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return {};

  const parsed = JSON.parse(content);
  return sanitizeCategoryGroups(parsed.groups, uniqueIds);
}
