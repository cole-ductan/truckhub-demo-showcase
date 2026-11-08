import { CHICAGO_TIMEZONE } from "./types";

/**
 * America/Chicago civil-time helpers.
 *
 * Occurrence `startLocal` / `endLocal` values are wall-clock times in
 * America/Chicago. They are not UTC instants. A date-only value such as
 * `2026-11-19` must stay November 19 even when `new Date("2026-11-19")`
 * (UTC midnight) falls on November 18 in Chicago.
 *
 * Absolute instants (`verifiedAt`) go through `formatChicagoTimestamp`.
 */

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const OFFSET_RE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export class ChicagoLocalTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChicagoLocalTimeError";
  }
}

export type ChicagoLocalParts = {
  year: number;
  month: number;
  day: number;
  hours: number | null;
  minutes: number | null;
  dateKey: string;
};

export function parseChicagoLocal(value: string): ChicagoLocalParts {
  const trimmed = value.trim();
  if (OFFSET_RE.test(trimmed)) {
    throw new ChicagoLocalTimeError(
      `Chicago wall time cannot include a UTC offset or Z suffix: ${value}`,
    );
  }
  const match = LOCAL_RE.exec(trimmed);
  if (!match) {
    throw new ChicagoLocalTimeError(`Invalid Chicago wall time: ${value}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ChicagoLocalTimeError(`Invalid calendar date: ${value}`);
  }
  const hours = match[4] === undefined ? null : Number(match[4]);
  const minutes = match[5] === undefined ? null : Number(match[5]);
  if (hours !== null && (hours > 23 || (minutes ?? 0) > 59)) {
    throw new ChicagoLocalTimeError(`Invalid clock time: ${value}`);
  }
  return {
    year,
    month,
    day,
    hours,
    minutes,
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
  };
}

export function chicagoDateKey(value: string): string {
  return parseChicagoLocal(value).dateKey;
}

/**
 * Noon-safe anchor: 18:00 UTC is 12:00 in CST (UTC-6) and 13:00 in CDT (UTC-5),
 * so both standard time and daylight time keep the intended Chicago date.
 */
function chicagoDateAnchor(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 18, 0, 0));
}

export function formatChicagoDateLabel(value: string): string {
  const parsed = parseChicagoLocal(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(chicagoDateAnchor(parsed.year, parsed.month, parsed.day));
}

function formatClock(hours: number, minutes: number): string {
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

export function formatChicagoTimeRange(input: {
  startLocal: string;
  endLocal: string | null;
  timeUnconfirmed: boolean;
}): string {
  if (input.timeUnconfirmed) return "Time unconfirmed";
  const start = parseChicagoLocal(input.startLocal);
  if (start.hours === null || start.minutes === null) return "Time unconfirmed";
  const startText = formatClock(start.hours, start.minutes);
  if (!input.endLocal) return `${startText} CT`;
  const end = parseChicagoLocal(input.endLocal);
  if (end.hours === null || end.minutes === null) return `${startText} CT`;
  return `${startText}–${formatClock(end.hours, end.minutes)} CT`;
}

export function formatChicagoTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new ChicagoLocalTimeError(`Invalid timestamp: ${iso}`);
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
