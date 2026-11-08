/**
 * Lane A CRM types from the Director schema contract (FXM-005 / #18).
 * Status unions are unchanged. Projection fields are the locked allowlists.
 */

export type LeadId = string;
export type BusinessId = string;
export type ProfileId = string;

export type MarketplaceAssignmentStatus =
  | "offered"
  | "accepted"
  | "declined"
  | "revoked"
  | "expired";

export type VendorLeadStage =
  | "new"
  | "contacted"
  | "quote_sent"
  | "pending"
  | "booked"
  | "completed"
  | "lost";

export const VENDOR_LEAD_STAGES: readonly VendorLeadStage[] = [
  "new",
  "contacted",
  "quote_sent",
  "pending",
  "booked",
  "completed",
  "lost",
];

export const MARKETPLACE_ASSIGNMENT_STATUSES: readonly MarketplaceAssignmentStatus[] = [
  "offered",
  "accepted",
  "declined",
  "revoked",
  "expired",
];

export type VendorLeadState = {
  id: string;
  leadId: LeadId;
  businessId: BusinessId;
  assignmentStatus: MarketplaceAssignmentStatus;
  stage: VendorLeadStage;
  notes: string | null;
  quote: string | null;
  threadId: string | null;
  assignedAt: string;
  updatedAt: string;
};

/** Customer PII. Present on a vendor projection only after that vendor accepts. */
export type CustomerFields = {
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  message: string | null;
  streetAddress: string | null;
  postalCode: string | null;
};

/**
 * Non-identifying request summary.
 * publicLocation is city or a public venue, never a private street.
 * estimatedValue is shared customer-supplied budget, not a vendor quote.
 */
export type MarketplaceRequestSummary = {
  eventType: string | null;
  requestType: string | null;
  eventDate: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  guestCount: string | null;
  publicLocation: string | null;
  cuisinePreference: string | null;
  budgetRange: string | null;
  estimatedValue: number | null;
  serviceStyle: string | null;
  eventFrequency: string | null;
};

export type DirectLeadProjection = {
  kind: "direct";
  leadId: LeadId;
  businessId: BusinessId;
  stage: VendorLeadStage;
  notes: string | null;
  estimatedValue: number | null;
  customer: CustomerFields;
  request: MarketplaceRequestSummary;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketplaceLeadProjection = {
  kind: "marketplace";
  leadId: LeadId;
  businessId: BusinessId;
  assignmentStatus: MarketplaceAssignmentStatus;
  stage: VendorLeadStage;
  notes: string | null;
  quote: string | null;
  /** Set only while this vendor's assignment is accepted. */
  threadId: string | null;
  request: MarketplaceRequestSummary;
  /** Null unless assignmentStatus is "accepted". */
  customer: CustomerFields | null;
  assignedAt: string;
  updatedAt: string;
  createdAt: string;
};

export type OwnerLeadProjection = DirectLeadProjection | MarketplaceLeadProjection;

export type ThreadMessage = {
  id: string;
  threadId: string;
  leadId: LeadId;
  businessId: BusinessId | null;
  senderRole: "owner" | "customer" | "admin";
  senderUserId: ProfileId | null;
  body: string;
  createdAt: string;
};

export type AssignmentCommandName =
  | "offer"
  | "accept"
  | "decline"
  | "revoke"
  | "expire"
  | "reassign"
  | "map_legacy";

/** Append-only audit so reassignment does not overwrite a row without history. */
export type AssignmentEvent = {
  id: string;
  leadId: LeadId;
  businessId: BusinessId;
  command: AssignmentCommandName;
  fromStatus: MarketplaceAssignmentStatus | null;
  toStatus: MarketplaceAssignmentStatus;
  at: string;
  actorKind: "owner" | "admin" | "system";
};

export type AnonymousActor = { kind: "anonymous" };
export type OwnerActor = { kind: "owner"; userId: ProfileId; businessIds: readonly BusinessId[] };
export type AdminActor = { kind: "admin"; userId: ProfileId };
export type SystemActor = { kind: "system"; job: "expire-offers" };
export type Actor = AnonymousActor | OwnerActor | AdminActor | SystemActor;

export type SubmissionReceipt = { saved: true; id: LeadId };

export type LeadRecord = {
  id: LeadId;
  businessId: BusinessId | null;
  leadType: string;
  stage: VendorLeadStage;
  internalNotes: string | null;
  estimatedValue: number | null;
  adminNotes: string | null;
  assignedVendorIds: BusinessId[];
  distributionStatus: string | null;
  source: string | null;
  customer: CustomerFields;
  /** City or public venue. Never copy a street into this field. */
  cityOrVenue: string | null;
  eventType: string | null;
  requestType: string | null;
  eventDate: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  guestCount: string | null;
  cuisinePreference: string | null;
  budgetRange: string | null;
  serviceStyle: string | null;
  eventFrequency: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmSnapshot = {
  leads: LeadRecord[];
  vendorStates: VendorLeadState[];
  messages: ThreadMessage[];
  assignmentEvents: AssignmentEvent[];
};

export type AdminVendorStateView = VendorLeadState & { messages: ThreadMessage[] };

export type AdminLeadVisibility = {
  leadId: LeadId;
  businessId: BusinessId | null;
  leadType: string;
  sharedStage: VendorLeadStage;
  sharedInternalNotes: string | null;
  adminNotes: string | null;
  assignedVendorIds: BusinessId[];
  estimatedValue: number | null;
  customer: CustomerFields;
  request: MarketplaceRequestSummary;
  directCrm: { stage: VendorLeadStage; notes: string | null; estimatedValue: number | null } | null;
  vendorStates: AdminVendorStateView[];
  directMessages: ThreadMessage[];
  unscopedMessages: ThreadMessage[];
  assignmentEvents: AssignmentEvent[];
};

export type DirectSubmitInput = {
  businessId: BusinessId;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  guestCount?: string | null;
  message?: string | null;
  cityOrVenue?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  source?: string | null;
};

export type MarketplaceSubmitInput = {
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  eventType?: string | null;
  requestType?: string | null;
  eventDate?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  guestCount?: string | null;
  cityOrVenue?: string | null;
  streetAddress?: string | null;
  postalCode?: string | null;
  message?: string | null;
  cuisinePreference?: string | null;
  budgetRange?: string | null;
  estimatedValue?: number | null;
  serviceStyle?: string | null;
  eventFrequency?: string | null;
  /** Forwarded to the existing inquiry RPC. Matching itself is FXM-006. */
  categoryId?: string | null;
};

export function isActiveAssignment(status: MarketplaceAssignmentStatus): boolean {
  return status === "offered" || status === "accepted";
}

export function isVendorLeadStage(value: unknown): value is VendorLeadStage {
  return typeof value === "string" && (VENDOR_LEAD_STAGES as readonly string[]).includes(value);
}
