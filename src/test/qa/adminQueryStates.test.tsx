import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { responses } = vi.hoisted(() => ({
  responses: {} as Record<string, { data: unknown; error: { message: string } | null; count?: number | null }>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = responses[table] ?? { data: [], error: null };
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.in = chain;
      builder.order = chain;
      builder.limit = chain;
      builder.maybeSingle = () => Promise.resolve(result);
      builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject);
      return builder;
    },
  },
}));

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminListingReview from "@/pages/admin/AdminListingReview";
import AdminOutreach from "@/pages/admin/AdminOutreach";

function emptyResponses() {
  responses.businesses = { data: [], error: null };
  responses.leads = { data: [], error: null };
  responses.profiles = { data: null, error: null, count: 0 };
  responses.business_outreach = { data: [], error: null };
  responses.business_admin_metadata = { data: [], error: null };
  responses.business_outreach_activities = { data: [], error: null };
}

describe("admin query states", () => {
  beforeEach(() => {
    emptyResponses();
  });

  it("shows dashboard zeros only after a successful empty read", async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByText("No businesses yet.")).toBeInTheDocument();
    expect(screen.getByText("No leads yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("0 published")).toBeInTheDocument();
  });

  it("shows a dashboard alert when the businesses query fails", async () => {
    responses.businesses = { data: null, error: { message: "businesses unavailable" } };
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("businesses unavailable"))).toBe(true);
    expect(screen.queryByText("No businesses yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("0 published")).not.toBeInTheDocument();
  });

  it("does not call an empty business review queue a failed load", async () => {
    render(
      <MemoryRouter>
        <AdminListingReview />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Nothing waiting for review.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Review Queue" })).toBeInTheDocument();
    expect(screen.queryByText(/event import queue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a business review alert instead of an empty queue when the read fails", async () => {
    responses.businesses = { data: null, error: { message: "listing review unavailable" } };
    render(
      <MemoryRouter>
        <AdminListingReview />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("listing review unavailable");
    expect(screen.queryByText("Nothing waiting for review.")).not.toBeInTheDocument();
  });

  it("shows an outreach alert instead of an empty CRM list when crm_state cannot be selected", async () => {
    responses.business_outreach = { data: null, error: { message: "column business_outreach.crm_state does not exist" } };
    render(
      <MemoryRouter>
        <AdminOutreach />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("column business_outreach.crm_state does not exist");
    expect(screen.queryByText("No matching CRM records.")).not.toBeInTheDocument();
    expect(screen.queryByText("Live total")).not.toBeInTheDocument();
  });

  it("shows an empty outreach list when the query succeeds with no rows", async () => {
    render(
      <MemoryRouter>
        <AdminOutreach />
      </MemoryRouter>,
    );
    expect(await screen.findByText("No matching CRM records.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Live total")).toBeInTheDocument();
  });
});
