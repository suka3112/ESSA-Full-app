/**
 * Apply a single SQL migration file.
 * Postgres: runs the file as one script (GO batches are stripped).
 * MSSQL leftover files that use GO still work via the same split.
 * Usage (loads .env.dev via npm script — required for DB_PASSWORD):
 *   npm run migrate:sql -- db/migrations/028_ESSA_AUDIT_EVENT_PG.sql
 *
 * Or explicitly:
 *   npx dotenv -e .env.dev -- npx ts-node db/run-sql-migration.ts db/migrations/028_ESSA_AUDIT_EVENT_PG.sql
 */
import fs from "fs";
import path from "path";
import { sequelize, verifyDBConnection } from "../src/config/sequelize";

async function main() {
  const rel = process.argv[2];
  if (!rel) {
    console.error(
      "Usage: npm run migrate:sql -- <path-to-migration.sql>",
    );
    process.exit(1);
  }

  if (typeof process.env.DB_PASSWORD !== "string" || !process.env.DB_PASSWORD) {
    console.error(
      "DB_PASSWORD is missing. Run via: npm run migrate:sql -- <path>\n" +
        "(That loads .env.dev. Plain `ts-node` will not.)",
    );
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Applying migration: ${filePath}`);
  await verifyDBConnection();

  const sql = fs.readFileSync(filePath, "utf8");
  const dialect = sequelize.getDialect();
  const batches = sql
    .split(/^\s*GO\s*$/gim)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (dialect === "postgres") {
    const script = batches.join("\n");
    console.log(`  postgres script (${batches.length} GO batch(es))…`);
    await sequelize.query(script);
  } else {
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      console.log(`  batch ${i + 1}/${batches.length}…`);
      await sequelize.query(batch);
    }
  }

  console.log("Migration applied.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
