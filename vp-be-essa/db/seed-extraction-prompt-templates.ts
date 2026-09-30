/**
 * Seed extraction prompt template master data — idempotent.
 * Usage: npm run seed:extraction-prompts
 *
 * Prerequisites:
 *   db/migrations/013_AP_EXTRACTION_PROMPT_TEMPLATES_PG.sql
 *
 * Seeds categories, invoice types, document catalog, and type↔document links.
 * Does not seed fields or prompt templates (UI starts empty / disabled).
 */
import { verifyDBConnection, sequelize } from "../src/config/sequelize";
import {
  ApExtractionCategory,
  ApExtractionInvoiceType,
  ApExtractionDocument,
  ApExtractionTypeDocument,
} from "../src/models/apExtractionAssociations";

const sqlNow = () => sequelize.literal("NOW()");

type CategorySeed = {
  code: string;
  name: string;
};

type InvoiceTypeSeed = {
  code: string;
  name: string;
  categoryCode: string;
  displayOrder: number;
  documents: string[];
};

const CATEGORIES: CategorySeed[] = [
  { code: "PO", name: "PO" },
  { code: "NON_PO", name: "Non-PO" },
];

/** Stable codes for shared catalog documents (by display name). */
const DOCUMENT_CODES: Record<string, string> = {
  Invoice: "INVOICE",
  "Tax Invoice (VAT)": "TAX_INVOICE_VAT",
  "Tax Invoice": "TAX_INVOICE",
  "Work Progress Certificate (Berita Acara)": "BERITA_ACARA",
  "Summary Calculation Manhour (Monthly Man-days Summary)":
    "SUMMARY_CALCULATION_MANHOUR",
  "Daily Time Sheet": "DAILY_TIME_SHEET",
  "Daily Attendance (biometrics)": "DAILY_ATTENDANCE",
  PO: "PO",
  "PO Appendix": "PO_APPENDIX",
  Transmittal: "TRANSMITTAL",
  "Notice Letter": "NOTICE_LETTER",
  "Monthly Progress Report": "MONTHLY_PROGRESS_REPORT",
  "Sertifikat Badan Usaha": "SERTIFIKAT_BADAN_USAHA",
  "Izin Usaha Jasa Konstruksi": "IZIN_USAHA_JASA_KONSTRUKSI",
  "Logistics Invoice": "LOGISTICS_INVOICE",
  "Commercial Invoice": "COMMERCIAL_INVOICE",
  "Packing Slip": "PACKING_SLIP",
  "Email Notification": "EMAIL_NOTIFICATION",
  "Bill of Lading / AWB": "BILL_OF_LADING_AWB",
  "Packing List": "PACKING_LIST",
  "Proforma Invoice": "PROFORMA_INVOICE",
  "Attendance Statistics Table": "ATTENDANCE_STATISTICS_TABLE",
  "Monthly Meal Summary (PoB Report)": "MONTHLY_MEAL_SUMMARY",
  "Listing Invoices (If any)": "LISTING_INVOICES",
  "Underlying Contract": "UNDERLYING_CONTRACT",
  "Guarantee Letter (If any)": "GUARANTEE_LETTER",
  "Room Reservation Form (If any)": "ROOM_RESERVATION_FORM",
};

const INVOICE_TYPES: InvoiceTypeSeed[] = [
  {
    code: "MANPOWER_SERVICES",
    name: "Manpower Services",
    categoryCode: "PO",
    displayOrder: 1,
    documents: [
      "Invoice",
      "Tax Invoice (VAT)",
      "Work Progress Certificate (Berita Acara)",
      "Summary Calculation Manhour (Monthly Man-days Summary)",
      "Daily Time Sheet",
      "Daily Attendance (biometrics)",
      "PO",
      "PO Appendix",
    ],
  },
  {
    code: "CIVIL_CONTRACTOR",
    name: "Civil Contractor",
    categoryCode: "PO",
    displayOrder: 2,
    documents: [
      "Transmittal",
      "Invoice",
      "Notice Letter",
      "Tax Invoice",
      "Work Progress Certificate (Berita Acara)",
      "Monthly Progress Report",
      "Sertifikat Badan Usaha",
      "Izin Usaha Jasa Konstruksi",
      "PO",
      "PO Appendix",
    ],
  },
  {
    code: "MATERIAL_IMPORT",
    name: "Material Import",
    categoryCode: "PO",
    displayOrder: 3,
    documents: [
      "PO",
      "PO Appendix",
      "Invoice",
      "Logistics Invoice",
      "Commercial Invoice",
      "Packing Slip",
      "Email Notification",
      "Bill of Lading / AWB",
      "Packing List",
    ],
  },
  {
    code: "CAMP_SERVICE_AND_CATERING",
    name: "Camp Service and Catering",
    categoryCode: "PO",
    displayOrder: 4,
    documents: [
      "Invoice",
      "Tax Invoice (VAT)",
      "Work Progress Certificate (Berita Acara)",
      "Proforma Invoice",
      "Attendance Statistics Table",
      "Monthly Meal Summary (PoB Report)",
      "PO",
      "PO Appendix",
    ],
  },
  {
    code: "NON_PO",
    name: "Non-PO",
    categoryCode: "NON_PO",
    displayOrder: 1,
    documents: [
      "Invoice",
      "Listing Invoices (If any)",
      "Tax Invoice",
      "Underlying Contract",
      "Guarantee Letter (If any)",
      "Room Reservation Form (If any)",
      "Work Progress Certificate (Berita Acara)",
    ],
  },
];

