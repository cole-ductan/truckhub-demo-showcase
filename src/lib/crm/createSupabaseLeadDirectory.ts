import { eventInquiryPayloadFromForm } from "./eventInquiryPayload";
import { LeadAccessError } from "./errors";
import { parseOwnerPatch } from "./access";
import { isVendorLeadStage, type Actor, type BusinessId, type CustomerFields, type DirectSubmitInput, type LeadId, type MarketplaceRequestSummary, type MarketplaceSubmitInput, type OwnerLeadProjection, type SubmissionReceipt, type ThreadMessage, type VendorLeadStage } from "./types";
import type { LeadDirectory } from "./mockLeadDirectory";

type PostgrestError = { message: string } | null;

export type SupabaseQuery = PromiseLike<{ data: unknown; error: PostgrestError }> & {
  select: (columns?: string) => SupabaseQuery;
  eq: (column: string, value: unknown) => SupabaseQuery;
  in: (column: string, values: readonly unknown[]) => SupabaseQuery;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: PostgrestError }>;
};

export type SupabaseLeadClient = {
  from: (table: string) => {
    select: (columns?: string) => SupabaseQuery;
    insert: (values: Record<string, unknown>) => SupabaseQuery;
    update: (values: Record<string, unknown>) => SupabaseQuery;
    delete: () => SupabaseQuery;
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: PostgrestError }>;
};

function assertOwner(actor: Actor, businessId: BusinessId): void {
  if (actor.kind === "anonymous") throw new LeadAccessError("unauthenticated");
  if (actor.kind !== "owner" || !actor.businessIds.includes(businessId)) throw new LeadAccessError("forbidden");
}

function fail(error: PostgrestError): never {
  throw new LeadAccessError("forbidden", error?.message || "You cannot view or change that lead.");
}

async function rowsOf(query: SupabaseQuery): Promise<Record<string, unknown>[]> {
  const { data, error } = await query;
  if (error) fail(error);
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is Record<string, unknown> => !!row && typeof row === "object");
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stageOf(value: unknown): VendorLeadStage {
  if (!isVendorLeadStage(value)) throw new LeadAccessError("invalid_transition");
  return value;
}

/**
 * Live event_location is one free-text column and may be a street.
 * Offered summaries must not use it. Direct owners see it as private address.
 */
function projectDirectRow(row: Record<string, unknown>, businessId: BusinessId): OwnerLeadProjection | null {
  if (typeof row.business_id !== "string" || row.business_id !== businessId) return null;
  const customer: CustomerFields = {
    contactName: text(row.contact_name) ?? "",
    contactEmail: text(row.contact_email) ?? "",
    contactPhone: text(row.contact_phone),
    message: text(row.message),
    streetAddress: text(row.event_location),
    postalCode: text(row.event_zip),
  };
  const request: MarketplaceRequestSummary = {
    eventType: text(row.event_type),
    requestType: text(row.request_type),
    eventDate: text(row.event_date),
    eventStartTime: text(row.event_start_time),
    eventEndTime: text(row.event_end_time),
    guestCount: text(row.guest_count),
    publicLocation: null,
    cuisinePreference: text(row.cuisine_preference),
    budgetRange: text(row.budget_range),
    estimatedValue: typeof row.estimated_value === "number" ? row.estimated_value : null,
    serviceStyle: text(row.service_style),
    eventFrequency: text(row.event_frequency),
  };
  return {
    kind: "direct",
    leadId: String(row.id),
    businessId,
    stage: stageOf(row.stage),
    notes: text(row.internal_notes),
    estimatedValue: request.estimatedValue,
    customer,
    request,
    source: text(row.source),
    createdAt: text(row.created_at) ?? "",
    updatedAt: text(row.updated_at) ?? "",
  };
}

function migration(): never {
  throw new LeadAccessError("migration_required");
}

