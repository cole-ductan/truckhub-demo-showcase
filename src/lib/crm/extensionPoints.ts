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
 * Preference defaults for vendors with no saved row belong to FXM-006 / #19.
 */
export type FutureManualDirectLead = {
  businessId: BusinessId;
  source: "phone" | "sms" | "instagram" | "facebook" | "email" | "in_person";
};
