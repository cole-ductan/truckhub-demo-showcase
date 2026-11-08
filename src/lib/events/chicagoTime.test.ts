import { describe, expect, it } from "vitest";
import {
  ChicagoLocalTimeError,
  formatChicagoDateLabel,
  formatChicagoTimeRange,
  formatChicagoTimestamp,
  chicagoDateKey,
} from "./chicagoTime";
import { FIXTURE, syntheticPublicEventCatalog } from "./fixtures";

describe("America/Chicago fixture dates", () => {
  it("keeps a date-only value on that Chicago calendar day", () => {
    const utcMidnight = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date("2026-11-19T00:00:00Z"));
    expect(utcMidnight).toBe("Nov 18, 2026");
    expect(chicagoDateKey("2026-11-19")).toBe("2026-11-19");
    expect(formatChicagoDateLabel("2026-11-19")).toBe("Thu, Nov 19, 2026");
  });

  it("formats Chicago wall-clock times without shifting the date", () => {
    expect(formatChicagoDateLabel("2026-11-21T16:00:00")).toBe("Sat, Nov 21, 2026");
    expect(
      formatChicagoTimeRange({
        startLocal: "2026-11-21T10:00:00",
        endLocal: "2026-11-21T16:00:00",
        timeUnconfirmed: false,
      }),
    ).toBe("10:00 AM–4:00 PM CT");
    expect(
      formatChicagoTimeRange({
        startLocal: "2026-07-04T14:00:00",
        endLocal: null,
        timeUnconfirmed: false,
      }),
    ).toBe("2:00 PM CT");
    const utcReading = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date("2026-07-04T14:00:00Z"));
    expect(utcReading).toContain("9:00 AM");
    expect(utcReading).toContain("CDT");
  });

  it("labels an unconfirmed time without inventing midnight", () => {
    const occurrence = syntheticPublicEventCatalog.occurrences.find((item) => item.id === FIXTURE.occDec12);
    expect(occurrence?.timeUnconfirmed).toBe(true);
    expect(formatChicagoDateLabel(occurrence!.startLocal)).toBe("Sat, Dec 12, 2026");
    expect(formatChicagoTimeRange(occurrence!)).toBe("Time unconfirmed");
  });

  it("formats absolute timestamps in Chicago, including daylight time", () => {
    expect(formatChicagoTimestamp("2026-11-08T21:00:00Z")).toBe("Nov 8, 2026, 3:00 PM CST");
    expect(formatChicagoTimestamp("2026-07-04T19:00:00Z")).toBe("Jul 4, 2026, 2:00 PM CDT");
  });

  it("rejects offsets on wall-clock fields", () => {
    expect(() => chicagoDateKey("2026-11-21T10:00:00-06:00")).toThrow(ChicagoLocalTimeError);
    expect(() => chicagoDateKey("2026-11-21T10:00:00Z")).toThrow(ChicagoLocalTimeError);
  });

  it("keeps the daylight-time boundary dates on the stored calendar day", () => {
    expect(formatChicagoDateLabel("2026-03-08")).toBe("Sun, Mar 8, 2026");
    expect(formatChicagoDateLabel("2026-11-01")).toBe("Sun, Nov 1, 2026");
  });
});