async function upsertCategory(seed: CategorySeed): Promise<ApExtractionCategory> {
  const existing = await ApExtractionCategory.findOne({
    where: { Code: seed.code },
  });
  if (existing) {
    await existing.update({
      Name: seed.name,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return existing;
  }
  return ApExtractionCategory.create({
    Code: seed.code,
    Name: seed.name,
    IsDeleted: false,
  });
}

async function upsertInvoiceType(
  seed: InvoiceTypeSeed,
  categoryId: number,
): Promise<ApExtractionInvoiceType> {
  const existing = await ApExtractionInvoiceType.findOne({
    where: { Code: seed.code },
  });
  if (existing) {
    await existing.update({
      CategoryId: categoryId,
      Name: seed.name,
      DisplayOrder: seed.displayOrder,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return existing;
  }
  return ApExtractionInvoiceType.create({
    CategoryId: categoryId,
    Code: seed.code,
    Name: seed.name,
    DisplayOrder: seed.displayOrder,
    IsDeleted: false,
  });
}

async function upsertDocument(
  name: string,
): Promise<ApExtractionDocument> {
  const code = DOCUMENT_CODES[name];
  if (!code) {
    throw new Error(`Missing DOCUMENT_CODES entry for "${name}"`);
  }

  const byCode = await ApExtractionDocument.findOne({ where: { Code: code } });
  if (byCode) {
    await byCode.update({
      Name: name,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return byCode;
  }

  const byName = await ApExtractionDocument.findOne({ where: { Name: name } });
  if (byName) {
    await byName.update({
      Code: code,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return byName;
  }

  return ApExtractionDocument.create({
    Code: code,
    Name: name,
    IsDeleted: false,
  });
}

async function ensureTypeDocumentLink(
  invoiceTypeId: number,
  documentId: number,
  displayOrder: number,
): Promise<void> {
  const existing = await ApExtractionTypeDocument.findOne({
    where: { InvoiceTypeId: invoiceTypeId, DocumentId: documentId },
  });
  if (existing) {
    await existing.update({
      DisplayOrder: displayOrder,
      IsDeleted: false,
      UpdatedAt: sqlNow(),
    });
    return;
  }
  await ApExtractionTypeDocument.create({
    InvoiceTypeId: invoiceTypeId,
    DocumentId: documentId,
    IsEnabled: false,
    DisplayOrder: displayOrder,
    IsDeleted: false,
  });
}

async function main() {
  console.log("Seeding extraction prompt templates master data…");
  await verifyDBConnection();

  const categoryByCode = new Map<string, ApExtractionCategory>();
  for (const cat of CATEGORIES) {
    const row = await upsertCategory(cat);
    categoryByCode.set(cat.code, row);
    console.log(`  category ${cat.code} (id=${row.CategoryId})`);
  }

  const allDocNames = Array.from(
    new Set(INVOICE_TYPES.flatMap((t) => t.documents)),
  );
  const documentByName = new Map<string, ApExtractionDocument>();
  for (const name of allDocNames) {
    const doc = await upsertDocument(name);
    documentByName.set(name, doc);
  }
  console.log(`  document catalog: ${documentByName.size} entries`);

  for (const typeSeed of INVOICE_TYPES) {
    const category = categoryByCode.get(typeSeed.categoryCode);
    if (!category) {
      throw new Error(`Unknown category code ${typeSeed.categoryCode}`);
    }
    const invoiceType = await upsertInvoiceType(typeSeed, category.CategoryId);
    console.log(
      `  invoice type ${typeSeed.code} (id=${invoiceType.InvoiceTypeId}) — ${typeSeed.documents.length} docs`,
    );

    for (let i = 0; i < typeSeed.documents.length; i += 1) {
      const docName = typeSeed.documents[i];
      const doc = documentByName.get(docName);
      if (!doc) {
        throw new Error(`Document not seeded: ${docName}`);
      }
      await ensureTypeDocumentLink(
        invoiceType.InvoiceTypeId,
        doc.DocumentId,
        i + 1,
      );
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
