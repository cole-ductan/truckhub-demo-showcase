import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { responses } = vi.hoisted(() => ({
  responses: {} as Record<string, { data: unknown; error: { message: string } | null }>,
}));

vi.mock("@/hooks/useOwnerBusiness", () => ({
  useOwnerBusiness: () => ({
    business: { id: "synth-biz-north-pier", name: "North Pier Kitchen" },
    loading: false,
  }),
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

import OwnerBookings from "@/pages/owner/OwnerBookings";

describe("owner bookings view", () => {
  beforeEach(() => {
    responses.leads = { data: [], error: null };
    responses.owner_preferences = { data: null, error: null };
    responses.deposit_requests = { data: [], error: null };
  });

  it("describes an empty lead-stage view without calling the bookings table empty", async () => {
    render(
      <MemoryRouter>
        <OwnerBookings />
      </MemoryRouter>,
    );
    expect(await screen.findByText("No lead-stage bookings in this view")).toBeInTheDocument();
    expect(screen.getByText(/does not query the bookings table/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/No bookings here yet/i)).not.toBeInTheDocument();
  });

  it("shows a load failure instead of the empty lead-stage message", async () => {
    responses.leads = { data: null, error: { message: "leads unavailable" } };
    render(
      <MemoryRouter>
        <OwnerBookings />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("leads unavailable");
    expect(screen.queryByText("No lead-stage bookings in this view")).not.toBeInTheDocument();
  });

  it("lists a booked lead even though this screen never reads the bookings table", async () => {
    responses.leads = {
      data: [
        {
          id: "synth-lead-direct-a",
          contact_name: "Ada Fixture",
          event_type: "Fixture tasting",
          event_date: "2026-12-01",
          guest_count: "12",
          estimated_value: 120,
          stage: "booked",
          message: null,
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        },
      ],
      error: null,
    };
    render(
      <MemoryRouter>
        <OwnerBookings />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Ada Fixture")).toBeInTheDocument();
    expect(screen.queryByText("No lead-stage bookings in this view")).not.toBeInTheDocument();
    expect(screen.getByText(/does not read the bookings table/i)).toBeInTheDocument();
  });
});
