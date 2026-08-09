/**
 * src/lib/supabase.ts
 * Browser-safe Supabase client.
 * If Supabase environment variables are set, creates real Supabase client.
 * Otherwise, provides a graceful fallback client using localStore so app never crashes.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { localStore } from "./local-store";

let rawUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || "") as string;
if (rawUrl.endsWith("/")) rawUrl = rawUrl.slice(0, -1);
if (rawUrl.endsWith("/rest/v1")) rawUrl = rawUrl.slice(0, -8);
const supabaseUrl = rawUrl;

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  "") as string;

const isConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("YOUR_PROJECT_ID") &&
  !supabaseAnonKey.includes("YOUR_ANON_KEY");

let realClient: any = null;

if (isConfigured) {
  try {
    realClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn("Failed to initialize Supabase client, falling back to local mode:", err);
  }
}

// Fallback client structure matching Supabase interface
const mockClient = {
  auth: {
    async getSession() {
      const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("utkarsh_admin_session") : null;
      if (sessionRaw) {
        return { data: { session: JSON.parse(sessionRaw) }, error: null };
      }
      return { data: { session: null }, error: null };
    },
    async signInWithPassword({ email, password }: any) {
      if (
        email.trim() === "photobooth2k26@gmail.com" &&
        password === "utkarsh2026pbc"
      ) {
        const session = {
          access_token: "mock_admin_token_" + Date.now(),
          user: { id: "admin_1", email: "photobooth2k26@gmail.com", role: "admin" },
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("utkarsh_admin_session", JSON.stringify(session));
        }
        return { data: { session, user: session.user }, error: null };
      }
      return { data: { session: null }, error: new Error("Invalid admin credentials. Access denied.") };
    },
    async signOut() {
      if (typeof window !== "undefined") {
        localStorage.removeItem("utkarsh_admin_session");
      }
      return { error: null };
    },
    async getUser() {
      const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("utkarsh_admin_session") : null;
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        return { data: { user: session.user }, error: null };
      }
      return { data: { user: null }, error: new Error("Not authenticated") };
    },
  },
  async rpc(fnName: string) {
    if (fnName === "generate_ticket_number") {
      return { data: localStore.getNextTicketNumber(), error: null };
    }
    return { data: null, error: null };
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: path } };
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: path }, error: null };
        },
        async remove(paths: string[]) {
          return { data: paths, error: null };
        },
      };
    },
  },
};

export const supabase = isConfigured && realClient ? realClient : (mockClient as any);
