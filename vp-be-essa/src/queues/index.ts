import {
  createPgBoss,
  isSchedulerEnabled,
  type PgBossInstance,
} from "../config/scheduler";
import logger from "../utils/logger";
import {
  executeInvoiceApprovalMail,
  executeSlaTick,
  executeVendorSync,
} from "./jobHandlers";
import {
  INVOICE_APPROVAL_MAIL,
  SLA_TICK,
  VENDOR_SYNC,
} from "./jobs";
import { registerQueuesAndSchedules } from "./register";

let boss: PgBossInstance | null = null;
let shuttingDown = false;
let signalsWired = false;

function wrapWork(name: string, run: () => Promise<unknown>) {
  return async () => {
    try {
      await run();
      logger.info(`[scheduler] ${name} completed`);
    } catch (err) {
      logger.error(`[scheduler] ${name} failed`, err);
      throw err;
    }
  };
}

async function registerWorkers(instance: PgBossInstance): Promise<void> {
  await instance.work(SLA_TICK, wrapWork(SLA_TICK, executeSlaTick));
  await instance.work(VENDOR_SYNC, wrapWork(VENDOR_SYNC, executeVendorSync));
  await instance.work(
    INVOICE_APPROVAL_MAIL,
    wrapWork(INVOICE_APPROVAL_MAIL, executeInvoiceApprovalMail),
  );
}

function wireShutdownSignals() {
  if (signalsWired) return;
  signalsWired = true;
  const onShutdown = () => {
    void stopScheduler().finally(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", onShutdown);
  process.on("SIGINT", onShutdown);
}

export async function startScheduler(): Promise<void> {
  if (!isSchedulerEnabled()) {
    logger.info("Scheduler skipped (SCHEDULER_ENABLED=false)");
    return;
  }

  try {
    boss = await createPgBoss();
    boss.on("error", (err) => {
      logger.error("[scheduler] pg-boss error", err);
    });
    await boss.start();
    await registerQueuesAndSchedules(boss);
    await registerWorkers(boss);
    wireShutdownSignals();
    logger.info("Scheduler connected; jobs registered");
  } catch (err) {
    await stopScheduler();
    shuttingDown = false;
    throw err;
  }
}

export async function stopScheduler(): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (boss) {
      await boss.stop({ close: true, graceful: true, timeout: 30000 });
    }
  } catch (err) {
    logger.error("Scheduler stop failed", err);
  } finally {
    boss = null;
  }
}
