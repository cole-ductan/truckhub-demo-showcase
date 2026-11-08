import type { BusinessId, LeadId } from "./types";

/**
 * FXM-006 will offer vendors through `offerAssignment` after it decides eligibility.
 * This issue does not score radius, guest count, event type, or pause vs matching.
 */
export type FutureMatcherOffer = {
  leadId: LeadId;
  businessId: BusinessId;
  source: "matcher";
};

/**
 * FXM-015 manual capture (phone, SMS, social, email, in person).
 * Not implemented here. Direct leads already preserve business_id.
 */
export type FutureManualDirectLead = {
  businessId: BusinessId;
  source: "phone" | "sms" | "instagram" | "facebook" | "email" | "in_person";
};

/**
 * Live `submit_event_inquiry` treats a missing vendor_lead_preferences row as
 * receiving inquiries and not paused. FXM-006 owns enforcement of the other columns.
 */
export const ZERO_PREFERENCE_ROW_DEFAULTS = {
  receiveInquiries: true,
  paused: false,
} as const;
