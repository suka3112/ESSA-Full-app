/**
 * Invoice-process audit writers for BPD lifecycle stages:
 * intake → document chase → extraction/HITL → validation.
 * Never throws into business flows.
 */
import {
  mintCorrelationId,
  systemAudit,
  writeAudit,
  type AuditAction,
  type AuditResult,
  type AuditSource,
  type WriteAuditInput,
} from "./auditEvent.service";
import logger from "../utils/logger";

export type ProcessAuditBase = {
  objectId: string;
  invoiceId?: number | null;
  correlationId?: string | null;
  source?: AuditSource | string;
  reasonRemarks?: string | null;
  details?: Record<string, unknown> | null;
  outcomeCode?: string | null;
  fieldCode?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actorId?: string | number | null;
  actorName?: string | null;
  actorRole?: string | null;
  actorType?: "USER" | "SYSTEM" | "INTEGRATION";
  result?: AuditResult | string;
  ip?: string | null;
};

async function safeWrite(
  action: AuditAction | string,
  input: ProcessAuditBase,
  defaults: Partial<WriteAuditInput> = {},
): Promise<void> {
  try {
    const payload: WriteAuditInput = {
      action,
      objectType: "INVOICE",
      objectId: input.objectId || "UNKNOWN",
      invoiceId: input.invoiceId ?? null,
      correlationId:
        input.correlationId ||
        mintCorrelationId(input.invoiceId != null ? `inv${input.invoiceId}` : null),
      source: input.source || defaults.source || "SYSTEM",
      reasonRemarks: input.reasonRemarks ?? null,
      details: input.details ?? null,
      outcomeCode: input.outcomeCode ?? null,
      fieldCode: input.fieldCode ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      result: input.result || defaults.result || "SUCCESS",
      actorId: input.actorId ?? defaults.actorId ?? null,
      actorName: input.actorName ?? defaults.actorName ?? null,
      actorRole: input.actorRole ?? defaults.actorRole ?? null,
      actorType: input.actorType ?? defaults.actorType ?? "SYSTEM",
      ip: input.ip ?? null,
      ...defaults,
    };

    if (payload.actorType === "SYSTEM" && !input.actorId && !defaults.actorId) {
      await systemAudit({
        ...payload,
        actorName: payload.actorName || "AP Automation Engine",
      });
      return;
    }
    await writeAudit(payload);
  } catch (error) {
    logger.warn(
      `Process audit ${action} failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// ---------- 1. Intake ----------

export const auditReceive = (input: ProcessAuditBase) =>
  safeWrite("RECEIVE", input, {
    source: input.source || "EMAIL",
    actorType: "SYSTEM",
    result: "SUCCESS",
    reasonRemarks: input.reasonRemarks || "Invoice package received",
  });

export const auditRegister = (input: ProcessAuditBase) =>
  safeWrite("REGISTER", input, {
    actorType: input.actorType || "SYSTEM",
    result: "SUCCESS",
    reasonRemarks: input.reasonRemarks || "Invoice registered as Draft",
  });

export const auditClassify = (input: ProcessAuditBase) =>
  safeWrite("CLASSIFY", input, {
    actorType: "SYSTEM",
    result: "SUCCESS",
    reasonRemarks: input.reasonRemarks || "Category / document type resolved",
  });

export const auditRejectIntake = (input: ProcessAuditBase) =>
  safeWrite("REJECT_INTAKE", input, {
    actorType: "SYSTEM",
    result: "FAIL",
    reasonRemarks: input.reasonRemarks || "Intake rejected",
  });

export const auditDuplicateDetected = (input: ProcessAuditBase) =>
  safeWrite("DUPLICATE_DETECTED", input, {
    actorType: "SYSTEM",
    result: "FAIL",
    reasonRemarks: input.reasonRemarks || "Duplicate invoice package detected",
  });

/** System-initiated rejection of a live Draft when a resubmission supersedes it. */
export const auditSupersede = (input: ProcessAuditBase) =>
  safeWrite("SUPERSEDE", input, {
    actorType: "SYSTEM",
    actorId: "system",
    actorName: "AP Automation Engine",
    actorRole: "SYSTEM",
    source: "SYSTEM",
    result: "SUCCESS",
    reasonRemarks:
      input.reasonRemarks ||
      "Prior Draft superseded by resubmitted package (same Faktur Pajak / document replacement)",
  });

// ---------- 2. Document chase ----------

export const auditDocRequestIssued = (input: ProcessAuditBase) =>
  safeWrite("DOC_REQUEST_ISSUED", input, {
    actorType: input.actorType || (input.actorId ? "USER" : "SYSTEM"),
    result: "SUCCESS",
  });

export const auditDocReceived = (input: ProcessAuditBase) =>
  safeWrite("DOC_RECEIVED", input, {
    actorType: "SYSTEM",
    source: input.source || "EMAIL",
    result: "SUCCESS",
  });

export const auditDocAssociated = (input: ProcessAuditBase) =>
  safeWrite("DOC_ASSOCIATED", input, {
    actorType: "SYSTEM",
    result: "SUCCESS",
  });

/**
 * Maker-checker replacement — put the six attributes in `details`:
 * requesterId, submitterId, reviewingApUserId, reason, versionFrom, versionTo,
 * affectedValidationResults, approvalImpact
 */
export const auditDocReplaced = (input: ProcessAuditBase) =>
  safeWrite("DOC_REPLACED", input, {
    actorType: input.actorType || "SYSTEM",
    result: "SUCCESS",
  });

export const auditDocRequestEscalated = (input: ProcessAuditBase) =>
  safeWrite("DOC_REQUEST_ESCALATED", input, {
    actorType: input.actorType || "USER",
    result: "SUCCESS",
  });

// ---------- 3. Extraction / HITL ----------

export const auditExtractOk = (input: ProcessAuditBase) =>
  safeWrite("EXTRACT", input, {
    actorType: "SYSTEM",
    result: "SUCCESS",
  });

export const auditExtractFailed = (input: ProcessAuditBase) =>
  safeWrite("EXTRACT_FAILED", input, {
    actorType: "SYSTEM",
    result: "FAIL",
    source: input.source || "EMAIL",
  });

export const auditHitlAssign = (input: ProcessAuditBase) =>
  safeWrite("HITL_ASSIGN", input, {
    actorType: "SYSTEM",
    result: "SUCCESS",
  });

export const auditVerify = (input: ProcessAuditBase) =>
  safeWrite("VERIFY", input, {
    actorType: "USER",
    source: "PORTAL",
    result: "SUCCESS",
    reasonRemarks:
      input.reasonRemarks || "AP verified extracted value without change",
  });

export const auditCorrect = (input: ProcessAuditBase) =>
  safeWrite("CORRECT", input, {
    actorType: "USER",
    source: "PORTAL",
    result: "SUCCESS",
  });

export const auditManualEnter = (input: ProcessAuditBase) =>
  safeWrite("MANUAL_ENTER", input, {
    actorType: "USER",
    source: "PORTAL",
    result: "SUCCESS",
    reasonRemarks: input.reasonRemarks || "AP Lead manually entered field value",
  });

// ---------- 4. Validation ----------

export const auditValidateRun = (input: ProcessAuditBase) =>
  safeWrite("VALIDATE_RUN", input, {
    actorType: input.actorId ? "USER" : "SYSTEM",
    result: input.result || "SUCCESS",
  });

export const auditRuleFail = (input: ProcessAuditBase) =>
  safeWrite("RULE_FAIL", input, {
    actorType: "SYSTEM",
    result: "FAIL",
  });

export const auditRuleWarn = (input: ProcessAuditBase) =>
  safeWrite("RULE_WARN", input, {
    actorType: "SYSTEM",
    result: "SUCCESS",
  });

export const auditRuleHardFail = (input: ProcessAuditBase) =>
  safeWrite("RULE_HARD_FAIL", input, {
    actorType: "SYSTEM",
    result: "FAIL",
  });

export default {
  auditReceive,
  auditRegister,
  auditClassify,
  auditRejectIntake,
  auditDuplicateDetected,
  auditSupersede,
  auditDocRequestIssued,
  auditDocReceived,
  auditDocAssociated,
  auditDocReplaced,
  auditDocRequestEscalated,
  auditExtractOk,
  auditExtractFailed,
  auditHitlAssign,
  auditVerify,
  auditCorrect,
  auditManualEnter,
  auditValidateRun,
  auditRuleFail,
  auditRuleWarn,
  auditRuleHardFail,
};
