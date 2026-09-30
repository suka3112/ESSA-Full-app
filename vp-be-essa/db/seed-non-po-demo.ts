/**
 * Non-PO invoice demo seed for MSSQL (ESSA internal AP / ap.team@essa.com).
 *
 * Prerequisites:
 *   1. db/migrations/002_ESSA_Roles_Users.sql (roles)
 *   2. npm run seed:essa-users  (Putri + AP chain users)
 *   3. At least one Entity row in ENTITY
 *
 * Usage:
 *   npm run seed:nonpo              — insert demo invoices + vendors
 *   npm run seed:nonpo:undo         — remove demo invoices (tagged in Remarks)
 *   npm run seed:nonpo:undo -- --remove-vendors
 *                                   — also remove seed travel vendors if unused
 *
 * Idempotent seed: re-run replaces prior demo rows (same ESSA_DEMO_NPO tag).
 */
import { Op, Sequelize } from "sequelize";
import { verifyDBConnection } from "../src/config/sequelize";
import "../src/models/employee";
import "../src/models/user";
import "../src/models/entity";
import "../src/models/vendor";
import "../src/models/invoices";
import { Employee } from "../src/models/employee";
import { User } from "../src/models/user";
import { Entity } from "../src/models/entity";
import { Vendor } from "../src/models/vendor";
import { InvoiceHeader } from "../src/models/invoices";
import { InvoiceDetail } from "../src/models/invoicePoMapping";
import { ApValidationResult } from "../src/models/apValidationResult";
import { ApDocument } from "../src/models/apDocument";
import { ApDocumentExtraction } from "../src/models/apDocumentExtraction";
import { UserRole } from "../src/utils/enums/role.enum";

const args = process.argv.slice(2);
const isUndo = args.includes("--undo");
const removeVendors = args.includes("--remove-vendors");

/** Prefix for Remarks — avoid SQL LIKE `[]` wildcards; max 50 chars in INVOICE_HEADER.Remarks */
const DEMO_TAG = "ESSA_DEMO_NPO";
const PUTRI_EMAIL = "ap.team@essa.com";
const INVOICE_CATEGORY_NON_PO = 2;

type SeedVendor = {
  sapCode: string;
  name: string;
  email: string;
  bankName?: string;
  bankAccount?: string;
  isVat: boolean;
};

type SeedInvoice = {
  invNo: string;
  displayRef: string;
  vendorSap: string;
  invDate: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  statusId: number;
  remarks: string;
};

const VENDORS: SeedVendor[] = [
  {
    sapCode: "WKA0000001",
    name: "PT Wisata Kawan Abadi",
    email: "finance@wisatakawan.id",
    bankName: "Bank BCA",
    bankAccount: "6970747999",
    isVat: false,
  },
  {
    sapCode: "CCT0000001",
    name: "PT Citilink Corporate Travel",
    email: "billing@citilinkcorp.id",
    bankName: "Bank Mandiri",
    bankAccount: "8801223344",
    isVat: false,
  },
  {
    sapCode: "NEH0000001",
    name: "PT Nusantara Express Hotel",
    email: "ap@nusantaraexpress.id",
    bankName: "Bank BNI",
    bankAccount: "9902334455",
    isVat: false,
  },
  {
    sapCode: "TKS0000001",
    name: "PT Trans Kaltim Shuttle",
    email: "finance@transkaltim.id",
    bankName: "Bank BCA",
    bankAccount: "8813445566",
    isVat: false,
  },
  {
    sapCode: "NTK0000001",
    name: "PT NUSANTARA TEKNIK",
    email: "finance@nusantarateknik.id",
    bankName: "Bank BCA",
    bankAccount: "7700112233",
    isVat: false,
  },
  {
    sapCode: "GAC0000001",
    name: "PT Garuda Aviation Charter",
    email: "billing@garudacharter.id",
    bankName: "Bank Mandiri",
    bankAccount: "5566778899",
    isVat: false,
  },
  {
    sapCode: "IPA0000001",
    name: "PT Indo Pacific Air Services",
    email: "ap@indopacificair.id",
    bankName: "Bank BNI",
    bankAccount: "3344556677",
    isVat: false,
  },
];

