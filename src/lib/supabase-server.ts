/**
 * src/lib/supabase-server.ts
 * Server-only Supabase client — uses SERVICE ROLE KEY.
 * !! NEVER import this in any client/browser component !!
 * Only import in TanStack Start server functions (createServerFn).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isServerConfigured =
  Boolean(supabaseUrl) &&
  Boolean(serviceRoleKey) &&
  !supabaseUrl?.includes("YOUR_PROJECT_ID") &&
  !serviceRoleKey?.includes("YOUR_SERVICE_ROLE_KEY");

export const isSupabaseConfigured = isServerConfigured;

let client: any = null;

if (isServerConfigured && supabaseUrl && serviceRoleKey) {
  try {
    client = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase server client:", err);
  }
}

/** Admin client — bypasses RLS. Safe fallback if unconfigured. */
export const supabaseAdmin = client;
