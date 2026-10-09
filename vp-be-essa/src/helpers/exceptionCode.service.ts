import { EssaExceptionCode } from "../models/essaExceptionCode";
import { EssaExceptionRuleMap } from "../models/essaExceptionRuleMap";

export type ExceptionCodeRecord = {
  code: string;
  exceptionType: string;
  name: string;
  meaning: string;
  documentName: string | null;
  status: string;
  sortOrder: number;
};

export type ExceptionRuleMapRecord = {
  ruleCode: string;
  matchHint: string;
  exceptionCode: string;
};

export type ResolvedException = {
  code: string;
  exceptionType: string;
  name: string;
  meaning: string;
  documentName: string | null;
};

function missingItems(message: string): string[] | null {
  const match = String(message || "").match(/missing:\s*([\s\S]+)/i);
  if (!match) return null;
  return match[1]
    .replace(/\.\s*$/, "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function itemMatchesHint(item: string, hint: string): boolean {
  const left = item.toLowerCase();
  const right = hint.toLowerCase();
  return left.includes(right) || right.includes(left);
}

/**
 * Map one failed validation rule onto the exception-code catalogue.
 * A hint matches only when the failure names that document. Other missing
 * documents on the same rule still use the rule's default code.
 */
export function resolveRuleExceptions(
  ruleCode: string,
  message: string | null,
  maps: ExceptionRuleMapRecord[],
  byCode: Map<string, ExceptionCodeRecord>,
): ResolvedException[] {
  const forRule = maps.filter((row) => row.ruleCode === ruleCode);
  const hints = forRule.filter((row) => row.matchHint);
  const fallback = forRule.find((row) => !row.matchHint);
  const chosen: ResolvedException[] = [];

  const add = (code: string) => {
    const row = byCode.get(code);
    if (!row || row.status !== "ACTIVE") return;
    if (chosen.some((item) => item.code === row.code)) return;
    chosen.push({
      code: row.code,
      exceptionType: row.exceptionType,
      name: row.name,
      meaning: row.meaning,
      documentName: row.documentName,
    });
  };

  if (hints.length) {
    const items = missingItems(message || "");
    if (items) {
      let uncovered = false;
      for (const item of items) {
        const hits = hints.filter((hint) => itemMatchesHint(item, hint.matchHint));
        if (hits.length) hits.forEach((hint) => add(hint.exceptionCode));
        else uncovered = true;
      }
      if (uncovered && fallback) add(fallback.exceptionCode);
    } else if (fallback) {
      add(fallback.exceptionCode);
    }
  } else if (fallback) {
    add(fallback.exceptionCode);
  }

  return chosen;
}

export async function loadExceptionCatalogue(): Promise<{
  codes: ExceptionCodeRecord[];
  maps: ExceptionRuleMapRecord[];
}> {
  const [codeRows, mapRows] = await Promise.all([
    EssaExceptionCode.findAll({ order: [["SortOrder", "ASC"], ["Code", "ASC"]] }),
    EssaExceptionRuleMap.findAll(),
  ]);

  return {
    codes: codeRows.map((row) => ({
      code: row.Code,
      exceptionType: row.ExceptionType,
      name: row.Name,
      meaning: row.Meaning,
      documentName: row.DocumentName,
      status: row.Status,
      sortOrder: Number(row.SortOrder) || 0,
    })),
    maps: mapRows.map((row) => ({
      ruleCode: row.RuleCode,
      matchHint: row.MatchHint || "",
      exceptionCode: row.ExceptionCode,
    })),
  };
}

export async function listActiveExceptionCodes(): Promise<ExceptionCodeRecord[]> {
  const { codes } = await loadExceptionCatalogue();
  return codes.filter((row) => row.status === "ACTIVE");
}
