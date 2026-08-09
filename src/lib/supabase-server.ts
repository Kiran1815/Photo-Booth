/**
 * src/lib/supabase-server.ts
 * Server-only Supabase client — uses SERVICE ROLE KEY.
 * !! NEVER import this in any client/browser component !!
 * Only import in TanStack Start server functions (createServerFn).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
if (rawUrl.endsWith("/")) rawUrl = rawUrl.slice(0, -1);
if (rawUrl.endsWith("/rest/v1")) rawUrl = rawUrl.slice(0, -8);
const supabaseUrl = rawUrl;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

const isServerConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseKey) &&
  !supabaseUrl?.includes("YOUR_PROJECT_ID") &&
  !supabaseKey?.includes("YOUR_ANON_KEY");

export const isSupabaseConfigured = isServerConfigured;

let client: any = null;

if (isServerConfigured && supabaseUrl && supabaseKey) {
  try {
    client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase server client:", err);
  }
}

/** Admin client — bypasses RLS. Safe fallback if unconfigured. */
export const supabaseAdmin = client;
