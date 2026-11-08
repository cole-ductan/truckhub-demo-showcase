import type { MarketplaceAssignmentStatus, OwnerLeadProjection, VendorLeadStage } from "./types";

/** Owner-page row. Hidden customer fields are blank, not merely unrendered. */
export type OwnerLeadView = {
  id: string;
  business_id: string;
  kind: "direct" | "marketplace";
  assignment_status: MarketplaceAssignmentStatus | null;
  stage: VendorLeadStage;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  message: string | null;
  street_address: string | null;
  postal_code: string | null;
  event_type: string | null;
  event_date: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  guest_count: string | null;
  public_location: string | null;
  budget_range: string | null;
  estimated_value: number | null;
  internal_notes: string | null;
  quote: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  customer_visible: boolean;
  thread_open: boolean;
  can_edit_crm: boolean;
  can_accept: boolean;
  can_decline: boolean;
  can_delete: boolean;
};

export function projectionToOwnerLeadView(projection: OwnerLeadProjection): OwnerLeadView {
  if (projection.kind === "direct") {
    return {
      id: projection.leadId,
      business_id: projection.businessId,
      kind: "direct",
      assignment_status: null,
      stage: projection.stage,
      contact_name: projection.customer.contactName,
      contact_email: projection.customer.contactEmail,
      contact_phone: projection.customer.contactPhone,
      message: projection.customer.message,
      street_address: projection.customer.streetAddress,
      postal_code: projection.customer.postalCode,
      event_type: projection.request.eventType,
      event_date: projection.request.eventDate,
      event_start_time: projection.request.eventStartTime,
      event_end_time: projection.request.eventEndTime,
      guest_count: projection.request.guestCount,
      public_location: projection.request.publicLocation,
      budget_range: projection.request.budgetRange,
      estimated_value: projection.estimatedValue,
      internal_notes: projection.notes,
      quote: null,
      source: projection.source,
      created_at: projection.createdAt,
      updated_at: projection.updatedAt,
      customer_visible: true,
      thread_open: true,
      can_edit_crm: true,
      can_accept: false,
      can_decline: false,
      can_delete: true,
    };
  }

  const unlocked = projection.assignmentStatus === "accepted" && projection.customer != null;
  const customer = unlocked ? projection.customer : null;
  return {
    id: projection.leadId,
    business_id: projection.businessId,
    kind: "marketplace",
    assignment_status: projection.assignmentStatus,
    stage: projection.stage,
    contact_name: customer ? customer.contactName : "Marketplace inquiry",
    contact_email: customer ? customer.contactEmail : "",
    contact_phone: customer ? customer.contactPhone : null,
    message: customer ? customer.message : null,
    street_address: customer ? customer.streetAddress : null,
    postal_code: customer ? customer.postalCode : null,
    event_type: projection.request.eventType,
    event_date: projection.request.eventDate,
    event_start_time: projection.request.eventStartTime,
    event_end_time: projection.request.eventEndTime,
    guest_count: projection.request.guestCount,
    public_location: projection.request.publicLocation,
    budget_range: projection.request.budgetRange,
    estimated_value: projection.request.estimatedValue,
    internal_notes: projection.notes,
    quote: projection.quote,
    source: "marketplace",
    created_at: projection.createdAt,
    updated_at: projection.updatedAt,
    customer_visible: unlocked,
    thread_open: projection.assignmentStatus === "accepted",
    can_edit_crm: projection.assignmentStatus === "accepted",
    can_accept: projection.assignmentStatus === "offered",
    can_decline: projection.assignmentStatus === "offered",
    can_delete: false,
  };
}
