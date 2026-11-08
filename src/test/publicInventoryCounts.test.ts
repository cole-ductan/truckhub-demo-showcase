import { describe, expect, it } from "vitest";
import { formatVerifiedAggregate } from "@/lib/publicInventoryCopy";
import { loadPublicInventoryCounts, type InventoryCountClient } from "@/lib/publicInventoryCounts";

type CountCall = {
  table: string;
  select: unknown;
  filters: Array<[string, unknown]>;
};

function mockClient(resultForDemoFlag: (isDemo: boolean) => { count: number | null; error: { message?: string } | null } | "throw") {
  const calls: CountCall[] = [];
  const client = {
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let selectArgs: unknown;
      const builder = {
        select(columns: string, options: { count: "exact"; head: true }) {
          selectArgs = [columns, options];
          return builder;
        },
        eq(column: string, value: boolean) {
          filters.push([column, value]);
          return builder;
        },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          const snapshot = { table, select: selectArgs, filters: [...filters] };
          calls.push(snapshot);
          const isDemo = snapshot.filters.find(([column]) => column === "is_demo")?.[1];
          const result = resultForDemoFlag(isDemo === true);
          if (result === "throw") return Promise.reject(new Error("offline count failed")).then(resolve, reject);
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client: client as unknown as InventoryCountClient, calls };
}

function predicates(calls: CountCall[]) {
  return calls.map((call) => ({
    table: call.table,
    select: call.select,
    published: call.filters.some(([column, value]) => column === "is_published" && value === true),
    isDemo: call.filters.find(([column]) => column === "is_demo")?.[1],
  }));
}

describe("public inventory count queries", () => {
  it("counts published non-demo listings separately from published demo listings", async () => {
    const { client, calls } = mockClient((isDemo) => ({ count: isDemo ? 6 : 1, error: null }));
    const counts = await loadPublicInventoryCounts(client);
    expect(predicates(calls)).toEqual([
      { table: "businesses", select: ["id", { count: "exact", head: true }], published: true, isDemo: false },
      { table: "businesses", select: ["id", { count: "exact", head: true }], published: true, isDemo: true },
    ]);
    expect(counts).toEqual({ verifiedPublished: 1, demoPublished: 6, unavailable: false });
    expect(formatVerifiedAggregate(counts)).toContain("1 verified published listing");
    expect(formatVerifiedAggregate(counts)).toContain("6 sample demo listings");
  });

  it("prints a successful zero instead of an estimate", async () => {
    const { client } = mockClient(() => ({ count: 0, error: null }));
    const counts = await loadPublicInventoryCounts(client);
    const text = formatVerifiedAggregate(counts);
    expect(counts).toEqual({ verifiedPublished: 0, demoPublished: 0, unavailable: false });
    expect(text).toContain("0 verified published listings");
    expect(text).toContain("0 sample demo listings");
  });

  it("treats a query error or a null count as unavailable with no estimated total", async () => {
    const errored = await loadPublicInventoryCounts(mockClient((isDemo) => (
      isDemo ? { count: 4, error: null } : { count: null, error: { message: "permission denied" } }
    )).client);
    expect(errored.unavailable).toBe(true);
    expect(formatVerifiedAggregate(errored)).toBe("Listing counts could not be loaded. No estimated total is shown.");
    expect(formatVerifiedAggregate(errored)).not.toMatch(/\d/);

    const missing = await loadPublicInventoryCounts(mockClient(() => ({ count: null, error: null })).client);
    expect(missing).toEqual({ verifiedPublished: null, demoPublished: null, unavailable: true });
    expect(formatVerifiedAggregate(missing)).not.toMatch(/\d/);
  });

  it("does not invent a total when the count client throws", async () => {
    const { client } = mockClient(() => "throw");
    const counts = await loadPublicInventoryCounts(client);
    expect(counts.unavailable).toBe(true);
    expect(formatVerifiedAggregate(counts)).not.toMatch(/\d/);
  });
});
