import { Model, ModelStatic } from "sequelize";

/**
 * Recursively remap where-clause keys to the model's actual attribute names
 * (case-insensitive). Needed for Postgres quoted identifiers after MSSQL migration.
 */
export function remapWhereToModelAttrs(
  where: any,
  attrByLower: Record<string, string>,
): void {
  if (!where || typeof where !== "object" || where instanceof Date) return;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(where)) return;

  if (Array.isArray(where)) {
    for (const item of where) remapWhereToModelAttrs(item, attrByLower);
    return;
  }

  for (const sym of Object.getOwnPropertySymbols(where)) {
    remapWhereToModelAttrs(where[sym], attrByLower);
  }

  for (const key of Object.keys(where)) {
    const canonical = attrByLower[key.toLowerCase()];
    if (canonical && canonical !== key && where[canonical] === undefined) {
      where[canonical] = where[key];
      delete where[key];
    }
  }

  for (const key of Object.keys(where)) {
    const val = where[key];
    if (Array.isArray(val)) {
      for (const item of val) remapWhereToModelAttrs(item, attrByLower);
    }
  }
}

function buildAttrMap(model: ModelStatic<Model>): Record<string, string> {
  const map: Record<string, string> = {};
  const attrs = model.rawAttributes || {};
  for (const attrName of Object.keys(attrs)) {
    map[attrName.toLowerCase()] = attrName;
    const field = (attrs[attrName] as any).field;
    if (field && typeof field === "string") {
      map[field.toLowerCase()] = attrName;
    }
  }
  return map;
}

/**
 * Apply before* hooks so where keys like `id` / `Is_Deleted` / `Vendor_Id`
 * resolve to the model's real attribute casing.
 */
export function applyPostgresCaseHooks(model: ModelStatic<Model>): void {
  const attrByLower = buildAttrMap(model);

  const fix = (options: any) => {
    if (options?.where) remapWhereToModelAttrs(options.where, attrByLower);
  };

  model.addHook("beforeFind", fix);
  model.addHook("beforeCount", fix);
  model.addHook("beforeUpdate", fix);
  model.addHook("beforeDestroy", fix);
  model.addHook("beforeBulkUpdate", fix);
  model.addHook("beforeBulkDestroy", fix);
}
