/**
 * Create ESSA AP SharePoint folder layout (spec 7.1 / 7.4):
 *
 *   {BASE}/
 *     Incoming/     ← watch folder (SHAREPOINT_FOLDER_PATH)
 *     Filed/        ← archive root; Year/Month/Vendor[/PO] created later when filing
 *     Exception/    ← rejects / AP review holding area
 *
 * Usage:
 *   npx dotenv -e .env.dev -- npx ts-node db/setup-sharepoint-folders.ts
 *
 * Optional env:
 *   SHAREPOINT_BASE_PATH=ESSA AP Intake   (default)
 */
import { join } from "path";
import dotenv from "dotenv";
import { argv } from "process";

const envFile = [".env", ".env.dev", ".env.prod"].includes(argv[2] ?? "")
  ? argv[2]
  : ".env.dev";
dotenv.config({ path: join(__dirname, "..", envFile) });

import {
  ensureFolderPath,
  getFolderByPath,
} from "../src/helpers/microsoftGraphSharePoint.client";

const BASE = String(
  process.env.SHAREPOINT_BASE_PATH || "ESSA AP Intake",
)
  .trim()
  .replace(/^\/+|\/+$/g, "");

async function main() {
  if (
    !process.env.GRAPH_TENANT_ID ||
    !process.env.GRAPH_CLIENT_ID ||
    !process.env.GRAPH_CLIENT_SECRET
  ) {
    throw new Error("GRAPH_TENANT_ID / CLIENT_ID / CLIENT_SECRET required");
  }
  if (!process.env.SHAREPOINT_SITE_ID || !process.env.SHAREPOINT_DRIVE_ID) {
    throw new Error("SHAREPOINT_SITE_ID and SHAREPOINT_DRIVE_ID required");
  }

  const incoming = `${BASE}/Incoming`;
  const filed = `${BASE}/Filed`;
  const exception = `${BASE}/Exception`;

  console.log(`Base path: ${BASE}`);
  console.log("Ensuring folders…");

  const results = [];
  for (const path of [BASE, incoming, filed, exception]) {
    const item = await ensureFolderPath(path);
    results.push({
      path,
      id: item.id,
      webUrl: item.webUrl || null,
      existed: Boolean(await getFolderByPath(path)),
    });
    console.log(`  OK  ${path}`);
    if (item.webUrl) console.log(`      ${item.webUrl}`);
  }

  console.log("\nSet these in .env.dev (poller watches Incoming only):\n");
  console.log(`SHAREPOINT_FOLDER_PATH=${incoming}`);
  console.log(`SHAREPOINT_FILED_ROOT=${filed}`);
  console.log(`SHAREPOINT_EXCEPTION_ROOT=${exception}`);
  console.log(`SHAREPOINT_INTAKE_ENABLED=true`);
  console.log(`\nFiled layout (created later per invoice, not now):`);
  console.log(`  PO:     ${filed}/{Year}/{Month}/{Vendor}/{PO}/`);
  console.log(`  Non-PO: ${filed}/{Year}/{Month}/{Vendor}/`);
  console.log("\nDone.", { folders: results.length });
}

main().catch((err) => {
  const code = err?.code || err?.body?.code || err?.statusCode;
  const msg = err?.message || String(err);
  console.error("SharePoint folder setup failed:", msg);
  if (err?.body) console.error(err.body);

  if (
    String(code).toLowerCase().includes("accessdenied") ||
    /access denied/i.test(msg)
  ) {
    console.error(`
Access denied creating folders. The Graph app can READ but not WRITE this drive.

Fix (pick one):
  1) Azure app: grant Sites.ReadWrite.All and/or Files.ReadWrite.All (application) + admin consent,
     then re-run: npm run setup:sharepoint-folders

  2) Create folders manually in OneDrive / SharePoint under "${BASE}":
       Incoming/
       Filed/
       Exception/
     Keep .env.dev pointing at:
       SHAREPOINT_FOLDER_PATH=${BASE}/Incoming
       SHAREPOINT_FILED_ROOT=${BASE}/Filed
       SHAREPOINT_EXCEPTION_ROOT=${BASE}/Exception

  Year/Month/Vendor[/PO] under Filed are created later when filing is implemented.
`);
  }
  process.exit(1);
});