const INVOICES: SeedInvoice[] = [
  {
    invNo: "TD00061526",
    displayRef: "INV/TD/000615/2026",
    vendorSap: "TKS0000001",
    invDate: "2026-05-20",
    dueDate: "2026-06-19",
    amount: 780_000,
    taxAmount: 0,
    statusId: 12,
    remarks: "DoA ≤2M HOS · shuttle · paid",
  },
  {
    invNo: "TD00060226",
    displayRef: "INV/TD/000602/2026",
    vendorSap: "NEH0000001",
    invDate: "2026-06-05",
    dueDate: "2026-07-05",
    amount: 1_850_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA ≤2M HOS · hotel · awaiting HOS",
  },
  {
    invNo: "DOA00314126",
    displayRef: "INV/TD/DOA/003141/2026",
    vendorSap: "WKA0000001",
    invDate: "2026-06-08",
    dueDate: "2026-07-08",
    amount: 3_144_210,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA 2–5M HOS→HOD · awaiting HOS",
  },
  {
    invNo: "TD00058826",
    displayRef: "INV/TD/000588/2026",
    vendorSap: "CCT0000001",
    invDate: "2026-06-07",
    dueDate: "2026-07-07",
    amount: 3_680_000,
    taxAmount: 0,
    statusId: 1,
    remarks: "DoA 2–5M HOS→HOD · parked · awaiting HOD",
  },
  {
    invNo: "TD00057726",
    displayRef: "INV/TD/000577/2026",
    vendorSap: "CCT0000001",
    invDate: "2026-06-03",
    dueDate: "2026-07-03",
    amount: 4_250_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA 2–5M HOS→HOD · awaiting HOS",
  },
  {
    invNo: "NTK00981225",
    displayRef: "INV/NTK/2025/12/0098",
    vendorSap: "NTK0000001",
    invDate: "2025-12-18",
    dueDate: "2026-01-18",
    amount: 6_200_000,
    taxAmount: 0,
    statusId: 1,
    remarks: "DoA 5–15M HOD→HOF · parked · awaiting HOF",
  },
  {
    invNo: "DOA00850026",
    displayRef: "INV/TD/DOA/008500/2026",
    vendorSap: "NTK0000001",
    invDate: "2026-06-04",
    dueDate: "2026-07-04",
    amount: 8_500_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA 5–15M HOD→HOF · awaiting HOD",
  },
  {
    invNo: "DOA02800026",
    displayRef: "INV/TD/DOA/028000/2026",
    vendorSap: "GAC0000001",
    invDate: "2026-05-28",
    dueDate: "2026-06-28",
    amount: 28_000_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA 15–50M HOD→HOF→STH · awaiting HOD",
  },
  {
    invNo: "DOA03200026",
    displayRef: "INV/TD/DOA/032000/2026",
    vendorSap: "GAC0000001",
    invDate: "2026-05-25",
    dueDate: "2026-06-25",
    amount: 32_000_000,
    taxAmount: 0,
    statusId: 1,
    remarks: "DoA 15–50M HOD→HOF→STH · parked · awaiting STH",
  },
  {
    invNo: "DOA07200026",
    displayRef: "INV/TD/DOA/072000/2026",
    vendorSap: "IPA0000001",
    invDate: "2026-05-15",
    dueDate: "2026-06-15",
    amount: 72_000_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA 50–100M HOD→HOF→STH→GFD · awaiting HOD",
  },
  {
    invNo: "DOA12500026",
    displayRef: "INV/TD/DOA/125000/2026",
    vendorSap: "IPA0000001",
    invDate: "2026-05-10",
    dueDate: "2026-06-10",
    amount: 125_000_000,
    taxAmount: 0,
    statusId: 101,
    remarks: "DoA >100M HOD→HOF→STH→GFD · awaiting HOD",
  },
];

/** ISO date strings via CAST — Sequelize UTC offsets break MSSQL datetime conversion. */
function mssqlDateLiteral(iso: string) {
  return Sequelize.literal(`CAST('${iso}' AS DATETIME)`);
}

const NON_PO_VALIDATION_RULES = [
  {
    ruleCode: "HCIS_REQUEST_MATCH",
    ruleName: "Request ID Match",
    message: "All cleared fields match the HCIS Clearing Journal for this request.",
  },
  {
    ruleCode: "BANK_VENDOR_MASTER",
    ruleName: "Bank Details vs Vendor Master",
    message: "Invoice bank details match the vendor master record.",
  },
  {
    ruleCode: "NON_PKP_VENDOR",
    ruleName: "Non-PKP Vendor Check",
    message: "Vendor name matches and invoice date is within the one-year issuance window.",
  },
  {
    ruleCode: "ADVANCE_RETENTION",
    ruleName: "Advance & Retention",
    message: "Advance recovery and retention rules evaluated — nothing to withhold for this invoice.",
  },
];

async function resolveEntityCode(): Promise<string> {
  const entity = await Entity.findOne({
    where: { Is_Deleted: false },
    order: [["ID", "ASC"]],
    attributes: ["CoCd"],
  });
  if (!entity?.CoCd) {
    throw new Error("No entity found — create an ENTITY record before seeding.");
  }
  return String(entity.CoCd);
}

