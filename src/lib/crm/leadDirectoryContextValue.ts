import { createContext } from "react";
import type { LeadDirectory } from "./mockLeadDirectory";
import { supabaseLeadDirectory } from "./liveLeadDirectory";

export const LeadDirectoryContext = createContext<LeadDirectory>(supabaseLeadDirectory);
