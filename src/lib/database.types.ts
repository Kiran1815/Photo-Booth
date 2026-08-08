/**
 * src/lib/database.types.ts
 * TypeScript types mirroring the Supabase database schema.
 * Generated manually to match 001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          full_name: string;
          college_name: string;
          register_number: string;
          college_email: string;
          contact_number: string;
          created_at: string;
          verified_at: string | null;
          status: "pending" | "active" | "disqualified";
        };
        Insert: {
          id?: string;
          full_name: string;
          college_name: string;
          register_number: string;
          college_email: string;
          contact_number: string;
          created_at?: string;
          verified_at?: string | null;
          status?: "pending" | "active" | "disqualified";
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
      };
      entries: {
        Row: {
          id: string;
          student_id: string;
          ticket_number: string;
          photo_path: string;
          thumbnail_path: string | null;
          submitted_at: string;
          status: "pending" | "valid" | "rejected";
          is_valid: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          ticket_number: string;
          photo_path: string;
          thumbnail_path?: string | null;
          submitted_at?: string;
          status?: "pending" | "valid" | "rejected";
          is_valid?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["entries"]["Insert"]>;
      };
      winners: {
        Row: {
          id: string;
          entry_id: string;
          ticket_number: string;
          draw_id: string | null;
          selected_at: string;
        };
        Insert: {
          id?: string;
          entry_id: string;
          ticket_number: string;
          draw_id?: string | null;
          selected_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["winners"]["Insert"]>;
      };
      draws: {
        Row: {
          id: string;
          executed_by: string | null;
          executed_at: string;
          total_entries: number;
          winner_entry_id: string | null;
          status: "completed" | "cancelled";
        };
        Insert: {
          id?: string;
          executed_by?: string | null;
          executed_at?: string;
          total_entries?: number;
          winner_entry_id?: string | null;
          status?: "completed" | "cancelled";
        };
        Update: Partial<Database["public"]["Tables"]["draws"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
      };
    };
    Functions: {
      generate_ticket_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      execute_lucky_draw: {
        Args: { p_admin_id: string };
        Returns: Json;
      };
    };
  };
}

// ── Convenience types ─────────────────────────────────
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Entry   = Database["public"]["Tables"]["entries"]["Row"];
export type Winner  = Database["public"]["Tables"]["winners"]["Row"];
export type Draw    = Database["public"]["Tables"]["draws"]["Row"];

/** Public-safe entry info shown in gallery (no PII) */
export interface PublicEntry {
  id: string;
  ticket_number: string;
  photo_url: string;
  display_name: string;
  submitted_at: string;
}

/** Public winner info (no PII) */
export interface PublicWinner {
  ticket_number: string;
  display_name: string;
  college_name: string;
  photo_url: string;
  selected_at: string;
  total_entries: number;
}

/** Student's own profile view */
export interface StudentProfile {
  student: {
    full_name: string;
    college_name: string;
    status: string;
  };
  entry: {
    ticket_number: string;
    photo_url: string;
    status: string;
    submitted_at: string;
  } | null;
}
