import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return "";
  let cleaned = url.trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");
  // Strip /rest/v1 or /rest/v1/ if user accidentally pasted the REST endpoint URL
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, "");
  return cleaned;
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseUrl = sanitizeSupabaseUrl(rawUrl);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  !supabaseUrl.includes("placeholder")
);

// Fallback dummy credentials during initial build/typecheck if env is unset
const defaultUrl = supabaseUrl || "https://placeholder-taskmaster.supabase.co";
const defaultKey = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createSupabaseClient<Database>(defaultUrl, defaultKey);

export function getBrowserClient() {
  return supabase;
}
