import {
  mintCorrelationId,
  roleLabelFromId,
  writeAudit,
  type AuditResult,
} from "./auditEvent.service";
import logger from "../utils/logger";

type SessionAction = "LOGIN" | "LOGOUT" | "AUTHORIZE";

export type SessionAuditInput = {
  action: SessionAction;
  result: Extract<AuditResult, "SUCCESS" | "FAIL" | "DENIED">;
  req?: any;
  actorId?: string | number | null;
  actorName?: string | null;
  actorRole?: string | number | null;
  email?: string | null;
  reasonRemarks?: string | null;
  source?: string;
};

function clientIp(req?: any): string | null {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || null;
}

function sessionActor(input: SessionAuditInput) {
  const email = String(input.email || "").trim();
  const name = String(input.actorName || email || "Unknown").trim() || "Unknown";
  const role =
    typeof input.actorRole === "number"
      ? roleLabelFromId(input.actorRole)
      : String(input.actorRole || "").trim() || undefined;
  const id = input.actorId != null && String(input.actorId).trim()
    ? String(input.actorId)
    : email || "unknown";
  return { id, name, role, email };
}

/**
 * Append-only session/auth audit. Never throws — login/logout must not fail
 * because the audit writer is unavailable.
 */
export async function auditSessionEvent(input: SessionAuditInput): Promise<void> {
  try {
    const actor = sessionActor(input);
    const objectId = actor.email || `U${actor.id}`;
    await writeAudit({
      action: input.action,
      objectType: "SESSION",
      objectId,
      result: input.result,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      actorType: "USER",
      source: input.source || "PORTAL",
      reasonRemarks: input.reasonRemarks || null,
      correlationId: mintCorrelationId(`sess${actor.id}`),
      ip: clientIp(input.req),
      newValue: input.action === "LOGIN" ? input.result : null,
    });
  } catch (error) {
    logger.warn(
      `Session audit write failed (${input.action}/${input.result}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function sessionUserFromReq(req?: any): {
  actorId?: string | number | null;
  actorName?: string | null;
  actorRole?: string | number | null;
  email?: string | null;
} {
  const user = req?.user || req?.session?.portalUser || {};
  return {
    actorId: user.id ?? user.ID ?? null,
    actorName: user.name ?? user.Name ?? null,
    actorRole: user.role_id ?? user.Role_id ?? user.role ?? null,
    email: user.email ?? user.Email ?? null,
  };
}
