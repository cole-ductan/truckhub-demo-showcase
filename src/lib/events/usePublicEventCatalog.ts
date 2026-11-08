import { useSearchParams } from "react-router-dom";
import { emptyPublicEventCatalog, syntheticPublicEventCatalog } from "./fixtures";
import type { PublicEventCatalog } from "./types";

export type CatalogLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; catalog: PublicEventCatalog };

export const CATALOG_ERROR_MESSAGE =
  "The synthetic demo catalog could not be loaded. Nothing was fetched from a live source.";

/**
 * Fixture catalog only. `?catalog=loading|error|empty` exercises UI states.
 * There is no network read and no live winter ingest.
 */
export function usePublicEventCatalog(): CatalogLoadState {
  const [params] = useSearchParams();
  const mode = params.get("catalog");
  if (mode === "loading") return { status: "loading" };
  if (mode === "error") return { status: "error", message: CATALOG_ERROR_MESSAGE };
  if (mode === "empty") return { status: "ready", catalog: emptyPublicEventCatalog() };
  return { status: "ready", catalog: syntheticPublicEventCatalog };
}
