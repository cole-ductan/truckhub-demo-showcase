export type QueryError = { message: string };

export type SupabaseListResult<T> = {
  data: T[] | null;
  error: QueryError | null;
  count?: number | null;
};

export type ClassifiedQuery<T> =
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "rows"; rows: T[] };

export type CountResult =
  | { status: "ok"; count: number }
  | { status: "error"; message: string };

/** A failed query stays an error. Null data without an error is empty, not a hidden failure. */
export function classifyQuery<T>(result: SupabaseListResult<T> | null | undefined): ClassifiedQuery<T> {
  if (!result || result.error) {
    return { kind: "error", message: result?.error?.message || "Query failed" };
  }
  const rows = result.data ?? [];
  if (rows.length === 0) return { kind: "empty" };
  return { kind: "rows", rows };
}

/**
 * Count list queries from rows, and head/exact counts from `count`.
 * An error is never reported as zero.
 */
export function countFromQuery(result: SupabaseListResult<unknown> | null | undefined): CountResult {
  if (!result || result.error) {
    return { status: "error", message: result?.error?.message || "Query failed" };
  }
  if (typeof result.count === "number") return { status: "ok", count: result.count };
  return { status: "ok", count: result.data?.length ?? 0 };
}

export function firstQueryError(results: Array<ClassifiedQuery<unknown>>): string | null {
  const messages = results.flatMap((item) => (item.kind === "error" ? [item.message] : []));
  return messages.length ? messages.join("; ") : null;
}
