import type { ReactNode } from "react";
import { LeadDirectoryContext } from "./leadDirectoryContextValue";
import type { LeadDirectory } from "./mockLeadDirectory";

export function LeadDirectoryProvider({ directory, children }: { directory: LeadDirectory; children: ReactNode }) {
  return <LeadDirectoryContext.Provider value={directory}>{children}</LeadDirectoryContext.Provider>;
}
