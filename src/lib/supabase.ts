import { supabase as sb } from "@/integrations/supabase/client";

// Loosen types for legacy imports to prevent TS conflicts with evolving DB schema
export const supabase: any = sb;
export type { Database } from "@/integrations/supabase/types";
