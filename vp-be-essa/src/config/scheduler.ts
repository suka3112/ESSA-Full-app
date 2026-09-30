import { dbConfig } from "./dbConfig";
import logger from "../utils/logger";

export function isSchedulerEnabled(): boolean {
  return process.env.SCHEDULER_ENABLED !== "false";
}

/** IANA timezone for pg-boss cron. Unset defaults to UTC (hour-0 invoice mail is predictable). */
export function getSchedulerTimezone(): string {
  const tz = process.env.SCHEDULER_TZ?.trim();
  if (!tz) {
    logger.info("SCHEDULER_TZ unset; using UTC");
    return "UTC";
  }
  return tz;
}

/** Own small pool — do not share Sequelize's pool (max 500). */
export function getPgBossConfig() {
  return {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password,
    max: 3,
    schema: "pgboss",
  };
}

/** Dynamic import: pg-boss 12 is ESM; this app compiles as CommonJS. */
export async function createPgBoss() {
  const { PgBoss } = await import("pg-boss");
  return new PgBoss(getPgBossConfig());
}

export type PgBossInstance = Awaited<ReturnType<typeof createPgBoss>>;
