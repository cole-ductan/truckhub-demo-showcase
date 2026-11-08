import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyProposedCrmState, FRONTEND_OUTREACH_CONTRACT, LIVE_SCHEMA_ABSENT } from "@/lib/qa/schemaContract";

const root = process.cwd();

function read(path: string) {
  return readFileSync(`${root}/${path}`, "utf8");
}

describe("schema drift contract", () => {
  it("records the frontend CRM select and RPC against objects Phase 0 found absent", () => {
    const outreach = read("src/pages/admin/AdminOutreach.tsx");
    const types = read("src/integrations/supabase/types.ts");
    expect(outreach).toContain(FRONTEND_OUTREACH_CONTRACT.selectedColumn);
    expect(outreach).toContain(FRONTEND_OUTREACH_CONTRACT.rpc);
    expect(types).not.toContain("crm_state");
    expect(types).not.toContain("set_business_outreach_crm_state");
    expect(types).not.toContain("review_event_import");
    expect(types).toContain("update_business_outreach_pipeline");
    expect(LIVE_SCHEMA_ABSENT).toEqual([
      "business_outreach.crm_state",
      "set_business_outreach_crm_state",
      "review_event_import",
    ]);
  });

  it("keeps the proposed fix in docs and out of supabase/migrations", () => {
    const proposal = read("docs/proposals/fxm-004-business-outreach-crm-state.sql");
    expect(proposal).toMatch(/do not execute/i);
    expect(proposal).toContain("set_business_outreach_crm_state");
    expect(proposal).toContain("crm_state");
    expect(proposal).toContain("DROP FUNCTION IF EXISTS public.set_business_outreach_crm_state");
    expect(proposal).not.toMatch(/create\s+(or\s+replace\s+)?function\s+public\.review_event_import/i);
    expect(proposal).not.toMatch(/delete\s+from\s+public\.businesses/i);
    expect(proposal).not.toMatch(/update\s+public\.businesses/i);
    expect(proposal).toContain("#11");
    expect(proposal).toContain("#17");

    const migrations = readdirSync(`${root}/supabase/migrations`);
    expect(migrations.some((name) => name.includes("fxm-004") || name.includes("crm_state"))).toBe(false);
    for (const name of migrations) {
      expect(read(`supabase/migrations/${name}`)).not.toContain("review_event_import");
    }
  });

  it("does not treat the wider June 7 migration as the smallest fix", () => {
    const wide = read("supabase/migrations/20260607020000_workflow_polish_pass_3_backend.sql");
    expect(wide).toContain("set_business_outreach_crm_state");
    expect(wide).toContain("ALTER TABLE public.claim_requests");
    expect(wide).toContain("assign_business_owner");
  });

  it("keeps the staging plan on main and refuses a paid staging database", () => {
    const plan = read("docs/STAGING_AND_REGRESSION_PLAN.md");
    expect(plan).toContain("7314f8bd1cd506c4c697a41c60748f237a5ce157");
    expect(plan).toContain("feature/gcp-event-crawler-mvp");
    expect(plan).toContain("NOT approved");
    expect(plan).toContain("https://foodxmobile.com");
    expect(plan).toContain("#15");
    expect(plan).toContain("#17");
    expect(plan).toContain("#11");
    expect(plan).not.toContain("truckhub.lovable.app is the");
  });

  it("names the business listing review route separately from event import", () => {
    const app = read("src/App.tsx");
    const review = read("src/pages/admin/AdminListingReview.tsx");
    expect(app).toContain('path="listing-review"');
    expect(app).not.toContain("event-import");
    expect(review).toContain("Business listing review");
    expect(review).toContain("event import queue");
  });

  it("models the proposed lifecycle as a CRM-only change", () => {
    const next = applyProposedCrmState({ businessId: "synth-biz-north-pier", crmState: "active" }, "archived");
    expect(next.record).toEqual({ businessId: "synth-biz-north-pier", crmState: "archived" });
    expect(next.businessListingUntouched).toBe(true);
    expect(next.activity).toMatch(/archived/i);
  });

  it("reports a missing CRM RPC from a local stub instead of calling production", async () => {
    const invoked: string[] = [];
    const liveLike = {
      async rpc(name: string) {
        invoked.push(name);
        if (name === "set_business_outreach_crm_state" || name === "review_event_import") {
          return { data: null, error: { message: `function public.${name} does not exist` } };
        }
        return { data: { ok: true }, error: null };
      },
    };
    const crm = await liveLike.rpc("set_business_outreach_crm_state");
    const review = await liveLike.rpc("review_event_import");
    const pipeline = await liveLike.rpc("update_business_outreach_pipeline");
    expect(crm.error?.message).toMatch(/does not exist/);
    expect(review.error?.message).toMatch(/does not exist/);
    expect(pipeline.error).toBeNull();
    expect(invoked.every((name) => !name.startsWith("http"))).toBe(true);
  });
});
