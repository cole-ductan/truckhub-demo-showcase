import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertLocalPostgresUrl,
  assertLocalSupabaseUrl,
  localApiUrlFromStatus,
} from "../../../scripts/local-supabase/assertLocalSupabase.mjs";

describe("local Supabase isolation", () => {
  it("accepts only a localhost HTTP API", () => {
    expect(assertLocalSupabaseUrl("http://127.0.0.1:54321").hostname).toBe("127.0.0.1");
    expect(assertLocalSupabaseUrl("http://localhost:54321").hostname).toBe("localhost");
    expect(() => assertLocalSupabaseUrl("https://example.supabase.co")).toThrow(/supabase\.co|non-local|protocol/);
    expect(() => assertLocalSupabaseUrl("http://127.0.0.1:54321/akhmgnjmhvvmprvnwusp")).toThrow(/akhmgnjmhvvmprvnwusp/);
    expect(() => assertLocalSupabaseUrl("http://foodxmobile.com")).toThrow(/foodxmobile|non-local/);
    expect(() => assertLocalSupabaseUrl("http://truckhub.lovable.app")).toThrow(/truckhub|non-local/);
    expect(assertLocalPostgresUrl("postgresql://postgres:postgres@127.0.0.1:54322/postgres").hostname).toBe(
      "127.0.0.1",
    );
    expect(() => assertLocalPostgresUrl("postgresql://postgres:postgres@db.example.supabase.co:5432/postgres")).toThrow(
      /supabase\.co|non-local/,
    );
  });

  it("reads the API URL from supabase status and still rejects a hosted value", () => {
    expect(localApiUrlFromStatus("API_URL=http://127.0.0.1:54321\n")).toBe("http://127.0.0.1:54321");
    expect(() => localApiUrlFromStatus("API_URL=http://akhmgnjmhvvmprvnwusp.supabase.co")).toThrow(
      /supabase\.co|akhmgnjmhvvmprvnwusp|non-local/,
    );
    expect(() => localApiUrlFromStatus("API_URL=https://127.0.0.1:54321")).toThrow(/protocol/);
  });

  it("keeps the local runner off hosted projects, proposal SQL, and new migrations", () => {
    const runner = readFileSync("scripts/local-supabase/run-s5-s6.mjs", "utf8");
    const shape = readFileSync("scripts/local-supabase/live-shape.sql", "utf8");
    const workflow = readFileSync(".github/workflows/baseline-regression.yml", "utf8");
    expect(runner).not.toContain("--linked");
    expect(runner).not.toContain("dotenv");
    expect(runner).not.toMatch(/psql\([^)]*fxm-004/);
    expect(runner).toContain("live-shape.sql");
    expect(runner).toContain("does not prove production RLS");
    expect(shape).not.toMatch(/^\s*create\s+(or\s+replace\s+)?function/im);
    expect(shape).not.toMatch(/review_event_import\s*\(/i);
    expect(shape).not.toMatch(/drop\s+table\s+storage\.buckets/i);
    expect(shape).toContain("DROP COLUMN IF EXISTS crm_state");
    expect(shape).toContain("set_business_outreach_crm_state");
    expect(workflow).not.toMatch(/secrets\./);
    expect(workflow).not.toContain("supabase.co");
    expect(workflow).not.toContain("akhmgnjmhvvmprvnwusp");
    expect(workflow).toContain("npm test");
    expect(workflow).not.toContain("supabase start");
  });

  it("keeps the VM evidence honest about what local RLS does not prove", () => {
    const evidence = readFileSync("docs/qa/S5-S6-LOCAL-EPHEMERAL-SUPABASE.md", "utf8");
    const results = readFileSync("docs/qa/s5-s6-results.json", "utf8");
    expect(evidence).toContain("local ephemeral Supabase: migration replay + per-role JWT RLS");
    expect(evidence).toContain("does not prove production RLS");
    expect(evidence).toContain("cannot close");
    expect(evidence).toContain("repo-shaped");
    expect(evidence).toContain("live-shaped");
    expect(evidence).toContain("#18");
    expect(evidence).not.toContain("eyJ");
    expect(evidence).not.toMatch(/postgres(?:ql)?:\/\//i);
    expect(results).not.toContain("eyJ");
    expect(results).toContain('"provesProductionRls": false');
    expect(results).toContain('"canCloseIssues": false');
  });
});