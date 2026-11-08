import { describe, expect, it } from "vitest";
import { createSupabaseLeadDirectory, type SupabaseLeadClient, type SupabaseQuery } from "./createSupabaseLeadDirectory";
import { actorAnonymous, actorOwnerA, actorOwnerB, FX } from "./fixtures";
import { LeadAccessError } from "./errors";

type Call = { table: string; ops: Array<{ method: string; args: unknown[] }> };

function fakeClient(handlers: {
  from?: (call: Call) => { data: unknown; error: { message: string } | null };
  rpc?: (fn: string, args: Record<string, unknown>) => { data: unknown; error: { message: string } | null };
} = {}) {
  const calls: Call[] = [];
  const rpcs: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client: SupabaseLeadClient = {
    from(table: string) {
      const ops: Call["ops"] = [];
      const call = { table, ops };
      calls.push(call);
      const builder = {
        select(...args: unknown[]) { ops.push({ method: "select", args }); return builder; },
        eq(...args: unknown[]) { ops.push({ method: "eq", args }); return builder; },
        in(...args: unknown[]) { ops.push({ method: "in", args }); return builder; },
        order(...args: unknown[]) { ops.push({ method: "order", args }); return builder; },
        update(...args: unknown[]) { ops.push({ method: "update", args }); return builder; },
        insert(...args: unknown[]) { ops.push({ method: "insert", args }); return builder; },
        delete() { ops.push({ method: "delete", args: [] }); return builder; },
        maybeSingle() {
          return Promise.resolve(handlers.from?.(call) ?? { data: null, error: null });
        },
        then(resolve: (value: { data: unknown; error: { message: string } | null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve(handlers.from?.(call) ?? { data: [], error: null }).then(resolve, reject);
        },
      };
      return builder as unknown as ReturnType<SupabaseLeadClient["from"]>;
    },
    rpc(fn, args) {
      rpcs.push({ fn, args });
      return Promise.resolve(handlers.rpc?.(fn, args) ?? { data: null, error: null });
    },
  };
  return { client, calls, rpcs };
}

const directRow = {
  id: FX.directA,
  business_id: FX.bizA,
  contact_name: "Pat Example",
  contact_email: "pat.example@example.test",
  contact_phone: null,
  event_type: "Birthday",
  event_date: "2026-11-02",
  event_start_time: null,
  event_end_time: null,
  event_location: "STREET-PAT",
  event_zip: null,
  guest_count: "30",
  message: "PII-MESSAGE-PAT",
  stage: "contacted",
  estimated_value: 250,
  internal_notes: "DIRECT-A-NOTES",
  source: "public_form",
  request_type: null,
  cuisine_preference: null,
  budget_range: null,
  service_style: null,
  event_frequency: null,
  created_at: "2026-10-01T15:00:00.000Z",
  updated_at: "2026-10-01T15:00:00.000Z",
  lead_type: "vendor_direct",
  admin_notes: "ADMIN-NOTES-MUST-NOT-LEAK",
  assigned_vendor_ids: [FX.bizB],
};

describe("supabase lead directory", () => {
  it("reads direct leads by business_id and drops raw marketplace rows", async () => {
    const fake = fakeClient({
      from: () => ({
        data: [directRow, { ...directRow, id: "other", business_id: null, contact_email: "leaked@example.test", admin_notes: "ADMIN-NOTES-MUST-NOT-LEAK" }],
        error: null,
      }),
    });
    const crm = createSupabaseLeadDirectory(fake.client);
    const rows = await crm.listOwnerProjections(actorOwnerA, FX.bizA);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "direct", leadId: FX.directA, businessId: FX.bizA });
    if (rows[0].kind !== "direct") return;
    expect(rows[0].customer.streetAddress).toBe("STREET-PAT");
    expect(rows[0].request.publicLocation).toBeNull();
    expect(JSON.stringify(rows)).not.toContain("ADMIN-NOTES-MUST-NOT-LEAK");
    expect(JSON.stringify(rows)).not.toContain("leaked@example.test");
    expect(JSON.stringify(rows)).not.toContain("assigned_vendor_ids");
    const methods = fake.calls.flatMap((call) => call.ops.map((op) => op.method));
    expect(methods).not.toContain("or");
    expect(JSON.stringify(fake.calls)).not.toContain("assigned_vendor_ids");
    expect(fake.calls[0].ops.find((op) => op.method === "eq")?.args).toEqual(["business_id", FX.bizA]);
  });

  it("does not query for an anonymous reader or a marketplace command", async () => {
    const fake = fakeClient();
    const crm = createSupabaseLeadDirectory(fake.client);
    await expect(crm.listOwnerProjections(actorAnonymous, FX.bizA)).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(crm.getOwnerProjection(actorOwnerB, FX.bizA, FX.directA)).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.offerAssignment(actorOwnerA, FX.marketShared, FX.bizA)).rejects.toBeInstanceOf(LeadAccessError);
    await expect(crm.listAdminLeads(actorOwnerA)).rejects.toMatchObject({ code: "migration_required" });
    expect(fake.calls).toEqual([]);
  });

  it("updates only direct CRM columns and refuses assignment fields", async () => {
    const fake = fakeClient({
      from: (call) => {
        if (call.ops.some((op) => op.method === "update")) return { data: { ...directRow, stage: "pending" }, error: null };
        return { data: directRow, error: null };
      },
    });
    const crm = createSupabaseLeadDirectory(fake.client);
    await expect(crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.directA, { assignmentStatus: "accepted" })).rejects.toMatchObject({ code: "forbidden" });
    expect(fake.calls).toEqual([]);
    const updated = await crm.updateOwnerCrm(actorOwnerA, FX.bizA, FX.directA, { stage: "pending", notes: "DIRECT-UPDATED", estimatedValue: 275 });
    expect(updated.kind).toBe("direct");
    const update = fake.calls.find((call) => call.ops.some((op) => op.method === "update"));
    expect(update?.ops.find((op) => op.method === "update")?.args[0]).toEqual({
      stage: "pending",
      internal_notes: "DIRECT-UPDATED",
      estimated_value: 275,
    });
    expect(update?.ops.filter((op) => op.method === "eq").map((op) => op.args)).toEqual([
      ["id", FX.directA],
      ["business_id", FX.bizA],
    ]);
  });

  it("returns a narrow receipt even if the insert response contains a full row", async () => {
    const fake = fakeClient({
      from: () => ({
        data: { id: "receipt-1", contact_email: "anon.direct@example.test", admin_notes: "ADMIN-NOTES-MUST-NOT-LEAK" },
        error: null,
      }),
      rpc: () => ({ data: { id: "too-wide", contact_email: "wide@example.test" }, error: null }),
    });
    const crm = createSupabaseLeadDirectory(fake.client);
    const receipt = await crm.submitDirect(actorAnonymous, {
      businessId: FX.bizA,
      contactName: "Anon Direct",
      contactEmail: "anon.direct@example.test",
    });
    expect(receipt).toEqual({ saved: true, id: "receipt-1" });
    expect(JSON.stringify(receipt)).not.toContain("anon.direct");
    const select = fake.calls[0].ops.find((op) => op.method === "select");
    expect(select?.args).toEqual(["id"]);
    await expect(crm.submitMarketplace(actorAnonymous, {
      contactName: "Anon Example",
      contactEmail: "wide@example.test",
    })).rejects.toMatchObject({ code: "forbidden" });
    await expect(crm.listOwnerProjections(actorAnonymous, FX.bizA)).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("accepts a marketplace rpc uuid as a receipt and nothing else", async () => {
    const fake = fakeClient({ rpc: () => ({ data: "rpc-lead-id", error: null }) });
    const crm = createSupabaseLeadDirectory(fake.client);
    const receipt = await crm.submitMarketplace(actorAnonymous, {
      contactName: "Anon Example",
      contactEmail: "anon.submitter@example.test",
      streetAddress: "STREET-ANON",
      cityOrVenue: "Exampleville",
    });
    expect(receipt).toEqual({ saved: true, id: "rpc-lead-id" });
    expect(fake.rpcs[0].fn).toBe("submit_event_inquiry");
    expect(fake.calls).toEqual([]);
  });
});

void (0 as unknown as SupabaseQuery);
