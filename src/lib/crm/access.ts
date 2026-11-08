import { LeadAccessError } from "./errors";
import {
  isActiveAssignment,
  isVendorLeadStage,
  type Actor,
  type AdminLeadVisibility,
  type AssignmentCommandName,
  type AssignmentEvent,
  type BusinessId,
  type CrmSnapshot,
  type CustomerFields,
  type DirectSubmitInput,
  type LeadId,
  type LeadRecord,
  type MarketplaceLeadProjection,
  type MarketplaceRequestSummary,
  type MarketplaceSubmitInput,
  type OwnerLeadProjection,
  type SubmissionReceipt,
  type ThreadMessage,
  type VendorLeadStage,
  type VendorLeadState,
} from "./types";

export type AccessDeps = {
  now: () => string;
  newId: () => string;
};

export type CommandResult<T> = { snapshot: CrmSnapshot; result: T };

const OWNER_PATCH_KEYS = new Set(["stage", "notes", "quote", "estimatedValue"]);

type OwnerPatch = {
  stage?: VendorLeadStage;
  notes?: string | null;
  quote?: string | null;
  estimatedValue?: number | null;
};

function cloneSnapshot(snapshot: CrmSnapshot): CrmSnapshot {
  return structuredClone(snapshot);
}

function findLead(snapshot: CrmSnapshot, leadId: LeadId): LeadRecord | undefined {
  return snapshot.leads.find((lead) => lead.id === leadId);
}

function findState(snapshot: CrmSnapshot, leadId: LeadId, businessId: BusinessId): VendorLeadState | undefined {
  return snapshot.vendorStates.find((state) => state.leadId === leadId && state.businessId === businessId);
}

function assertOwner(actor: Actor, businessId: BusinessId): void {
  if (actor.kind === "anonymous") throw new LeadAccessError("unauthenticated");
  if (actor.kind !== "owner" || !actor.businessIds.includes(businessId)) {
    throw new LeadAccessError("forbidden");
  }
}

function assertAdmin(actor: Actor): void {
  if (actor.kind === "anonymous") throw new LeadAccessError("unauthenticated");
  if (actor.kind !== "admin") throw new LeadAccessError("forbidden");
}

function assertCanExpire(actor: Actor): void {
  if (actor.kind === "anonymous") throw new LeadAccessError("unauthenticated");
  if (actor.kind === "admin") return;
  if (actor.kind === "system" && actor.job === "expire-offers") return;
  throw new LeadAccessError("forbidden");
}

function requestSummary(lead: LeadRecord): MarketplaceRequestSummary {
  return {
    eventType: lead.eventType,
    requestType: lead.requestType,
    eventDate: lead.eventDate,
    eventStartTime: lead.eventStartTime,
    eventEndTime: lead.eventEndTime,
    guestCount: lead.guestCount,
    publicLocation: lead.cityOrVenue,
    cuisinePreference: lead.cuisinePreference,
    budgetRange: lead.budgetRange,
    estimatedValue: lead.estimatedValue,
    serviceStyle: lead.serviceStyle,
    eventFrequency: lead.eventFrequency,
  };
}

function copyCustomer(lead: LeadRecord): CustomerFields {
  return {
    contactName: lead.customer.contactName,
    contactEmail: lead.customer.contactEmail,
    contactPhone: lead.customer.contactPhone,
    message: lead.customer.message,
    streetAddress: lead.customer.streetAddress,
    postalCode: lead.customer.postalCode,
  };
}

