export type SlaScenarioVariableSeed = {
  name: string;
  label: string;
  sample: string;
  required?: boolean;
};

export type SlaScenarioSeed = {
  key: string;
  label: string;
  description: string;
  category: string;
  defaultTo: string;
  variables: SlaScenarioVariableSeed[];
};

export const SLA_CONTEXT_VARIABLES: SlaScenarioVariableSeed[] = [
  { name: "invoiceNumber", label: "Invoice number", sample: "INV-10021", required: true },
  { name: "vendorName", label: "Vendor name", sample: "PT Amanah Lestari Energy" },
  { name: "policyCode", label: "Policy code", sample: "SLA_AP_VERIFY" },
  { name: "policyName", label: "Policy name", sample: "AP Verification" },
  { name: "stage", label: "Stage", sample: "INVOICE_CREATION" },
  { name: "dueDate", label: "Due date", sample: "2026-04-29T17:00:00.000Z" },
  { name: "dueAt", label: "Due at", sample: "2026-04-29T17:00:00.000Z" },
  { name: "slaDueDate", label: "SLA due date", sample: "2026-04-29" },
  { name: "remainingTime", label: "Remaining time", sample: "4h" },
  { name: "owner", label: "Owner", sample: "AP Team" },
  { name: "reminderSeq", label: "Reminder sequence", sample: "1" },
  { name: "escalationTarget", label: "Escalation target", sample: "AP Supervisor" },
];

export const SLA_SCENARIO_CATALOG: SlaScenarioSeed[] = [
  {
    key: "sla.reminder",
    label: "SLA reminder",
    description: "Sent when an SLA reminder is due. Recipients are resolved from the SLA rule at runtime.",
    category: "SLA",
    defaultTo: "Resolved at runtime",
    variables: SLA_CONTEXT_VARIABLES,
  },
  {
    key: "sla.warning",
    label: "SLA warning",
    description: "Sent when an SLA clock enters the warning window.",
    category: "SLA",
    defaultTo: "Resolved at runtime",
    variables: SLA_CONTEXT_VARIABLES,
  },
  {
    key: "sla.breached",
    label: "SLA breached",
    description: "Sent when an SLA target elapses before the stage completes.",
    category: "SLA",
    defaultTo: "Resolved at runtime",
    variables: SLA_CONTEXT_VARIABLES,
  },
  {
    key: "sla.escalated",
    label: "SLA escalated",
    description: "Sent when an SLA breach is escalated to the configured target.",
    category: "SLA",
    defaultTo: "Resolved at runtime",
    variables: SLA_CONTEXT_VARIABLES,
  },
  {
    key: "sla.missing_document",
    label: "SLA missing document",
    description: "Sent while chasing a vendor document request.",
    category: "SLA",
    defaultTo: "Resolved at runtime",
    variables: SLA_CONTEXT_VARIABLES,
  },
];