async function resolvePutri() {
  const user = await User.findOne({
    where: { Email: PUTRI_EMAIL, Role_id: UserRole.AP_TEAM },
    attributes: ["ID", "Employee_Id", "Employee_Code", "CoCd"],
  });
  if (!user) {
    throw new Error(
      `User ${PUTRI_EMAIL} not found. Run: npm run seed:essa-users`,
    );
  }
  const employee = await Employee.findByPk(user.Employee_Id, {
    attributes: ["ID", "Employee_Code"],
  });
  return {
    userId: user.ID,
    employeeId: employee?.ID ?? user.Employee_Id,
    employeeCode: employee?.Employee_Code ?? user.Employee_Code ?? "E001",
    coCd: user.CoCd,
  };
}

async function ensureVendor(v: SeedVendor, coCd: string, createdBy: number) {
  const existing = await Vendor.findOne({
    where: { Vendor_SAP_Code: v.sapCode },
  });
  if (existing) {
    console.log(`  vendor exists: ${v.name}`);
    return existing.ID;
  }

  const row = await Vendor.create({
    Vendor_Name_EN: v.name,
    Vendor_Name_AR: v.name,
    CoCd: coCd,
    Vendor_SAP_Code: v.sapCode,
    City: "Jakarta",
    Country: "IDN",
    Region: "ID",
    Email: v.email,
    Phone: "0000000000",
    Payment_Terms: "0001",
    Is_VAT: v.isVat,
    Wht_Applicable: false,
    Is_Active: true,
    Is_Deleted: false,
    CreatedBy: createdBy,
    ModifiedBy: createdBy,
  });

  console.log(`  created vendor: ${v.name} (${v.sapCode})`);
  return row.ID;
}

async function undoDemoSeed(options: { removeVendors: boolean; verbose: boolean }) {
  const demoRows = await InvoiceHeader.findAll({
    where: {
      Remarks: { [Op.like]: `${DEMO_TAG}|%` },
      Invoice_Category_id: INVOICE_CATEGORY_NON_PO,
    },
    attributes: ["ID", "InvNo", "Inv_id_List", "Vendor_id"],
  });

  if (!demoRows.length) {
    return { invoicesRemoved: 0, validationsRemoved: 0, vendorsRemoved: 0 };
  }

  const ids = demoRows.map((r) => r.ID);

  if (options.verbose) {
    for (const row of demoRows) {
      console.log(
        `  removing invoice: ${row.Inv_id_List ?? row.InvNo} (id ${row.ID})`,
      );
    }
  }

  const validationsRemoved = await ApValidationResult.destroy({
    where: { InvoiceHeaderId: { [Op.in]: ids } },
  });

  const docRows = await ApDocument.findAll({
    where: { InvoiceHeaderId: { [Op.in]: ids } },
    attributes: ["DocumentId"],
  });
  const docIds = docRows.map((d) => d.DocumentId);
  if (docIds.length) {
    await ApDocumentExtraction.destroy({
      where: { DocumentId: { [Op.in]: docIds } },
    });
    await ApDocument.destroy({ where: { DocumentId: { [Op.in]: docIds } } });
  }

  await ApDocumentExtraction.destroy({
    where: { InvoiceHeaderId: { [Op.in]: ids } },
  });
  await InvoiceDetail.destroy({
    where: { Invoice_Header_Id: { [Op.in]: ids } },
  });

  const invoicesRemoved = await InvoiceHeader.destroy({
    where: { ID: { [Op.in]: ids } },
  });

  let vendorsRemoved = 0;
  if (options.removeVendors) {
    for (const v of VENDORS) {
      const vendor = await Vendor.findOne({
        where: { Vendor_SAP_Code: v.sapCode },
      });
      if (!vendor) continue;

      const otherInvoices = await InvoiceHeader.count({
        where: { Vendor_id: vendor.ID },
      });
      if (otherInvoices === 0) {
        await vendor.destroy();
        vendorsRemoved += 1;
        if (options.verbose) {
          console.log(`  removed vendor: ${v.name} (${v.sapCode})`);
        }
      } else if (options.verbose) {
        console.log(
          `  kept vendor: ${v.name} — ${otherInvoices} other invoice(s) remain`,
        );
      }
    }
  }

  return { invoicesRemoved, validationsRemoved, vendorsRemoved };
}

async function purgePriorDemo() {
  const result = await undoDemoSeed({ removeVendors: false, verbose: false });
  if (result.invoicesRemoved) {
    console.log(`  removed ${result.invoicesRemoved} prior demo non-PO invoice(s)`);
  }
}

async function seedValidationPasses(invoiceId: number, createdBy: number) {
  for (const rule of NON_PO_VALIDATION_RULES) {
    await ApValidationResult.create({
      InvoiceHeaderId: invoiceId,
      RuleCode: rule.ruleCode,
      RuleName: rule.ruleName,
      Severity: "PASS",
      ExpectedValue: rule.ruleName,
      ActualValue: "Matched",
      Message: rule.message,
      SourceTable: "ESSA_DEMO_SEED",
      CreatedBy: createdBy,
    });
  }
}

