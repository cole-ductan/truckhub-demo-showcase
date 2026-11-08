import { describe, expect, it } from "vitest";

describe("offline harness credentials", () => {
  it("does not load a hosted Supabase URL or a real publishable key", () => {
    const url = String(import.meta.env.VITE_SUPABASE_URL ?? "");
    const key = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
    const project = String(import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "");
    expect(url).toBe("http://127.0.0.1:59999");
    expect(url.includes("supabase.co")).toBe(false);
    expect(project).toBe("fxm-local-test");
    expect(key).toBe("fxm-test-publishable-placeholder");
    expect(key.startsWith("eyJ")).toBe(false);
  });
});
