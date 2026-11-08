import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  APPLIED_SCHEMA_MIGRATION_VERSIONS,
  CATALOG_ASSIGN_BUSINESS_OWNER,
  CATALOG_CLAIM_REQUESTS,
  CATALOG_STORAGE_BUCKETS,
  GITHUB_DESCRIPTIVE_MIGRATIONS,
} from "@/lib/qa/liveCatalog";
import { LIVE_SCHEMA_ABSENT } from "@/lib/qa/schemaContract";

describe("2026-11-08 production catalog", () => {
  it("does not treat GitHub descriptive migration filenames as applied versions", () => {
    expect(APPLIED_SCHEMA_MIGRATION_VERSIONS).toHaveLength(27);
    expect(GITHUB_DESCRIPTIVE_MIGRATIONS).toHaveLength(15);
    const applied = new Set<string>(APPLIED_SCHEMA_MIGRATION_VERSIONS);
    for (const filename of GITHUB_DESCRIPTIVE_MIGRATIONS) {
      expect(existsSync(`supabase/migrations/${filename}`)).toBe(true);
      expect(applied.has(filename.slice(0, 14))).toBe(false);
    }
    expect(applied.has("20260607020009")).toBe(true);
    expect(applied.has("20260607020000")).toBe(false);
  });

  it("records confirmed absences and the claim, owner, and storage facts", () => {
    expect(LIVE_SCHEMA_ABSENT).toEqual(
      expect.arrayContaining([
        "enforce_archived_business_unpublished",
        "archive_business_listing",
        "reject_obvious_claim_email_typos",
        "businesses_force_archived_unpublished",
        "businesses_block_implicit_archived_restore",
        "business_outreach.crm_state",
      ]),
    );
    expect(CATALOG_ASSIGN_BUSINESS_OWNER).toEqual({ present: true, updatesClaimRequests: false });
    expect(CATALOG_CLAIM_REQUESTS).toEqual({ requesterUserIdNullable: true, requesterUserIdOnDelete: "CASCADE" });
    expect(CATALOG_STORAGE_BUCKETS).toEqual([{ name: "business-assets", public: true }]);
  });

  it("keeps D-04 and the catalog facts in the drift ledger", () => {
    const ledger = readFileSync("docs/SCHEMA_DRIFT_LEDGER.md", "utf8");
    expect(ledger).toContain("D-04");
    expect(ledger).toContain("#13");
    expect(ledger).toContain("20260625090000_event_crawler_intake.sql");
    expect(ledger).toContain("ON DELETE CASCADE");
    expect(ledger).toContain("business-assets");
    expect(ledger).toContain("does not update `claim_requests`");
    expect(ledger).toMatch(/do not rebase, merge, or close/i);
    expect(ledger).toContain("20260607020000_workflow_polish_pass_3_backend.sql");
  });
});