export function createSupabaseLeadDirectory(client: SupabaseLeadClient): LeadDirectory {
  async function ownedDirect(actor: Actor, businessId: BusinessId, leadId: LeadId): Promise<OwnerLeadProjection> {
    assertOwner(actor, businessId);
    const { data, error } = await client
      .from("leads")
      .select("id,business_id,contact_name,contact_email,contact_phone,event_type,event_date,event_start_time,event_end_time,event_location,event_zip,guest_count,message,stage,estimated_value,internal_notes,source,request_type,cuisine_preference,budget_range,service_style,event_frequency,created_at,updated_at,lead_type")
      .eq("id", leadId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (error) fail(error);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new LeadAccessError("not_found");
    const projection = projectDirectRow(data as Record<string, unknown>, businessId);
    if (!projection) throw new LeadAccessError("forbidden");
    return projection;
  }

  async function listOwnerProjections(actor: Actor, businessId: BusinessId): Promise<OwnerLeadProjection[]> {
    assertOwner(actor, businessId);
    const rows = await rowsOf(
      client.from("leads")
        .select("id,business_id,contact_name,contact_email,contact_phone,event_type,event_date,event_start_time,event_end_time,event_location,event_zip,guest_count,message,stage,estimated_value,internal_notes,source,request_type,cuisine_preference,budget_range,service_style,event_frequency,created_at,updated_at,lead_type")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
    );
    return rows.flatMap((row) => {
      const projection = projectDirectRow(row, businessId);
      return projection ? [projection] : [];
    });
  }

  return {
    marketplaceStatus: "migration_required",
    listOwnerProjections,

    async getOwnerProjection(actor, businessId, leadId) {
      try {
        return await ownedDirect(actor, businessId, leadId);
      } catch (error) {
        if (error instanceof LeadAccessError && error.code === "not_found") return null;
        throw error;
      }
    },

    async updateOwnerCrm(actor, businessId, leadId, patch) {
      assertOwner(actor, businessId);
      const parsed = parseOwnerPatch(patch);
      if ("quote" in parsed) throw new LeadAccessError("forbidden");
      await ownedDirect(actor, businessId, leadId);
      const payload: Record<string, unknown> = {};
      if (parsed.stage) payload.stage = parsed.stage;
      if ("notes" in parsed) payload.internal_notes = parsed.notes ?? null;
      if ("estimatedValue" in parsed) payload.estimated_value = parsed.estimatedValue ?? null;
      const { data, error } = await client.from("leads").update(payload).eq("id", leadId).eq("business_id", businessId).select("id,business_id,contact_name,contact_email,contact_phone,event_type,event_date,event_start_time,event_end_time,event_location,event_zip,guest_count,message,stage,estimated_value,internal_notes,source,request_type,cuisine_preference,budget_range,service_style,event_frequency,created_at,updated_at,lead_type").maybeSingle();
      if (error) fail(error);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new LeadAccessError("not_found");
      const projection = projectDirectRow(data as Record<string, unknown>, businessId);
      if (!projection) throw new LeadAccessError("forbidden");
      return projection;
    },

    async listThread(actor, businessId, leadId) {
      await ownedDirect(actor, businessId, leadId);
      const rows = await rowsOf(
        client.from("lead_messages").select("id,lead_id,sender_role,sender_user_id,body,created_at").eq("lead_id", leadId).order("created_at", { ascending: true }),
      );
      return rows.map((row) => messageFromRow(row, leadId, businessId));
    },

    async listOwnerThreads(actor, businessId) {
      const projections = await listOwnerProjections(actor, businessId);
      const ids = projections.map((projection) => projection.leadId);
      if (ids.length === 0) return [];
      const rows = await rowsOf(
        client.from("lead_messages").select("id,lead_id,sender_role,sender_user_id,body,created_at").in("lead_id", ids).order("created_at", { ascending: true }),
      );
      return projections.map((projection) => ({
        projection,
        messages: rows.filter((row) => row.lead_id === projection.leadId).map((row) => messageFromRow(row, projection.leadId, businessId)),
      }));
    },

    async appendOwnerMessage(actor, businessId, leadId, body) {
      assertOwner(actor, businessId);
      const text = body.trim();
      if (!text || text.length > 2000) throw new LeadAccessError("invalid_transition");
      await ownedDirect(actor, businessId, leadId);
      const { data, error } = await client.from("lead_messages").insert({
        lead_id: leadId,
        sender_role: "owner",
        sender_user_id: actor.kind === "owner" ? actor.userId : null,
        body: text,
      }).select("id,lead_id,sender_role,sender_user_id,body,created_at").maybeSingle();
      if (error) fail(error);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new LeadAccessError("forbidden");
      return messageFromRow(data as Record<string, unknown>, leadId, businessId);
    },

    async deleteDirectLead(actor, businessId, leadId) {
      await ownedDirect(actor, businessId, leadId);
      const messageResult = await client.from("lead_messages").delete().eq("lead_id", leadId);
      if (messageResult.error) fail(messageResult.error);
      const leadResult = await client.from("leads").delete().eq("id", leadId).eq("business_id", businessId);
      if (leadResult.error) fail(leadResult.error);
    },

    async acceptAssignment() { migration(); },
    async declineAssignment() { migration(); },
    async listAdminLeads() { migration(); },
    async offerAssignment() { migration(); },
    async revokeAssignment() { migration(); },
    async expireAssignment() { migration(); },
    async reassignMarketplaceLead() { migration(); },
    async mapLegacyAssignmentSlots() { migration(); },

    async submitDirect(_actor, input: DirectSubmitInput): Promise<SubmissionReceipt> {
      const { data, error } = await client.from("leads").insert({
        business_id: input.businessId,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone || null,
        event_type: input.eventType || null,
        event_date: input.eventDate || null,
        guest_count: input.guestCount || null,
        message: input.message || null,
        source: input.source ?? "public_form",
      }).select("id").maybeSingle();
      if (error) fail(error);
      const id = data && typeof data === "object" && !Array.isArray(data) ? (data as { id?: unknown }).id : null;
      if (typeof id !== "string" || !id) throw new LeadAccessError("forbidden", "Submission did not return a lead id.");
      return { saved: true, id };
    },

    async submitMarketplace(_actor, input: MarketplaceSubmitInput): Promise<SubmissionReceipt> {
      const payload = input.eventInquiryPayload
        ? eventInquiryPayloadFromForm(input.eventInquiryPayload)
        : {
          contact_name: input.contactName,
          contact_email: input.contactEmail,
          contact_phone: input.contactPhone ?? "",
          event_date: input.eventDate ?? "",
          event_start_time: input.eventStartTime ?? "",
          event_end_time: input.eventEndTime ?? "",
          event_location: input.streetAddress ?? "",
          event_zip: input.postalCode ?? "",
          guest_count: input.guestCount ?? "",
          event_type: input.eventType ?? "",
          cuisine_preference: input.cuisinePreference ?? "",
          budget_range: input.budgetRange ?? "",
          message: input.message ?? "",
          request_type: input.requestType ?? "",
          event_frequency: input.eventFrequency ?? "",
          service_style: input.serviceStyle ?? "",
          category_id: input.categoryId || null,
          consent: true,
        };
      const { data, error } = await client.rpc("submit_event_inquiry", { _payload: payload });
      if (error) fail(error);
      if (typeof data !== "string" || !data) {
        throw new LeadAccessError("forbidden", "Submission did not return a lead id.");
      }
      return { saved: true, id: data };
    },
  };
}

function messageFromRow(row: Record<string, unknown>, leadId: LeadId, businessId: BusinessId): ThreadMessage {
  const role = row.sender_role === "owner" || row.sender_role === "admin" || row.sender_role === "customer"
    ? row.sender_role
    : "customer";
  return {
    id: String(row.id),
    threadId: `direct:${leadId}`,
    leadId,
    businessId,
    senderRole: role,
    senderUserId: typeof row.sender_user_id === "string" ? row.sender_user_id : null,
    body: typeof row.body === "string" ? row.body : "",
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}