async function seedInvoice(
  cfg: SeedInvoice,
  vendorIds: Record<string, number>,
  ctx: {
    coCd: string;
    userId: number;
    employeeId: number;
    employeeCode: string;
  },
) {
  const existing = await InvoiceHeader.findOne({
    where: { InvNo: cfg.invNo, Invoice_Category_id: INVOICE_CATEGORY_NON_PO },
  });
  if (existing) {
    console.log(`  skip (exists): ${cfg.displayRef} → InvNo ${cfg.invNo}`);
    return;
  }

  const vendorId = vendorIds[cfg.vendorSap];
  if (!vendorId) {
    throw new Error(`Vendor not found for SAP code ${cfg.vendorSap}`);
  }

  const postedAt =
    cfg.statusId === 12 ? Sequelize.literal("GETDATE()") : null;

  const invoice = await InvoiceHeader.create({
    CoCd: ctx.coCd,
    Vendor_id: vendorId,
    Invoice_Category_id: INVOICE_CATEGORY_NON_PO,
    InvNo: cfg.invNo,
    Inv_Type: "NON_PO",
    InvDt: mssqlDateLiteral(cfg.invDate),
    Invoice_Due_Date: mssqlDateLiteral(cfg.dueDate),
    Document_type: "INV",
    InvCurr: "IDR",
    Fiscal_year: "2026",
    Invoice_Status_Id: cfg.statusId,
    Payment_Terms: "0001",
    InvAmt: cfg.amount,
    Tax_amount: cfg.taxAmount,
    Tax_percentage: 0,
    Remarks: `${DEMO_TAG}|${cfg.invNo}`.slice(0, 50),
    Inv_id_List: cfg.displayRef,
    PONo: null,
    Is_Deleted: false,
    Is_Document: true,
    Is_Paid: cfg.statusId === 12,
    Employee_Code: ctx.employeeCode,
    Nature_Of_Expense: "TRAVEL",
    Business_contact: ctx.employeeId,
    Submitted_By: ctx.userId,
    CreatedBy: ctx.userId,
    ModifiedBy: ctx.userId,
    Submitted_Date: Sequelize.literal("GETDATE()"),
    Posting_Date: postedAt,
    Posted_By: cfg.statusId === 12 ? ctx.userId : null,
  });

  await seedValidationPasses(invoice.ID, ctx.userId);
  console.log(
    `  created: ${cfg.displayRef} (InvNo ${cfg.invNo}, status ${cfg.statusId}, id ${invoice.ID})`,
  );
}

async function main() {
  await verifyDBConnection();

  if (isUndo) {
    console.log("Undoing MSSQL non-PO demo seed…");
    if (removeVendors) {
      console.log("  (--remove-vendors: will delete seed travel vendors if unused)");
    }

    const result = await undoDemoSeed({ removeVendors, verbose: true });

    if (!result.invoicesRemoved) {
      console.log("Nothing to remove — no rows tagged ESSA_DEMO_NPO|* found.");
    } else {
      console.log(
        `Done — removed ${result.invoicesRemoved} invoice(s), ${result.validationsRemoved} validation row(s)` +
          (removeVendors ? `, ${result.vendorsRemoved} vendor(s)` : "") +
          ".",
      );
    }
    process.exit(0);
  }

  console.log("Seeding MSSQL non-PO demo invoices for ap.team@essa.com…");

  const coCd = await resolveEntityCode();
  const putri = await resolvePutri();
  console.log(`Entity CoCd: ${coCd}`);
  console.log(`AP Team user: ${PUTRI_EMAIL} (user id ${putri.userId})`);

  await purgePriorDemo();

  console.log("Ensuring travel vendors…");
  const vendorIds: Record<string, number> = {};
  for (const v of VENDORS) {
    vendorIds[v.sapCode] = await ensureVendor(v, coCd, putri.userId);
  }

  console.log("Inserting non-PO invoices…");
  for (const inv of INVOICES) {
    await seedInvoice(inv, vendorIds, {
      coCd,
      userId: putri.userId,
      employeeId: putri.employeeId,
      employeeCode: putri.employeeCode,
    });
  }

  const count = await InvoiceHeader.count({
    where: {
      Remarks: { [Op.like]: `${DEMO_TAG}|%` },
      Invoice_Category_id: INVOICE_CATEGORY_NON_PO,
    },
  });

  console.log(`Done — ${count} non-PO demo invoice(s) in INVOICE_HEADER.`);
  console.log("List in portal: category=2 (Non-PO), logged in as ap.team@essa.com");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
