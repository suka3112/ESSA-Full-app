export type DurationUnit = "HOURS" | "CALENDAR_DAYS" | "BUSINESS_HOURS" | "BUSINESS_DAYS";

export type CalendarException = {
  id?: string;
  date: string;
  name?: string;
  type?: string;
  working: boolean;
};

export type CalendarShape = {
  timezone: string;
  workingDays: number[];
  workStart: string;
  workEnd: string;
  exceptions: CalendarException[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseHm = (hm: string): { h: number; m: number } => {
  const [h, m] = String(hm || "00:00").split(":").map((n) => Number(n) || 0);
  return { h, m };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const addDaysYmd = (ymd: string, days: number): string => {
  const [y, mo, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, mo - 1, d + days));
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
};

const localPartsMs = (date: Date, tz: string): number => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    Number(bag.hour),
    Number(bag.minute),
    Number(bag.second),
  );
};

export const ymdInTz = (date: Date, tz: string): string =>
  date.toLocaleDateString("en-CA", { timeZone: tz });

export const weekdayInTz = (date: Date, tz: string): number => {
  const wd = date.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
  const js = WEEKDAYS.indexOf(wd);
  if (js < 0) return 1;
  return js === 0 ? 7 : js;
};

export const hmInTz = (date: Date, tz: string): string => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  return `${pad2(Number(bag.hour))}:${pad2(Number(bag.minute))}`;
};

export const zonedTimeToUtc = (ymd: string, hm: string, tz: string): Date => {
  const [year, month, day] = ymd.split("-").map(Number);
  const { h, m } = parseHm(hm);
  const desired = Date.UTC(year, month - 1, day, h, m, 0);
  let guess = desired;
  for (let i = 0; i < 3; i++) {
    guess -= localPartsMs(new Date(guess), tz) - desired;
  }
  return new Date(guess);
};

const minutesFromMidnight = (hm: string): number => {
  const { h, m } = parseHm(hm);
  return h * 60 + m;
};

export const isWorkingDay = (date: Date, calendar: CalendarShape): boolean => {
  const ymd = ymdInTz(date, calendar.timezone);
  const ex = calendar.exceptions.find((e) => e.date === ymd);
  if (ex) return !!ex.working;
  return calendar.workingDays.includes(weekdayInTz(date, calendar.timezone));
};

const nextWorkingYmd = (ymd: string, calendar: CalendarShape): string => {
  let cursor = ymd;
  for (let i = 0; i < 370; i++) {
    cursor = addDaysYmd(cursor, 1);
    const probe = zonedTimeToUtc(cursor, calendar.workStart || "08:00", calendar.timezone);
    if (isWorkingDay(probe, calendar)) return cursor;
  }
  return cursor;
};

const addWallHours = (start: Date, hours: number): Date =>
  new Date(start.getTime() + hours * 60 * 60 * 1000);

const addCalendarDays = (start: Date, days: number, tz: string): Date => {
  const ymd = addDaysYmd(ymdInTz(start, tz), days);
  return zonedTimeToUtc(ymd, hmInTz(start, tz), tz);
};

const addBusinessDays = (start: Date, days: number, calendar: CalendarShape): Date => {
  if (days === 0) return start;
  const tz = calendar.timezone;
  const hm = hmInTz(start, tz);
  let ymd = ymdInTz(start, tz);
  let left = days;
  while (left > 0) {
    ymd = nextWorkingYmd(ymd, calendar);
    left -= 1;
  }
  return zonedTimeToUtc(ymd, hm, tz);
};

const workWindowMs = (calendar: CalendarShape): number => {
  const span = minutesFromMidnight(calendar.workEnd) - minutesFromMidnight(calendar.workStart);
  return Math.max(span, 0) * 60 * 1000;
};

const addBusinessHours = (start: Date, hours: number, calendar: CalendarShape): Date => {
  if (hours === 0) return start;
  const tz = calendar.timezone;
  let remaining = hours * 60 * 60 * 1000;
  let cursor = new Date(start.getTime());
  const windowMs = workWindowMs(calendar) || 8 * 60 * 60 * 1000;

  for (let i = 0; i < 4000 && remaining > 0; i++) {
    const ymd = ymdInTz(cursor, tz);
    const dayStart = zonedTimeToUtc(ymd, calendar.workStart, tz);
    const dayEnd = zonedTimeToUtc(ymd, calendar.workEnd, tz);

    if (!isWorkingDay(cursor, calendar) || cursor >= dayEnd) {
      const nextYmd = nextWorkingYmd(ymd, calendar);
      cursor = zonedTimeToUtc(nextYmd, calendar.workStart, tz);
      continue;
    }
    if (cursor < dayStart) {
      cursor = dayStart;
    }
    const available = Math.min(dayEnd.getTime() - cursor.getTime(), windowMs);
    if (available <= 0) {
      const nextYmd = nextWorkingYmd(ymd, calendar);
      cursor = zonedTimeToUtc(nextYmd, calendar.workStart, tz);
      continue;
    }
    if (remaining <= available) {
      return new Date(cursor.getTime() + remaining);
    }
    remaining -= available;
    const nextYmd = nextWorkingYmd(ymd, calendar);
    cursor = zonedTimeToUtc(nextYmd, calendar.workStart, tz);
  }
  return cursor;
};

export const addDuration = (
  start: Date,
  value: number,
  unit: DurationUnit | string,
  calendar: CalendarShape,
): Date => {
  const n = Number(value) || 0;
  if (n === 0) return new Date(start.getTime());
  switch (String(unit || "HOURS").toUpperCase()) {
    case "CALENDAR_DAYS":
      return addCalendarDays(start, n, calendar.timezone);
    case "BUSINESS_DAYS":
      return addBusinessDays(start, n, calendar);
    case "BUSINESS_HOURS":
      return addBusinessHours(start, n, calendar);
    case "HOURS":
    default:
      return addWallHours(start, n);
  }
};

export const subtractDuration = (
  start: Date,
  value: number,
  unit: DurationUnit | string,
  calendar: CalendarShape,
): Date => {
  const n = Number(value) || 0;
  if (n === 0) return new Date(start.getTime());
  if (String(unit || "").toUpperCase() === "HOURS") {
    return addWallHours(start, -n);
  }
  if (String(unit || "").toUpperCase() === "CALENDAR_DAYS") {
    return addCalendarDays(start, -n, calendar.timezone);
  }
  const due = start;
  const guess = addDuration(new Date(due.getTime() - n * 24 * 60 * 60 * 1000), n, unit, calendar);
  const delta = guess.getTime() - due.getTime();
  return new Date(due.getTime() - delta);
};

export const defaultCalendarShape = (): CalendarShape => ({
  timezone: "Asia/Jakarta",
  workingDays: [1, 2, 3, 4, 5],
  workStart: "08:00",
  workEnd: "17:00",
  exceptions: [],
});