function projectDirect(lead: LeadRecord): OwnerLeadProjection {
  return {
    kind: "direct",
    leadId: lead.id,
    businessId: lead.businessId as BusinessId,
    stage: lead.stage,
    notes: lead.internalNotes,
    estimatedValue: lead.estimatedValue,
    customer: copyCustomer(lead),
    request: requestSummary(lead),
    source: lead.source,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function projectMarketplace(lead: LeadRecord, state: VendorLeadState): MarketplaceLeadProjection {
  const unlocked = state.assignmentStatus === "accepted";
  return {
    kind: "marketplace",
    leadId: lead.id,
    businessId: state.businessId,
    assignmentStatus: state.assignmentStatus,
    stage: state.stage,
    notes: state.notes,
    quote: state.quote,
    threadId: unlocked ? state.threadId : null,
    request: requestSummary(lead),
    customer: unlocked ? copyCustomer(lead) : null,
    assignedAt: state.assignedAt,
    updatedAt: state.updatedAt,
    createdAt: lead.createdAt,
  };
}

/**
 * Vendor visibility:
 * - direct rows stay on business_id and never consult vendor state
 * - marketplace rows require a VendorLeadState for this business
 * - assigned_vendor_ids is ignored
 */
export function listOwnerProjections(actor: Actor, snapshot: CrmSnapshot, businessId: BusinessId): OwnerLeadProjection[] {
  assertOwner(actor, businessId);
  const projections: OwnerLeadProjection[] = [];
  for (const lead of snapshot.leads) {
    if (lead.businessId != null) {
      if (lead.businessId === businessId) projections.push(projectDirect(lead));
      continue;
    }
    const state = findState(snapshot, lead.id, businessId);
    if (state) projections.push(projectMarketplace(lead, state));
  }
  projections.sort((a, b) => {
    const created = b.createdAt.localeCompare(a.createdAt);
    return created !== 0 ? created : b.leadId.localeCompare(a.leadId);
  });
  return projections;
}

export function getOwnerProjection(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
): OwnerLeadProjection | null {
  return listOwnerProjections(actor, snapshot, businessId).find((projection) => projection.leadId === leadId) ?? null;
}

function threadMessages(snapshot: CrmSnapshot, lead: LeadRecord, businessId: BusinessId, threadId: string | null): ThreadMessage[] {
  if (!threadId) return [];
  return snapshot.messages
    .filter((message) => message.leadId === lead.id && message.businessId === businessId && message.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function directMessages(snapshot: CrmSnapshot, lead: LeadRecord): ThreadMessage[] {
  return snapshot.messages
    .filter((message) => {
      if (message.leadId !== lead.id) return false;
      if (lead.businessId == null) return false;
      return message.businessId == null || message.businessId === lead.businessId;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listThread(actor: Actor, snapshot: CrmSnapshot, businessId: BusinessId, leadId: LeadId): ThreadMessage[] {
  const projection = getOwnerProjection(actor, snapshot, businessId, leadId);
  if (!projection) throw new LeadAccessError("not_found");
  const lead = findLead(snapshot, leadId);
  if (!lead) throw new LeadAccessError("not_found");
  if (projection.kind === "direct") return directMessages(snapshot, lead).map((message) => ({ ...message }));
  if (projection.assignmentStatus !== "accepted") throw new LeadAccessError("forbidden");
  const state = findState(snapshot, leadId, businessId);
  if (!state?.threadId) return [];
  return threadMessages(snapshot, lead, businessId, state.threadId).map((message) => ({ ...message }));
}

export function listOwnerThreads(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
): Array<{ projection: OwnerLeadProjection; messages: ThreadMessage[] }> {
  return listOwnerProjections(actor, snapshot, businessId).map((projection) => {
    const lead = findLead(snapshot, projection.leadId);
    if (!lead) return { projection, messages: [] };
    if (projection.kind === "direct") return { projection, messages: directMessages(snapshot, lead).map((message) => ({ ...message })) };
    if (projection.assignmentStatus !== "accepted") return { projection, messages: [] };
    const state = findState(snapshot, projection.leadId, businessId);
    return { projection, messages: threadMessages(snapshot, lead, businessId, state?.threadId ?? null).map((message) => ({ ...message })) };
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function optionalText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new LeadAccessError("forbidden");
  const trimmed = value.trim();
  if (trimmed.length > 5000) throw new LeadAccessError("invalid_transition");
  return trimmed.length === 0 ? null : trimmed;
}

export function parseOwnerPatch(patch: unknown): OwnerPatch {
  if (!isPlainObject(patch)) throw new LeadAccessError("forbidden");
  for (const key of Object.keys(patch)) {
    if (!OWNER_PATCH_KEYS.has(key)) throw new LeadAccessError("forbidden");
  }
  const parsed: OwnerPatch = {};
  if ("stage" in patch) {
    if (!isVendorLeadStage(patch.stage)) throw new LeadAccessError("invalid_transition");
    parsed.stage = patch.stage;
  }
  if ("notes" in patch) parsed.notes = optionalText(patch.notes);
  if ("quote" in patch) parsed.quote = optionalText(patch.quote);
  if ("estimatedValue" in patch) {
    const value = patch.estimatedValue;
    if (value == null) parsed.estimatedValue = null;
    else if (typeof value === "number" && Number.isFinite(value)) parsed.estimatedValue = value;
    else throw new LeadAccessError("forbidden");
  }
  return parsed;
}

export function updateOwnerCrm(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
  patch: unknown,
  deps: AccessDeps,
): CommandResult<OwnerLeadProjection> {
  assertOwner(actor, businessId);
  const parsed = parseOwnerPatch(patch);
  const next = cloneSnapshot(snapshot);
  const lead = findLead(next, leadId);
  if (!lead || (lead.businessId != null && lead.businessId !== businessId)) {
    throw new LeadAccessError("not_found");
  }
  if (lead.businessId != null) {
    if ("quote" in parsed) throw new LeadAccessError("forbidden");
    if (parsed.stage) lead.stage = parsed.stage;
    if ("notes" in parsed) lead.internalNotes = parsed.notes ?? null;
    if ("estimatedValue" in parsed) lead.estimatedValue = parsed.estimatedValue ?? null;
    lead.updatedAt = deps.now();
    const projection = projectDirect(lead);
    return { snapshot: next, result: projection };
  }
  if ("estimatedValue" in parsed) throw new LeadAccessError("forbidden");
  const state = findState(next, leadId, businessId);
  if (!state) throw new LeadAccessError("not_found");
  if (state.assignmentStatus !== "accepted") throw new LeadAccessError("forbidden");
  if (parsed.stage) state.stage = parsed.stage;
  if ("notes" in parsed) state.notes = parsed.notes ?? null;
  if ("quote" in parsed) state.quote = parsed.quote ?? null;
  state.updatedAt = deps.now();
  return { snapshot: next, result: projectMarketplace(lead, state) };
}

export function appendOwnerMessage(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
  body: string,
  deps: AccessDeps,
): CommandResult<ThreadMessage> {
  assertOwner(actor, businessId);
  const text = body.trim();
  if (!text || text.length > 2000) throw new LeadAccessError("invalid_transition");
  const visible = getOwnerProjection(actor, snapshot, businessId, leadId);
  if (!visible) throw new LeadAccessError("not_found");
  if (visible.kind === "marketplace" && visible.assignmentStatus !== "accepted") {
    throw new LeadAccessError("forbidden");
  }
  const next = cloneSnapshot(snapshot);
  const lead = findLead(next, leadId);
  if (!lead) throw new LeadAccessError("not_found");
  const now = deps.now();
  if (lead.businessId != null) {
    const message: ThreadMessage = {
      id: deps.newId(),
      threadId: `direct:${lead.id}`,
      leadId: lead.id,
      businessId,
      senderRole: "owner",
      senderUserId: actor.kind === "owner" ? actor.userId : null,
      body: text,
      createdAt: now,
    };
    next.messages.push(message);
    return { snapshot: next, result: message };
  }
  const state = findState(next, leadId, businessId);
  if (!state || state.assignmentStatus !== "accepted") throw new LeadAccessError("forbidden");
  if (!state.threadId) {
    state.threadId = deps.newId();
    state.updatedAt = now;
  }
  const message: ThreadMessage = {
    id: deps.newId(),
    threadId: state.threadId,
    leadId: lead.id,
    businessId,
    senderRole: "owner",
    senderUserId: actor.kind === "owner" ? actor.userId : null,
    body: text,
    createdAt: now,
  };
  next.messages.push(message);
  return { snapshot: next, result: message };
}

export function deleteDirectLead(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
): CommandResult<void> {
  assertOwner(actor, businessId);
  const lead = findLead(snapshot, leadId);
  if (!lead) throw new LeadAccessError("not_found");
  if (lead.businessId == null || lead.businessId !== businessId) throw new LeadAccessError("forbidden");
  const next = cloneSnapshot(snapshot);
  next.leads = next.leads.filter((row) => row.id !== leadId);
  next.messages = next.messages.filter((message) => message.leadId !== leadId);
  return { snapshot: next, result: undefined };
}

function pushEvent(
  snapshot: CrmSnapshot,
  deps: AccessDeps,
  actor: Actor,
  input: {
    leadId: LeadId;
    businessId: BusinessId;
    command: AssignmentCommandName;
    fromStatus: VendorLeadState["assignmentStatus"] | null;
    toStatus: VendorLeadState["assignmentStatus"];
  },
): void {
  const event: AssignmentEvent = {
    id: deps.newId(),
    leadId: input.leadId,
    businessId: input.businessId,
    command: input.command,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    at: deps.now(),
    actorKind: actor.kind === "anonymous" ? "owner" : actor.kind,
  };
  snapshot.assignmentEvents.push(event);
}

function requireMarketplaceLead(snapshot: CrmSnapshot, leadId: LeadId): LeadRecord {
  const lead = findLead(snapshot, leadId);
  if (!lead) throw new LeadAccessError("not_found");
  if (lead.businessId != null) throw new LeadAccessError("invalid_transition");
  return lead;
}

function blankOffer(deps: AccessDeps, leadId: LeadId, businessId: BusinessId): VendorLeadState {
  const now = deps.now();
  return {
    id: deps.newId(),
    leadId,
    businessId,
    assignmentStatus: "offered",
    stage: "new",
    notes: null,
    quote: null,
    threadId: null,
    assignedAt: now,
    updatedAt: now,
  };
}

function rememberVendor(lead: LeadRecord, businessId: BusinessId): void {
  if (!lead.assignedVendorIds.includes(businessId)) lead.assignedVendorIds.push(businessId);
}

function forgetVendor(lead: LeadRecord, businessId: BusinessId): void {
  lead.assignedVendorIds = lead.assignedVendorIds.filter((id) => id !== businessId);
}

export function acceptAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
  deps: AccessDeps,
): CommandResult<OwnerLeadProjection> {
  assertOwner(actor, businessId);
  const next = cloneSnapshot(snapshot);
  const lead = requireMarketplaceLead(next, leadId);
  const state = findState(next, leadId, businessId);
  if (!state) throw new LeadAccessError("not_found");
  if (state.assignmentStatus !== "offered") throw new LeadAccessError("invalid_transition");
  const fromStatus = state.assignmentStatus;
  state.assignmentStatus = "accepted";
  state.updatedAt = deps.now();
  pushEvent(next, deps, actor, { leadId, businessId, command: "accept", fromStatus, toStatus: "accepted" });
  return { snapshot: next, result: projectMarketplace(lead, state) };
}

export function declineAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  businessId: BusinessId,
  leadId: LeadId,
  deps: AccessDeps,
): CommandResult<OwnerLeadProjection> {
  assertOwner(actor, businessId);
  const next = cloneSnapshot(snapshot);
  const lead = requireMarketplaceLead(next, leadId);
  const state = findState(next, leadId, businessId);
  if (!state) throw new LeadAccessError("not_found");
  if (state.assignmentStatus !== "offered") throw new LeadAccessError("invalid_transition");
  const fromStatus = state.assignmentStatus;
  state.assignmentStatus = "declined";
  state.updatedAt = deps.now();
  forgetVendor(lead, businessId);
  pushEvent(next, deps, actor, { leadId, businessId, command: "decline", fromStatus, toStatus: "declined" });
  return { snapshot: next, result: projectMarketplace(lead, state) };
}

function endActiveAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  businessId: BusinessId,
  toStatus: "revoked" | "expired",
  command: AssignmentCommandName,
  deps: AccessDeps,
): VendorLeadState {
  const lead = requireMarketplaceLead(snapshot, leadId);
  const state = findState(snapshot, leadId, businessId);
  if (!state) throw new LeadAccessError("not_found");
  if (!isActiveAssignment(state.assignmentStatus)) throw new LeadAccessError("invalid_transition");
  const fromStatus = state.assignmentStatus;
  state.assignmentStatus = toStatus;
  state.updatedAt = deps.now();
  forgetVendor(lead, businessId);
  pushEvent(snapshot, deps, actor, { leadId, businessId, command, fromStatus, toStatus });
  return state;
}

export function revokeAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  businessId: BusinessId,
  deps: AccessDeps,
): CommandResult<VendorLeadState> {
  assertAdmin(actor);
  const next = cloneSnapshot(snapshot);
  const state = endActiveAssignment(actor, next, leadId, businessId, "revoked", "revoke", deps);
  return { snapshot: next, result: structuredClone(state) };
}

export function expireAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  businessId: BusinessId,
  deps: AccessDeps,
): CommandResult<VendorLeadState> {
  assertCanExpire(actor);
  const next = cloneSnapshot(snapshot);
  const state = endActiveAssignment(actor, next, leadId, businessId, "expired", "expire", deps);
  return { snapshot: next, result: structuredClone(state) };
}

function createOrReoffer(
  snapshot: CrmSnapshot,
  actor: Actor,
  lead: LeadRecord,
  businessId: BusinessId,
  command: AssignmentCommandName,
  deps: AccessDeps,
): VendorLeadState {
  const existing = findState(snapshot, lead.id, businessId);
  if (!existing) {
    const created = blankOffer(deps, lead.id, businessId);
    snapshot.vendorStates.push(created);
    rememberVendor(lead, businessId);
    pushEvent(snapshot, deps, actor, {
      leadId: lead.id,
      businessId,
      command,
      fromStatus: null,
      toStatus: "offered",
    });
    return created;
  }
  if (isActiveAssignment(existing.assignmentStatus)) throw new LeadAccessError("invalid_transition");
  const fromStatus = existing.assignmentStatus;
  existing.assignmentStatus = "offered";
  existing.updatedAt = deps.now();
  rememberVendor(lead, businessId);
  pushEvent(snapshot, deps, actor, {
    leadId: lead.id,
    businessId,
    command,
    fromStatus,
    toStatus: "offered",
  });
  return existing;
}

export function offerAssignment(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  businessId: BusinessId,
  deps: AccessDeps,
): CommandResult<VendorLeadState> {
  assertAdmin(actor);
  const next = cloneSnapshot(snapshot);
  const lead = requireMarketplaceLead(next, leadId);
  const state = createOrReoffer(next, actor, lead, businessId, "offer", deps);
  return { snapshot: next, result: structuredClone(state) };
}

export function reassignMarketplaceLead(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  fromBusinessId: BusinessId,
  toBusinessId: BusinessId,
  deps: AccessDeps,
): CommandResult<{ revoked: VendorLeadState; offered: VendorLeadState }> {
  assertAdmin(actor);
  if (fromBusinessId === toBusinessId) throw new LeadAccessError("invalid_transition");
  const next = cloneSnapshot(snapshot);
  const revoked = endActiveAssignment(actor, next, leadId, fromBusinessId, "revoked", "reassign", deps);
  const lead = requireMarketplaceLead(next, leadId);
  const offered = createOrReoffer(next, actor, lead, toBusinessId, "reassign", deps);
  return {
    snapshot: next,
    result: { revoked: structuredClone(revoked), offered: structuredClone(offered) },
  };
}

/**
 * Legacy assigned_vendor_ids become offered rows with empty CRM.
 * Existing rows are left alone so an accepted vendor is not rewritten
 * and a historical slot is never silently marked accepted.
 */
export function mapLegacyAssignmentSlots(
  actor: Actor,
  snapshot: CrmSnapshot,
  leadId: LeadId,
  deps: AccessDeps,
): CommandResult<VendorLeadState[]> {
  assertAdmin(actor);
  const next = cloneSnapshot(snapshot);
  const lead = requireMarketplaceLead(next, leadId);
  const created: VendorLeadState[] = [];
  for (const businessId of lead.assignedVendorIds) {
    if (findState(next, leadId, businessId)) continue;
    created.push(createOrReoffer(next, actor, lead, businessId, "map_legacy", deps));
  }
  return { snapshot: next, result: structuredClone(created) };
}

function requireText(value: string, labelChecked: boolean): string {
  const trimmed = value.trim();
  if (!labelChecked || !trimmed) throw new LeadAccessError("invalid_transition");
  return trimmed;
}

export function submitDirect(
  snapshot: CrmSnapshot,
  input: DirectSubmitInput,
  deps: AccessDeps,
): CommandResult<SubmissionReceipt> {
  const name = requireText(input.contactName, true);
  const email = requireText(input.contactEmail, true);
  if (!input.businessId) throw new LeadAccessError("invalid_transition");
  const next = cloneSnapshot(snapshot);
  const now = deps.now();
  const id = deps.newId();
  next.leads.push({
    id,
    businessId: input.businessId,
    leadType: "vendor_direct",
    stage: "new",
    internalNotes: null,
    estimatedValue: null,
    adminNotes: null,
    assignedVendorIds: [],
    distributionStatus: null,
    source: input.source ?? "public_form",
    customer: {
      contactName: name,
      contactEmail: email,
      contactPhone: input.contactPhone?.trim() || null,
      message: input.message?.trim() || null,
      streetAddress: input.streetAddress?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
    },
    cityOrVenue: input.cityOrVenue?.trim() || null,
    eventType: input.eventType?.trim() || null,
    requestType: null,
    eventDate: input.eventDate?.trim() || null,
    eventStartTime: null,
    eventEndTime: null,
    guestCount: input.guestCount?.trim() || null,
    cuisinePreference: null,
    budgetRange: null,
    serviceStyle: null,
    eventFrequency: null,
    createdAt: now,
    updatedAt: now,
  });
  return { snapshot: next, result: { saved: true, id } };
}

export function submitMarketplace(
  snapshot: CrmSnapshot,
  input: MarketplaceSubmitInput,
  deps: AccessDeps,
): CommandResult<SubmissionReceipt> {
  const name = requireText(input.contactName, true);
  const email = requireText(input.contactEmail, true);
  const next = cloneSnapshot(snapshot);
  const now = deps.now();
  const id = deps.newId();
  next.leads.push({
    id,
    businessId: null,
    leadType: "event_inquiry",
    stage: "new",
    internalNotes: null,
    estimatedValue: input.estimatedValue ?? null,
    adminNotes: null,
    assignedVendorIds: [],
    distributionStatus: "pending_review",
    source: "Book a Food Truck",
    customer: {
      contactName: name,
      contactEmail: email,
      contactPhone: input.contactPhone?.trim() || null,
      message: input.message?.trim() || null,
      streetAddress: input.streetAddress?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
    },
    cityOrVenue: input.cityOrVenue?.trim() || null,
    eventType: input.eventType?.trim() || null,
    requestType: input.requestType?.trim() || null,
    eventDate: input.eventDate?.trim() || null,
    eventStartTime: input.eventStartTime?.trim() || null,
    eventEndTime: input.eventEndTime?.trim() || null,
    guestCount: input.guestCount?.trim() || null,
    cuisinePreference: input.cuisinePreference?.trim() || null,
    budgetRange: input.budgetRange?.trim() || null,
    serviceStyle: input.serviceStyle?.trim() || null,
    eventFrequency: input.eventFrequency?.trim() || null,
    createdAt: now,
    updatedAt: now,
  });
  return { snapshot: next, result: { saved: true, id } };
}

export function listAdminLeads(actor: Actor, snapshot: CrmSnapshot): AdminLeadVisibility[] {
  assertAdmin(actor);
  return snapshot.leads.map((lead) => {
    const vendorStates = snapshot.vendorStates
      .filter((state) => state.leadId === lead.id)
      .map((state) => ({
        ...structuredClone(state),
        messages: snapshot.messages
          .filter((message) => message.leadId === lead.id && message.businessId === state.businessId && message.threadId === state.threadId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      }));
    const direct = lead.businessId != null;
    return {
      leadId: lead.id,
      businessId: lead.businessId,
      leadType: lead.leadType,
      sharedStage: lead.stage,
      sharedInternalNotes: lead.internalNotes,
      adminNotes: lead.adminNotes,
      assignedVendorIds: [...lead.assignedVendorIds],
      estimatedValue: lead.estimatedValue,
      customer: copyCustomer(lead),
      request: requestSummary(lead),
      directCrm: direct
        ? { stage: lead.stage, notes: lead.internalNotes, estimatedValue: lead.estimatedValue }
        : null,
      vendorStates: vendorStates.map((state) => ({ ...state, messages: state.messages.map((message) => ({ ...message })) })),
      directMessages: direct ? directMessages(snapshot, lead).map((message) => ({ ...message })) : [],
      unscopedMessages: direct
        ? []
        : snapshot.messages.filter((message) => message.leadId === lead.id && message.businessId == null).map((message) => ({ ...message })),
      assignmentEvents: snapshot.assignmentEvents.filter((event) => event.leadId === lead.id),
    };
  });
}
