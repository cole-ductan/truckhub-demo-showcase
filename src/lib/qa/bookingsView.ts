export type BookingsTableCount = number | "not-loaded";
export type LeadDerivedCount = number | "unavailable";

export type BookingsSurface = {
  tone: "error" | "empty" | "populated";
  headline: string;
  detail: string;
};

/**
 * Owner Bookings reads lead stages (quote sent, pending, booked, completed).
 * The bookings table is a different store. Zero table rows are not this view.
 */
export function describeBookingsSurface(input: {
  bookingsTableCount: BookingsTableCount;
  leadDerivedCount: LeadDerivedCount;
}): BookingsSurface {
  if (input.leadDerivedCount === "unavailable") {
    return {
      tone: "error",
      headline: "Lead-stage bookings failed to load",
      detail: "The bookings screen reads lead stages. A failed query is not an empty bookings table.",
    };
  }

  if (input.leadDerivedCount === 0) {
    const tableClause =
      input.bookingsTableCount === "not-loaded"
        ? "This screen does not query the bookings table."
        : input.bookingsTableCount === 0
          ? "A bookings table count of zero is a separate observation and is not this empty state."
          : `The bookings table has ${input.bookingsTableCount} rows, and this screen does not list them.`;
    return {
      tone: "empty",
      headline: "No lead-stage bookings in this view",
      detail: `Leads in Quote Sent, Pending, Booked, or Completed show up here. ${tableClause}`,
    };
  }

  const noun = input.leadDerivedCount === 1 ? "booking" : "bookings";
  return {
    tone: "populated",
    headline: `${input.leadDerivedCount} lead-stage ${noun}`,
    detail: "These rows come from lead stages. They are not a count of the bookings table.",
  };
}
