import { describe, expect, it } from "vitest";
import { describeBookingsSurface } from "@/lib/qa/bookingsView";

describe("bookings view labeling", () => {
  it("does not describe lead-stage rows as an empty bookings table", () => {
    const surface = describeBookingsSurface({ bookingsTableCount: 0, leadDerivedCount: 1 });
    expect(surface.tone).toBe("populated");
    expect(surface.headline).toBe("1 lead-stage booking");
    expect(surface.detail).toMatch(/not a count of the bookings table/i);
    expect(surface.headline.toLowerCase()).not.toMatch(/no bookings/);
  });

  it("keeps a zero bookings table out of the empty lead-stage message", () => {
    const surface = describeBookingsSurface({ bookingsTableCount: 0, leadDerivedCount: 0 });
    expect(surface.tone).toBe("empty");
    expect(surface.headline).toBe("No lead-stage bookings in this view");
    expect(surface.detail).toMatch(/separate observation/);
    expect(surface.detail.toLowerCase()).not.toMatch(/bookings table is empty/);
  });

  it("uses a failure message when the lead query did not return", () => {
    const surface = describeBookingsSurface({ bookingsTableCount: "not-loaded", leadDerivedCount: "unavailable" });
    expect(surface.tone).toBe("error");
    expect(surface.headline).toMatch(/failed to load/i);
    expect(surface.detail).toMatch(/not an empty bookings table/i);
  });
});
