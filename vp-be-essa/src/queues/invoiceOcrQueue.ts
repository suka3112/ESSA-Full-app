import type { PgBossInstance } from "../config/scheduler";
import { INVOICE_OCR_PROCESS } from "./jobs";

type OcrHandler = (documentId: number) => Promise<void>;

let boss: PgBossInstance | null = null;
let inlineHandler: OcrHandler | null = null;
const inlineInFlight = new Set<number>();

export function bindInvoiceOcrBoss(instance: PgBossInstance | null): void {
  boss = instance;
}

export function bindInlineInvoiceOcr(handler: OcrHandler): void {
  inlineHandler = handler;
}

/**
 * Queue background OCR. When the scheduler is off, run in this process so the
 * processing row still completes. singletonKey stops a second job for the same document.
 */
export async function enqueueInvoiceOcr(documentId: number): Promise<void> {
  if (!Number.isInteger(documentId) || documentId <= 0) return;
  if (boss) {
    await boss.send(
      INVOICE_OCR_PROCESS,
      { documentId },
      {
        singletonKey: String(documentId),
        retryLimit: 2,
        retryDelay: 30,
        retryBackoff: true,
        expireInSeconds: 45 * 60,
      },
    );
    return;
  }
  if (!inlineHandler || inlineInFlight.has(documentId)) return;
  inlineInFlight.add(documentId);
  const run = inlineHandler;
  setImmediate(() => {
    void run(documentId).finally(() => {
      inlineInFlight.delete(documentId);
    });
  });
}
