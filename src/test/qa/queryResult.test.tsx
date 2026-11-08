import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { classifyQuery, countFromQuery } from "@/lib/qa/queryResult";
import { QueryStateNotice } from "@/components/qa/QueryStateNotice";

describe("query error versus empty", () => {
  it("does not turn a failed query into a zero count", () => {
    expect(countFromQuery({ data: null, error: { message: "column crm_state does not exist" }, count: 0 })).toEqual({
      status: "error",
      message: "column crm_state does not exist",
    });
    expect(classifyQuery({ data: null, error: { message: "permission denied" } }).kind).toBe("error");
  });

  it("treats a successful empty payload as empty", () => {
    expect(classifyQuery({ data: [], error: null })).toEqual({ kind: "empty" });
    expect(countFromQuery({ data: [], error: null })).toEqual({ status: "ok", count: 0 });
  });

  it("uses an exact head count when the row payload is null", () => {
    expect(countFromQuery({ data: null, error: null, count: 4 })).toEqual({ status: "ok", count: 4 });
  });

  it("renders a failed query as an alert and an empty result as a quiet note", () => {
    const { rerender } = render(
      <QueryStateNotice kind="error" title="Outreach CRM" message="column crm_state does not exist" />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Outreach CRM failed to load");
    expect(screen.getByRole("alert")).toHaveTextContent("column crm_state does not exist");

    rerender(<QueryStateNotice kind="empty" title="Business listing review" message="No business listings waiting for review." />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("No business listings waiting for review.")).toBeInTheDocument();
  });
});
