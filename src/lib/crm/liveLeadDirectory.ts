import { supabase } from "@/integrations/supabase/client";
import { createSupabaseLeadDirectory, type SupabaseLeadClient } from "./createSupabaseLeadDirectory";

export const supabaseLeadDirectory = createSupabaseLeadDirectory(supabase as unknown as SupabaseLeadClient);
