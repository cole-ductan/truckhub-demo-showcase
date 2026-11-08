/**
 * Render checks against the mock directory. They are not proof of deployed
 * row-level security, and they do not show that a hosted anonymous insert
 * cannot be read back.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadDirectoryProvider } from "@/lib/crm/LeadDirectoryContext";
import { FX, SECRET, actorAdmin, syntheticCrmSnapshot } from "@/lib/crm/fixtures";
import { createMockLeadDirectory, type MockLeadDirectory } from "@/lib/crm/mockLeadDirectory";
import type { OwnerLeadProjection, ThreadMessage } from "@/lib/crm/types";
import OwnerLeads from "./OwnerLeads";
import OwnerMessages from "./OwnerMessages";

const session = vi.hoisted(() => ({
  userId: "11111111-1111-4111-a111-111111111111",
  businessId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  businessName: "Fixture Pretzel Cart",
}));

vi.mock("@/integrations/supabase/client", () => {
  const empty = { data: null, error: null };
  const chain = () => {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = self;
    builder.eq = self;
    builder.order = self;
    builder.maybeSingle = () => Promise.resolve(empty);
    builder.then = (resolve: (value: { data: never[]; error: null }) => void) => resolve({ data: [], error: null });
    return builder;
  };
  return {
    supabase: {
      from: () => chain(),
      functions: { invoke: () => Promise.resolve(empty) },
    },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: session.userId }, isAdmin: false }),
}));

vi.mock("@/hooks/useOwnerBusiness", () => ({
  useOwnerBusiness: () => {
    const business = { id: session.businessId, name: session.businessName };
    return { business, businesses: [business], loading: false };
  },
}));

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

function useOwner(owner: "A" | "B") {
  session.userId = owner === "A" ? FX.ownerA : FX.ownerB;
  session.businessId = owner === "A" ? FX.bizA : FX.bizB;
  session.businessName = owner === "A" ? "Fixture Pretzel Cart" : "Fixture Citrus Truck";
}

function renderLeads(directory: MockLeadDirectory) {
  return render(
    <LeadDirectoryProvider directory={directory}>
      <OwnerLeads />
    </LeadDirectoryProvider>,
  );
}

describe("owner lead privacy UI", () => {
  beforeEach(() => {
    cleanup();
    useOwner("A");
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

  it("shows a thread error instead of an empty conversation", async () => {
    const real = createMockLeadDirectory();
    const directory = {
      ...real,
      listThread: async () => { throw new Error("Thread query failed"); },
    };
    renderLeads(directory);
    fireEvent.click(await screen.findByText("Pat Example"));
    expect(await screen.findByTestId("lead-thread-error")).toHaveTextContent("Thread query failed");
    expect(screen.queryByText("No messages yet. Start the conversation below.")).not.toBeInTheDocument();
  });

  it("drops a stale thread when the open lead changes", async () => {
    const real = createMockLeadDirectory();
    const pending: Array<{ leadId: string; resolve: (rows: ThreadMessage[]) => void }> = [];
    const directory = {
      ...real,
      listThread: (actor: Parameters<MockLeadDirectory["listThread"]>[0], businessId: string, leadId: string) => new Promise<ThreadMessage[]>((resolve) => {
        pending.push({ leadId, resolve });
        void actor;
        void businessId;
      }),
    };
    renderLeads(directory);
    fireEvent.click(await screen.findByText("Pat Example"));
    await waitFor(() => expect(pending.some((item) => item.leadId === FX.directA)).toBe(true));
    fireEvent.click(screen.getByText("Riley Sample"));
    await waitFor(() => expect(pending.some((item) => item.leadId === FX.marketShared)).toBe(true));
    pending.find((item) => item.leadId === FX.directA)?.resolve([{
      id: "stale", threadId: "stale", leadId: FX.directA, businessId: FX.bizA, senderRole: "owner", senderUserId: null, body: "STALE-PAT-THREAD", createdAt: "2026-10-01T00:00:00.000Z",
    }]);
    await waitFor(() => expect(screen.queryByText("STALE-PAT-THREAD")).not.toBeInTheDocument());
    pending.find((item) => item.leadId === FX.marketShared)?.resolve([{
      id: "fresh", threadId: "fresh", leadId: FX.marketShared, businessId: FX.bizA, senderRole: "owner", senderUserId: null, body: "FRESH-RILEY-THREAD", createdAt: "2026-10-16T00:00:00.000Z",
    }]);
    expect(await screen.findByText("FRESH-RILEY-THREAD")).toBeInTheDocument();
    expect(screen.queryByText("STALE-PAT-THREAD")).not.toBeInTheDocument();
  });

  it("does not keep owner A's detail after a delayed switch to owner B", async () => {
    const real = createMockLeadDirectory();
    const pending: Array<{ businessId: string; resolve: () => void }> = [];
    const directory = {
      ...real,
      listOwnerProjections: (actor: Parameters<MockLeadDirectory["listOwnerProjections"]>[0], businessId: string) => new Promise<OwnerLeadProjection[]>((resolve) => {
        real.listOwnerProjections(actor, businessId).then((rows) => pending.push({ businessId, resolve: () => resolve(rows) }));
      }),
    };
    const view = renderLeads(directory);
    await waitFor(() => expect(pending.some((item) => item.businessId === FX.bizA)).toBe(true));
    pending.find((item) => item.businessId === FX.bizA)?.resolve();
    expect(await screen.findByText("Pat Example")).toBeInTheDocument();
    useOwner("B");
    view.rerender(
      <LeadDirectoryProvider directory={directory}>
        <OwnerLeads />
      </LeadDirectoryProvider>,
    );
    await waitFor(() => expect(pending.filter((item) => item.businessId === FX.bizB).length).toBeGreaterThan(0));
    pending.find((item) => item.businessId === FX.bizA)?.resolve();
    expect(screen.queryByText("Pat Example")).not.toBeInTheDocument();
    pending.filter((item) => item.businessId === FX.bizB).forEach((item) => item.resolve());
    expect(await screen.findByText("Quinn Example")).toBeInTheDocument();
    expect(screen.queryByText("Pat Example")).not.toBeInTheDocument();
    expect(screen.queryByText(SECRET.emailPat)).not.toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toContain(SECRET.vendorANotes);
  });

  it("accepts, declines, and shows a revoked detail without the other vendor's notes", async () => {
    const accepted = createMockLeadDirectory();
    renderLeads(accepted);
    fireEvent.click(await screen.findByText("Graduation"));
    fireEvent.click(await screen.findByRole("button", { name: "Accept inquiry" }));
    expect(await screen.findByText(SECRET.emailCasey)).toBeInTheDocument();
    cleanup();

    const declined = createMockLeadDirectory();
    renderLeads(declined);
    fireEvent.click(await screen.findByText("Graduation"));
    fireEvent.click(await screen.findByRole("button", { name: "Decline" }));
    expect(await screen.findAllByText(/^declined$/i)).not.toHaveLength(0);
    expect(screen.queryByText(SECRET.emailCasey)).not.toBeInTheDocument();
    cleanup();

    const revoked = createMockLeadDirectory();
    await revoked.revokeAssignment(actorAdmin, FX.marketShared, FX.bizA);
    renderLeads(revoked);
    await waitFor(() => expect(document.querySelector(`[data-lead-id="${FX.marketShared}"]`)).not.toBeNull());
    const card = document.querySelector(`[data-lead-id="${FX.marketShared}"]`);
    expect(card).toHaveAttribute("data-customer-visible", "false");
    fireEvent.click(card as Element);
    expect(await screen.findByText(SECRET.vendorANotes)).toBeInTheDocument();
    expect(screen.queryByText(SECRET.emailRiley)).not.toBeInTheDocument();
    expect(screen.queryByText(SECRET.vendorBNotes)).not.toBeInTheDocument();
  });

  it("lets owner B save notes without changing owner A's lead", async () => {
    const directory = createMockLeadDirectory();
    useOwner("B");
    const view = renderLeads(directory);
    fireEvent.click(await screen.findByText("Riley Sample"));
    expect(await screen.findByDisplayValue(SECRET.vendorBNotes)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(SECRET.vendorANotes)).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue(SECRET.vendorBNotes), { target: { value: "B-UPDATED-NOTE" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => {
      expect(directory.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedB)?.notes).toBe("B-UPDATED-NOTE");
    });
    expect(directory.readSnapshot().vendorStates.find((row) => row.id === FX.stateSharedA)?.notes).toBe(SECRET.vendorANotes);
    view.unmount();
    useOwner("A");
    renderLeads(directory);
    fireEvent.click(await screen.findByText("Riley Sample"));
    expect(await screen.findByDisplayValue(SECRET.vendorANotes)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("B-UPDATED-NOTE")).not.toBeInTheDocument();
    expect(screen.queryByText(SECRET.vendorBNotes)).not.toBeInTheDocument();
  });
});
