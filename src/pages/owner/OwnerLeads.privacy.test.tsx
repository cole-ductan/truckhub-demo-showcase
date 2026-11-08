/**
 * Render checks against the mock directory. They are not proof of deployed
 * row-level security, and they do not show that a hosted anonymous insert
 * cannot be read back.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadDirectoryProvider } from "@/lib/crm/LeadDirectoryContext";
import { SECRET, syntheticCrmSnapshot } from "@/lib/crm/fixtures";
import { createMockLeadDirectory } from "@/lib/crm/mockLeadDirectory";
import OwnerLeads from "./OwnerLeads";
import OwnerMessages from "./OwnerMessages";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => { throw new Error("lead UI must use the directory"); },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  },
}));

vi.mock("@/hooks/useAuth", async () => {
  const { FX } = await import("@/lib/crm/fixtures");
  return { useAuth: () => ({ user: { id: FX.ownerA }, isAdmin: false }) };
});

vi.mock("@/hooks/useOwnerBusiness", async () => {
  const { FX } = await import("@/lib/crm/fixtures");
  const business = { id: FX.bizA, name: "Fixture Pretzel Cart" };
  return {
    useOwnerBusiness: () => ({ business, businesses: [business], loading: false }),
  };
});

const forbidden = [
  SECRET.vendorBNotes,
  SECRET.vendorBQuote,
  SECRET.vendorBThread,
  SECRET.sharedNotes,
  SECRET.adminNotes,
  SECRET.sharedThread,
  SECRET.emailCasey,
  SECRET.emailJordan,
  SECRET.emailGray,
  SECRET.emailLegacy,
  SECRET.emailQuinn,
  SECRET.streetCasey,
  SECRET.streetJordan,
  SECRET.customerThreadJordan,
  SECRET.customerThreadGray,
  SECRET.messageCasey,
];

describe("owner lead privacy UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders owner A's leads without another vendor's CRM or hidden customer data", async () => {
    render(
      <LeadDirectoryProvider directory={createMockLeadDirectory(syntheticCrmSnapshot())}>
        <OwnerLeads />
      </LeadDirectoryProvider>,
    );

    expect(await screen.findByText("Riley Sample")).toBeInTheDocument();
    expect(screen.getByText("Pat Example")).toBeInTheDocument();
    expect(screen.getByText("Drew Sample")).toBeInTheDocument();
    expect(screen.getAllByText("Exampleville Civic Green").length).toBeGreaterThan(0);
    const riley = screen.getByText("Riley Sample").closest("[data-stage]");
    expect(riley).toHaveAttribute("data-stage", "quote_sent");
    expect(riley).toHaveAttribute("data-customer-visible", "true");
    const offered = document.querySelector('[data-lead-id="m2222222-2222-4222-8222-222222222222"]');
    expect(offered).toHaveAttribute("data-customer-visible", "false");
    expect(offered).toHaveAttribute("data-assignment", "offered");

    const text = document.body.textContent ?? "";
    for (const secret of forbidden) expect(text).not.toContain(secret);
    expect(text).not.toContain("Casey Sample");
    expect(text).not.toContain("Jordan Sample");
    expect(text).not.toContain("Quinn Example");
  });

  it("lists accepted threads without the other vendor's messages", async () => {
    render(
      <LeadDirectoryProvider directory={createMockLeadDirectory(syntheticCrmSnapshot())}>
        <OwnerMessages />
      </LeadDirectoryProvider>,
    );
    expect(await screen.findByText("Riley Sample")).toBeInTheDocument();
    expect(screen.getByText(/VENDOR-A-THREAD-ONLY/)).toBeInTheDocument();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain(SECRET.vendorBThread);
    expect(text).not.toContain(SECRET.sharedThread);
    expect(text).not.toContain(SECRET.customerThreadJordan);
    expect(text).not.toContain(SECRET.emailCasey);
  });
});
