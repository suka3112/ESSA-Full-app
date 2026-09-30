/**
 * Seed ESSA email scenario catalog (keys + placeholder variables).
 * Does not insert system templates — those are created in the UI.
 *
 * Usage:
 *   npm run seed:email-templates         — upsert scenarios + variables
 *   npm run seed:email-templates:undo    — delete IsSystem templates + "System seed" versions
 *
 * Prerequisite: db/migrations/011_ESSA_Email_Templates_And_Invoice.sql
 */
import { verifyDBConnection } from "../src/config/sequelize";
import "../src/config/applyPostgresCaseHooks";
import { EssaEmailScenario } from "../src/models/essaEmailScenario";
import { EssaEmailScenarioVariable } from "../src/models/essaEmailScenarioVariable";
import { EssaEmailTemplate } from "../src/models/essaEmailTemplate";
import { EssaEmailTemplateVersion } from "../src/models/essaEmailTemplateVersion";
import { SLA_SCENARIO_CATALOG } from "../src/helpers/slaEmailCatalog";

type VariableSeed = {
  name: string;
  label: string;
  sample: string;
  required?: boolean;
};

type ScenarioSeed = {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultTo: string;
  defaultCc?: string;
  variables: VariableSeed[];
};

const SCENARIOS: ScenarioSeed[] = [
  {
    key: "invoice.received",
    label: "Invoice received",
    description: "Sent when a vendor invoice is received and captured.",
    category: "Invoice",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy", required: true },
      { name: "poNumber", label: "PO number", sample: "4203000546" },
      { name: "invoiceDate", label: "Invoice date", sample: "2026-04-22" },
      { name: "totalAmount", label: "Total amount", sample: "61082745" },
      { name: "currency", label: "Currency", sample: "IDR" },
    ],
  },
  {
    key: "exception.created",
    label: "Exception created",
    description: "Sent when a validation exception is raised on an invoice.",
    category: "Exception",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "exceptionCode", label: "Exception code", sample: "PO_MISMATCH", required: true },
      { name: "exceptionMessage", label: "Exception message", sample: "PO amount does not match invoice" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "approval.requested",
    label: "Approval requested",
    description: "Sent when an invoice is submitted for approval.",
    category: "Approval",
    defaultTo: "Current approver",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "approverName", label: "Approver name", sample: "Budi Hartono", required: true },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
      { name: "totalAmount", label: "Total amount", sample: "61082745" },
    ],
  },
  {
    key: "invoice.approved",
    label: "Invoice approved",
    description: "Sent when an invoice is approved.",
    category: "Approval",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
      { name: "approvedBy", label: "Approved by", sample: "Budi Hartono" },
    ],
  },
  {
    key: "invoice.rejected",
    label: "Invoice rejected",
    description: "Sent when an invoice is rejected.",
    category: "Approval",
    defaultTo: "AP Processor",
    defaultCc: "Vendor contact",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "rejectReason", label: "Reject reason", sample: "Supporting documents incomplete", required: true },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  ...SLA_SCENARIO_CATALOG,
  {
    key: "invoice.parked",
    label: "Invoice parked",
    description: "Sent when an invoice is parked in SAP / AP.",
    category: "Invoice",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "parkedReason", label: "Parked reason", sample: "Awaiting tax invoice" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "invoice.posted",
    label: "Invoice posted",
    description: "Sent when an invoice is posted.",
    category: "Invoice",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "sapDocNumber", label: "SAP document number", sample: "5100001234" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "invoice.returned",
    label: "Invoice returned",
    description: "Sent when an invoice is returned to the previous step.",
    category: "Invoice",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "returnReason", label: "Return reason", sample: "Incorrect GL coding" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "approval.escalated",
    label: "Approval escalated",
    description: "Sent when an approval is escalated to the next DoA level.",
    category: "Approval",
    defaultTo: "Current approver",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "escalatedTo", label: "Escalated to", sample: "Head of Department" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "exception.resolved",
    label: "Exception resolved",
    description: "Sent when an invoice exception is resolved.",
    category: "Exception",
    defaultTo: "AP Processor",
    variables: [
      { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
      { name: "exceptionCode", label: "Exception code", sample: "PO_MISMATCH" },
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
    ],
  },
  {
    key: "vendor.created",
    label: "Vendor created",
    description: "Sent when a new vendor is created in the portal.",
    category: "Vendor",
    defaultTo: "Admin",
    variables: [
      { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy", required: true },
      { name: "vendorCode", label: "Vendor code", sample: "10001234" },
      { name: "vendorEmail", label: "Vendor email", sample: "ap@amanah.example" },
    ],
  },
  {
    key: "config.notice",
    label: "Configuration notice",
    description: "Sent when an admin configuration change should be broadcast.",
    category: "Admin",
    defaultTo: "AP Team",
    variables: [
      { name: "changeSummary", label: "Change summary", sample: "SLA window updated to 5 days", required: true },
      { name: "changedBy", label: "Changed by", sample: "System Admin" },
    ],
  },
];

async function seedScenario(seed: ScenarioSeed, userId: number) {
  let scenario = await EssaEmailScenario.findOne({ where: { ScenarioKey: seed.key } });
  if (!scenario) {
    scenario = await EssaEmailScenario.create({
      ScenarioKey: seed.key,
      Label: seed.label,
      Description: seed.description,
      Category: seed.category,
      DefaultTo: seed.defaultTo,
      DefaultCc: seed.defaultCc || null,
      DefaultBcc: null,
      IsDeleted: false,
      CreatedDt: new Date(),
      CreatedBy: userId,
      ModifiedDt: new Date(),
      ModifiedBy: userId,
    });
    console.log(`  scenario created: ${seed.key}`);
  }

  for (const variable of seed.variables) {
    const existing = await EssaEmailScenarioVariable.findOne({
      where: { ScenarioId: scenario.Id, VariableName: variable.name },
    });
    if (existing) continue;
    await EssaEmailScenarioVariable.create({
      ScenarioId: scenario.Id,
      VariableName: variable.name,
      Label: variable.label,
      SampleValue: variable.sample,
      IsRequired: !!variable.required,
    });
  }

}

async function unseedSystemTemplates() {
  const systemTemplates = await EssaEmailTemplate.findAll({
    where: { IsSystem: true },
    attributes: ["Id", "Name", "ScenarioKey"],
  });
  const ids = systemTemplates.map((row) => row.Id);

  if (ids.length) {
    const versionsDeleted = await EssaEmailTemplateVersion.destroy({
      where: { TemplateId: ids },
    });
    const templatesDeleted = await EssaEmailTemplate.destroy({
      where: { Id: ids },
    });
    console.log(`  deleted ${templatesDeleted} system template(s) and ${versionsDeleted} version row(s)`);
    for (const row of systemTemplates) {
      console.log(`    - ${row.ScenarioKey} (${row.Name}, id=${row.Id})`);
    }
  } else {
    console.log("  no system templates found");
  }

  const seedNotesDeleted = await EssaEmailTemplateVersion.destroy({
    where: { Note: "System seed" },
  });
  if (seedNotesDeleted) {
    console.log(`  deleted ${seedNotesDeleted} leftover "System seed" version row(s)`);
  }
}

async function main() {
  const undo = process.argv.includes("--undo");
  await verifyDBConnection();

  if (undo) {
    console.log("Removing system-seeded email templates (user templates are kept)…");
    await unseedSystemTemplates();
    console.log("Done.");
    process.exit(0);
  }

  console.log("Seeding ESSA email scenarios and variables (no system templates)…");
  for (const seed of SCENARIOS) {
    await seedScenario(seed, 1);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
