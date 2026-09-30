import {
  getSchedulerTimezone,
  type PgBossInstance,
} from "../config/scheduler";
import {
  INVOICE_APPROVAL_MAIL,
  SLA_TICK,
  VENDOR_SYNC,
} from "./jobs";

type QueueRetryOptions = {
  retryLimit: number;
  retryDelay?: number;
  retryBackoff?: boolean;
};

type QueueSchedule = {
  name: string;
  cron: string;
  retry: QueueRetryOptions;
};

const QUEUES: QueueSchedule[] = [
  {
    name: SLA_TICK,
    cron: "*/5 * * * *",
    retry: { retryLimit: 0 },
  },
  {
    name: VENDOR_SYNC,
    cron: "*/5 * * * *",
    retry: { retryLimit: 1, retryDelay: 30, retryBackoff: false },
  },
  {
    name: INVOICE_APPROVAL_MAIL,
    cron: "0 * * * *",
    retry: { retryLimit: 2, retryDelay: 5, retryBackoff: true },
  },
];

async function ensureExclusiveQueue(
  boss: PgBossInstance,
  name: string,
  retry: QueueRetryOptions,
): Promise<void> {
  const existing = await boss.getQueue(name);
  if (!existing) {
    await boss.createQueue(name, { policy: "exclusive", ...retry });
  }
  // createQueue does not update an existing queue; retry fields must be applied on restart
  await boss.updateQueue(name, retry);
}

export async function registerQueuesAndSchedules(
  boss: PgBossInstance,
): Promise<void> {
  const tz = getSchedulerTimezone();

  for (const queue of QUEUES) {
    await ensureExclusiveQueue(boss, queue.name, queue.retry);
    await boss.schedule(queue.name, queue.cron, null, { tz });
  }
}
