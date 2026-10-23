import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";
import { sanitizeSupabaseUrl } from "./client";

export function createClient() {
  const cookieStore = cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseUrl =
    sanitizeSupabaseUrl(rawUrl) || "https://placeholder-taskmaster.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "placeholder-anon-key";

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}
