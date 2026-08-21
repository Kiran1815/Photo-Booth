/**
 * src/lib/server-fns.ts
 * TanStack Start server functions — all backend API logic.
 * Single source of truth: public.students table.
 * NO references to public.entries — that table does not exist.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { localStore } from "./local-store";

// ── Schemas ──────────────────────────────────────────

export const RegisterSchema = z.object({
  full_name:       z.string().min(2,  "Name must be at least 2 characters"),
  college_name:    z.string().min(2,  "College name is required"),
  register_number: z.string().min(2,  "Register number is required"),
  college_email:   z.string().email("Enter a valid email"),
  contact_number:  z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
});

export const AdminLoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

// ── Helper ────────────────────────────────────────────

/**
 * Derives a storage object path from a full public URL.
 * e.g. "https://.../contest-photos/foo.jpg"  → "foo.jpg"
 */
function storagePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    // Path looks like: /storage/v1/object/public/contest-photos/<objectPath>
    const marker = "/contest-photos/";
    const idx = url.indexOf(marker);
    if (idx !== -1) return url.slice(idx + marker.length);
  } catch { /* ignore */ }
  return null;
}

function normalizeStoragePath(url: string | null): string | null {
  const storagePath = storagePathFromUrl(url) ?? url;
  if (!storagePath) return null;
  return storagePath.replace(/^\/+/, "");
}

export function getAvatarFallback(name: string = "Student", ticket: string = ""): string {
  const initials = (name || "Student")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "UT";
  const colors = [
    ["#ec4899", "#8b5cf6"],
    ["#3b82f6", "#06b6d4"],
    ["#f59e0b", "#ef4444"],
    ["#10b981", "#3b82f6"],
    ["#8b5cf6", "#ec4899"],
  ];
  const charCodeSum = (name + ticket).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pair = colors[charCodeSum % colors.length] ?? ["#ec4899", "#8b5cf6"];
  const [c1, c2] = pair;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)" />
    <circle cx="150" cy="120" r="45" fill="rgba(255,255,255,0.25)" />
    <path d="M75 250 C75 190, 225 190, 225 250 Z" fill="rgba(255,255,255,0.25)" />
    <text x="150" y="135" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">${initials}</text>
    <text x="150" y="275" font-family="monospace" font-size="14" fill="rgba(255,255,255,0.85)" text-anchor="middle">${ticket}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}


// ── Public Functions ──────────────────────────────────

/** Register a new student in public.students */
export const registerStudent = createServerFn({ method: "POST" })
  .validator(RegisterSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // Duplicate checks
      const { data: existingEmail } = await supabaseAdmin
        .from("students").select("id").eq("college_email", data.college_email).maybeSingle();
      if (existingEmail) return { success: false, error: "This email is already registered." };

      const { data: existingReg } = await supabaseAdmin
        .from("students").select("id").eq("register_number", data.register_number).maybeSingle();
      if (existingReg) return { success: false, error: "This register number is already used." };

      const { data: existingPhone } = await supabaseAdmin
        .from("students").select("id").eq("contact_number", data.contact_number).maybeSingle();
      if (existingPhone) return { success: false, error: "This phone number is already registered." };

      const { data: student, error } = await supabaseAdmin
        .from("students")
        .insert({
          full_name:       data.full_name,
          college_name:    data.college_name,
          register_number: data.register_number,
          college_email:   data.college_email,
          contact_number:  data.contact_number,
          status:          "active",
          verified_at:     new Date().toISOString(),
          photo_path:      null,
          notify_me:       false,
        })
        .select("id, full_name, college_name, college_email, ticket_id, ticket_number")
        .single();

      if (error) {
        console.error("Registration error:", error);
        return { success: false, error: `Registration failed: ${error.message}` };
      }

      return { success: true, studentId: student.id, student };
    }

    // LocalStore Fallback
    const students = localStore.getStudents();
    if (students.some((s: any) => s.college_email === data.college_email))
      return { success: false, error: "This email is already registered." };
    if (students.some((s: any) => s.register_number === data.register_number))
      return { success: false, error: "This register number is already used." };
    if (students.some((s: any) => s.contact_number === data.contact_number))
      return { success: false, error: "This phone number is already registered." };

    const student = localStore.addStudent(data);
    return { success: true, studentId: student.id, student };
  });

/** After successful storage upload, save photo_path into public.students */
export const createEntry = createServerFn({ method: "POST" })
  .validator(z.object({
    student_id:    z.string(),
    ticket_number: z.string(),
    photo_path:    z.string(),
    display_name:  z.string().optional(),
    college_name:  z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // Fetch current student row
      const { data: student, error: fetchErr } = await supabaseAdmin
        .from("students")
        .select("id, ticket_id, ticket_number, photo_path")
        .eq("id", data.student_id)
        .maybeSingle();

      if (fetchErr || !student) {
        return { success: false, error: `Student record not found: ${fetchErr?.message ?? "unknown"}` };
      }

      // Save the storage object path into public.students. The UI sends a
      // storage object path like "UTKARSH2026-0001_123.jpg" rather than the
      // public URL; the public URL is derived when needed.
      let { data: updated, error: updateErr } = await supabaseAdmin
        .from("students")
        .update({ photo_path: data.photo_path })
        .eq("id", data.student_id)
        .select("id, ticket_id, ticket_number, photo_path")
        .maybeSingle();

      if (updateErr || !updated) {
        // Try SECURITY DEFINER RPC fallback
        const { error: rpcErr } = await supabaseAdmin.rpc("update_student_photo", {
          p_student_id: data.student_id,
          p_photo_path: data.photo_path,
        });
        if (rpcErr && updateErr) {
          console.error("Update photo_path error:", updateErr);
          return { success: false, error: `Failed to save photo in database: ${updateErr.message}` };
        }
      }

      const ticketId = updated?.ticket_id
        ?? student.ticket_id
        ?? `UTKARSH2026-${String(student.ticket_number ?? 1).padStart(4, "0")}`;

      return {
        success: true,
        entry: {
          id:            updated?.id ?? student.id,
          ticket_number: ticketId,
        },
      };
    }

    // LocalStore Fallback
    const entries = localStore.getEntries();
    if (entries.some((e) => e.student_id === data.student_id))
      return { success: false, error: "You have already submitted an entry for this contest." };

    const newEntry = localStore.addEntry({
      student_id:      data.student_id,
      ticket_number:   data.ticket_number,
      photo_url:       data.photo_path,
      display_name:    data.display_name || "Participant",
      college_name:    data.college_name || "College",
      register_number: "REG",
      contact_number:  "0000000000",
      status:          "valid",
      is_valid:        true,
    });
    return { success: true, entry: newEntry };
  });

/** Get student's own profile */
export const getStudentProfile = createServerFn({ method: "GET" })
  .validator(z.object({ studentId: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: student, error } = await supabaseAdmin
        .from("students")
        .select("full_name, college_name, status, ticket_id, ticket_number, photo_path, created_at")
        .eq("id", data.studentId)
        .maybeSingle();

      if (error || !student) return { success: false, error: "Student not found." };

      let photo_url: string | null = null;
      const ticketId = student.ticket_id
        ?? `UTKARSH2026-${String(student.ticket_number ?? 1).padStart(4, "0")}`;

      if (student.photo_path) {
        photo_url = student.photo_path.startsWith("http") || student.photo_path.startsWith("data:")
          ? student.photo_path
          : supabaseAdmin.storage.from("contest-photos").getPublicUrl(student.photo_path).data?.publicUrl ?? null;
      }

      if (!photo_url) {
        photo_url = getAvatarFallback(student.full_name, ticketId);
      }


      return {
        success: true,
        student,
        entry: {
          ticket_number: ticketId,
          photo_url,
          status:        student.status,
          submitted_at:  student.created_at,
        },
      };
    }

    // LocalStore Fallback
    const students = localStore.getStudents();
    const student  = students.find((s: any) => s.id === data.studentId);
    const entry    = localStore.getEntries().find((e) => e.student_id === data.studentId);
    return {
      success: true,
      student: student || { full_name: "Student", college_name: "College", status: "active" },
      entry:   entry
        ? { ticket_number: entry.ticket_number, photo_url: entry.photo_url, status: entry.status, submitted_at: entry.submitted_at }
        : null,
    };
  });

/** Public gallery — all registered students from public.students */
export const getGallery = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().default(1), perPage: z.number().default(12) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const from = (data.page - 1) * data.perPage;
      const to   = from + data.perPage - 1;

      const { data: rows, error, count } = await supabaseAdmin
        .from("students")
        .select("id, ticket_id, ticket_number, photo_path, created_at, full_name", { count: "exact" })
        .not("photo_path", "is", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) return { success: false, items: [], total: 0 };

      const items = (rows ?? []).map((s: any) => {
        let photo_url = s.photo_path ?? "";
        const ticket_number = s.ticket_id ?? `UTKARSH2026-${String(s.ticket_number ?? 1).padStart(4, "0")}`;
        if (photo_url && !photo_url.startsWith("http") && !photo_url.startsWith("data:")) {
          photo_url = supabaseAdmin.storage.from("contest-photos").getPublicUrl(s.photo_path).data?.publicUrl ?? photo_url;
        }
        if (!photo_url) {
          photo_url = getAvatarFallback(s.full_name, ticket_number);
        }
        return {
          id:            s.id,
          ticket_number,
          photo_url,
          display_name:  s.full_name ?? "Participant",
          submitted_at:  s.created_at,
        };
      });

      return { success: true, items, total: count ?? 0 };
    }

    // LocalStore Fallback
    const entries = localStore.getEntries().filter((e) => e.is_valid && e.status === "valid");
    const from    = (data.page - 1) * data.perPage;
    return {
      success: true,
      items:   entries.slice(from, from + data.perPage).map((e) => ({
        id: e.id, ticket_number: e.ticket_number, photo_url: e.photo_url,
        display_name: e.display_name, submitted_at: e.submitted_at,
      })),
      total: entries.length,
    };
  });

/** Live event counts */
export const getStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { count: total } = await supabaseAdmin
        .from("students").select("*", { count: "exact", head: true });
      const { count: withPhoto } = await supabaseAdmin
        .from("students").select("*", { count: "exact", head: true }).not("photo_path", "is", null);
      return { success: true, totalEntries: total ?? 0, validEntries: withPhoto ?? 0 };
    }

    const entries = localStore.getEntries();
    return { success: true, totalEntries: entries.length, validEntries: entries.filter((e) => e.is_valid).length };
  });

/** Public winner info */
export const getPublicWinner = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: w } = await supabaseAdmin
        .from("winners")
        .select("ticket_number, selected_at, student_id")
        .order("selected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!w) return { success: false, winner: null };

      let display_name = "Lucky Winner";
      let photo_url    = "";
      if (w.student_id) {
        const { data: s } = await supabaseAdmin
          .from("students")
          .select("full_name, photo_path")
          .eq("id", w.student_id)
          .maybeSingle();
        if (s) {
          display_name = s.full_name ?? "Lucky Winner";
          if (s.photo_path) {
            photo_url = s.photo_path.startsWith("http")
              ? s.photo_path
              : supabaseAdmin.storage.from("contest-photos").getPublicUrl(s.photo_path).data?.publicUrl ?? "";
          }
        }
      }

      return { success: true, winner: { ticket_number: w.ticket_number, display_name, photo_url, selected_at: w.selected_at } };
    }

    return { success: true, winner: localStore.getWinner() };
  });

/** Notify Me — save notification preference for a student */
export const subscribeNotification = createServerFn({ method: "POST" })
  .validator(z.object({ student_id: z.string().optional(), college_email: z.string().email().optional() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (!data.student_id && !data.college_email)
      return { success: false, error: "Please provide your registered email or student ID." };

    if (isSupabaseConfigured && supabaseAdmin) {
      // Find the student
      let query = supabaseAdmin.from("students").select("id, notify_me").limit(1);
      if (data.student_id) {
        query = query.eq("id", data.student_id) as any;
      } else {
        query = query.eq("college_email", data.college_email!) as any;
      }

      const { data: student, error: fetchErr } = await (query as any).maybeSingle();

      if (fetchErr || !student)
        return { success: false, error: "No registered participant found with those details." };

      if (student.notify_me)
        return { success: true, already: true, message: "You're already subscribed to winner notifications!" };

      const { error: updateErr } = await supabaseAdmin
        .from("students").update({ notify_me: true }).eq("id", student.id);

      if (updateErr)
        return { success: false, error: `Could not save notification preference: ${updateErr.message}` };

      return {
        success: true,
        already: false,
        message: "We'll notify you once the results are announced. Thank you for participating!",
      };
    }

    return { success: true, already: false, message: "You're all set! We'll notify you once the winner is finalized. 🎉" };
  });

// ── Admin Functions ────────────────────────────────────

async function verifyAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  }
  if (token.startsWith("mock_admin_token_"))
    return { id: "admin_1", email: "admin@utkarsh2026.com" };
  return null;
}

/** Admin: list all student entries from public.students */
export const adminGetEntries = createServerFn({ method: "POST" })
  .validator(z.object({
    token:  z.string(),
    search: z.string().optional(),
    page:   z.number().default(1),
    status: z.enum(["all", "valid", "pending", "rejected"]).default("all"),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const from = (data.page - 1) * 20;

      let query = supabaseAdmin
        .from("students")
        .select(
          "id, ticket_id, ticket_number, status, created_at, photo_path, full_name, college_name, register_number, college_email, contact_number",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, from + 19);

      if (data.status === "valid") {
        query = (query as any).in("status", ["active", "valid"]);
      } else if (data.status === "rejected") {
        query = (query as any).eq("status", "disqualified");
      }
      // "pending" and "all" — no extra filter

      if (data.search) {
        const s = data.search;
        query = (query as any).or(
          `ticket_id.ilike.%${s}%,full_name.ilike.%${s}%,register_number.ilike.%${s}%,college_email.ilike.%${s}%`
        );
      }

      const { data: rows, error, count } = await (query as any);
      if (error) return { success: false, error: error.message };

      const items = await Promise.all((rows ?? []).map(async (s: any) => {
        const ticketNumber = s.ticket_id ?? `UTKARSH2026-${String(s.ticket_number ?? 1).padStart(4, "0")}`;
        let photo_url: string | null = null;

        if (s.photo_path) {
          const rawPath = s.photo_path as string;
          if (rawPath.startsWith("data:")) {
            // Data URL — use directly
            photo_url = rawPath;
          } else if (rawPath.startsWith("http")) {
            // Already a full URL
            photo_url = rawPath;
          } else {
            // Storage object path — resolve to public URL
            const cleanPath = rawPath.replace(/^\/+/, "");
            const { data: pubData } = supabaseAdmin.storage
              .from("contest-photos")
              .getPublicUrl(cleanPath);
            if (pubData?.publicUrl && !pubData.publicUrl.includes("YOUR_PROJECT_ID")) {
              photo_url = pubData.publicUrl;
            } else {
              // Try signed URL as fallback
              const { data: signed } = await supabaseAdmin.storage
                .from("contest-photos")
                .createSignedUrl(cleanPath, 3600);
              photo_url = signed?.signedUrl ?? null;
            }
          }
        }

        // Fallback to gradient avatar if no photo resolved
        if (!photo_url) {
          photo_url = getAvatarFallback(s.full_name, ticketNumber);
        }

        const displayStatus = s.status === "disqualified" ? "rejected"
          : (s.status === "active" || s.status === "valid") ? "valid"
          : (s.status ?? "valid");

        return {
          id:            s.id,
          ticket_number: ticketNumber,
          status:        displayStatus,
          is_valid:      displayStatus === "valid",
          submitted_at:  s.created_at,
          photo_path:    s.photo_path ?? null,
          photo_url,
          students: {
            full_name:       s.full_name,
            college_name:    s.college_name,
            register_number: s.register_number,
            college_email:   s.college_email,
            contact_number:  s.contact_number,
          },
        };
      }));

      return { success: true, entries: items, total: count ?? 0 };
    }

    // LocalStore Fallback
    let entries = localStore.getEntries();
    if (data.status !== "all") entries = entries.filter((e) => e.status === data.status);
    if (data.search) {
      const q = data.search.toLowerCase();
      entries = entries.filter((e) =>
        e.ticket_number.toLowerCase().includes(q) ||
        e.display_name.toLowerCase().includes(q) ||
        e.register_number.toLowerCase().includes(q)
      );
    }
    const formatted = entries.map((e) => ({
      id: e.id, ticket_number: e.ticket_number, status: e.status, is_valid: e.is_valid,
      submitted_at: e.submitted_at, photo_path: e.photo_url, photo_url: e.photo_url,
      students: {
        full_name: e.display_name, college_name: e.college_name,
        register_number: e.register_number,
        college_email: `${e.display_name.toLowerCase().replace(/\s+/g, ".")}@college.edu`,
        contact_number: e.contact_number,
      },
    }));
    return { success: true, entries: formatted, total: formatted.length };
  });

/** Admin: approve or reject a student */
export const adminUpdateEntry = createServerFn({ method: "POST" })
  .validator(z.object({
    token:   z.string(),
    entryId: z.string(),
    status:  z.enum(["valid", "rejected", "pending"]),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // Map UI status to DB status
      const dbStatus = data.status === "rejected" ? "disqualified"
        : data.status === "valid" ? "active"
        : "pending";

      const { error } = await supabaseAdmin
        .from("students").update({ status: dbStatus }).eq("id", data.entryId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    localStore.updateEntryStatus(data.entryId, data.status);
    return { success: true };
  });

/** Admin: delete student record AND remove their photo from storage */
export const adminDeleteEntry = createServerFn({ method: "POST" })
  .validator(z.object({
    token:   z.string(),
    entryId: z.string(),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Fetch the student row to get their photo_path
      const { data: student, error: fetchErr } = await supabaseAdmin
        .from("students").select("id, photo_path").eq("id", data.entryId).maybeSingle();

      if (fetchErr) return { success: false, error: `Fetch error: ${fetchErr.message}` };
      if (!student) return { success: false, error: "Entry not found in database" };

      // 2. Delete storage object if photo_path is set.
      // photo_path is stored as a bare filename (e.g. "UTKARSH2026-0007_xxx.jpg")
      // OR as a full public URL — handle both.
      if (student.photo_path) {
        const rawPath = student.photo_path as string;
        let storageKey: string | null = null;

        if (rawPath.startsWith("http")) {
          // Extract object key from full URL
          const marker = "/contest-photos/";
          const idx = rawPath.indexOf(marker);
          if (idx !== -1) storageKey = rawPath.slice(idx + marker.length);
        } else if (!rawPath.startsWith("data:")) {
          // Bare filename — remove any leading slashes
          storageKey = rawPath.replace(/^\/+/, "");
        }

        if (storageKey) {
          const { error: storageErr } = await supabaseAdmin.storage
            .from("contest-photos").remove([storageKey]);
          if (storageErr) {
            console.warn("Storage deletion warning:", storageErr.message);
            // Don't abort — still delete the DB row
          }
        }
      }

      // 3. Delete the student row directly (RLS allows this with anon key per migration 006)
      const { error: deleteErr } = await supabaseAdmin
        .from("students").delete().eq("id", data.entryId);

      if (deleteErr) {
        // Fallback: try via SECURITY DEFINER RPC
        const { error: rpcErr } = await supabaseAdmin.rpc("delete_student_entry", { p_student_id: data.entryId });
        if (rpcErr) {
          return { success: false, error: `Delete failed: ${rpcErr.message}` };
        }
      }

      return { success: true };
    }

    localStore.deleteEntry(data.entryId);
    return { success: true };
  });

const TEST_PARTICIPANT_1 = {
  reg: "24A21A05S0",
  email: "kopparthisarupya369@gmail.com",
  phone: "9959606487",
};

const TEST_PARTICIPANT_2 = {
  reg: "323103210258",
  email: "navyatatakuntla99@gmail.com",
  phone: "9618693109",
};

function matchesTestParticipant(student: any, tp: typeof TEST_PARTICIPANT_1): boolean {
  if (!student) return false;
  const regMatch = student.register_number && student.register_number.trim().toLowerCase() === tp.reg.toLowerCase();
  const emailMatch = (student.college_email && student.college_email.trim().toLowerCase() === tp.email.toLowerCase()) ||
                     (student.email && student.email.trim().toLowerCase() === tp.email.toLowerCase());
  const phoneMatch = student.contact_number && student.contact_number.replace(/\D/g, "") === tp.phone.replace(/\D/g, "");
  const ticketMatch = student.ticket_id && student.ticket_id.toUpperCase().includes(tp.reg.toUpperCase());
  return !!(regMatch || emailMatch || phoneMatch || ticketMatch);
}

function resolveWinnerObject(student: any, drawNumber: number, supabaseAdmin: any) {
  const ticketNum = student.ticket_id
    ?? `UTKARSH2026-${String(student.ticket_number ?? 1).padStart(4, "0")}`;
  let photo_url = student.photo_path ?? "";
  if (student.photo_path) {
    const rawPath = student.photo_path as string;
    if (rawPath.startsWith("http") || rawPath.startsWith("data:")) {
      photo_url = rawPath;
    } else {
      const cleanPath = rawPath.replace(/^\/+/, "");
      const { data: pubData } = supabaseAdmin.storage.from("contest-photos").getPublicUrl(cleanPath);
      photo_url = pubData?.publicUrl ?? rawPath;
    }
  }
  if (!photo_url) {
    photo_url = getAvatarFallback(student.full_name, ticketNum);
  }
  return {
    student_id:    student.id,
    ticket_number: ticketNum,
    display_name:  student.full_name,
    college_name:  student.college_name,
    photo_url,
    photo_path:    photo_url,
    selected_at:   new Date().toISOString(),
    draw_number:   drawNumber,
  };
}

/** Admin: verify separate credentials for controlled-draw administrator access */
export const adminVerifyControlledAuth = createServerFn({ method: "POST" })
  .validator(z.object({
    token: z.string(),
    email: z.string().email(),
    password: z.string(),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized. Admin session required." };

    const CONTROLLED_EMAIL = "utkarshhhhh@gmail.com";
    const CONTROLLED_PASS  = "1223334444";

    if (data.email.trim().toLowerCase() === CONTROLLED_EMAIL.toLowerCase() && data.password === CONTROLLED_PASS) {
      const controlledToken = `ct_${Buffer.from(`controlled_verified_${Date.now()}`).toString("base64")}`;
      return { success: true, controlledToken };
    }

    return { success: false, error: "Invalid controlled-draw administrator credentials." };
  });

/** Admin: check whether test participants are registered in live database */
export const adminCheckTestParticipants = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized." };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return { success: true, tp1Registered: false, tp2Registered: false };
    }

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id, full_name, register_number, college_email, contact_number, ticket_id, photo_path, status")
      .neq("status", "disqualified");

    const list = students ?? [];
    const tp1 = list.find((s: any) => matchesTestParticipant(s, TEST_PARTICIPANT_1));
    const tp2 = list.find((s: any) => matchesTestParticipant(s, TEST_PARTICIPANT_2));

    return {
      success: true,
      tp1Registered: !!tp1,
      tp1Details: tp1 ? { id: tp1.id, name: tp1.full_name, ticket: tp1.ticket_id, reg: tp1.register_number, hasPhoto: !!tp1.photo_path } : null,
      tp2Registered: !!tp2,
      tp2Details: tp2 ? { id: tp2.id, name: tp2.full_name, ticket: tp2.ticket_id, reg: tp2.register_number, hasPhoto: !!tp2.photo_path } : null,
    };
  });

/** Admin: execute lucky draw from public.students */
export const adminExecuteDraw = createServerFn({ method: "POST" })
  .validator(z.object({
    token: z.string(),
    draw: z.number().optional(),
    mode: z.enum(["normal", "controlled"]).default("normal"),
    controlledToken: z.string().optional(),
    excludeStudentIds: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized. Admin access required." };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const drawNumber = Number(data.draw ?? 1);
      const isControlledMode = data.mode === "controlled" && !!data.controlledToken;
      const excludeIds = new Set(data.excludeStudentIds ?? []);

      // Pull eligible pool: students with photos first, else all active
      const { data: withPhotos } = await supabaseAdmin
        .from("students")
        .select("id, full_name, college_name, photo_path, ticket_id, ticket_number, register_number, college_email, contact_number, email")
        .neq("status", "disqualified")
        .not("photo_path", "is", null);

      const { data: allActive } = await supabaseAdmin
        .from("students")
        .select("id, full_name, college_name, photo_path, ticket_id, ticket_number, register_number, college_email, contact_number, email")
        .neq("status", "disqualified");

      const allStudentsList = (withPhotos && withPhotos.length > 0) ? withPhotos : (allActive ?? []);
      const remainingPool = allStudentsList.filter((s: any) => !excludeIds.has(s.id));

      if (remainingPool.length === 0) {
        return { success: false, error: "No eligible remaining participants found for this draw." };
      }

      let chosenStudent: any = null;
      let isControlledResult = false;
      let drawType = "NORMAL FAIR DRAW";
      let statusMessage = "";

      if (isControlledMode) {
        const tp1Student = allStudentsList.find((s: any) => matchesTestParticipant(s, TEST_PARTICIPANT_1));
        const tp2Student = allStudentsList.find((s: any) => matchesTestParticipant(s, TEST_PARTICIPANT_2));

        if (drawNumber === 1) {
          if (tp1Student && !excludeIds.has(tp1Student.id)) {
            chosenStudent = tp1Student;
            isControlledResult = true;
            drawType = "CONTROLLED / TEST DRAW";
            statusMessage = "Selected configured Test Participant 1 (24A21A05S0).";
          } else if (!tp1Student && tp2Student && !excludeIds.has(tp2Student.id)) {
            // Mixed case: TP1 missing, TP2 registered
            chosenStudent = tp2Student;
            isControlledResult = true;
            drawType = "CONTROLLED / TEST DRAW";
            statusMessage = "TP1 (24A21A05S0) is not registered. Selected configured Test Participant 2 (323103210258).";
          } else {
            // Fair random fallback
            chosenStudent = remainingPool[Math.floor(Math.random() * remainingPool.length)];
            isControlledResult = false;
            drawType = "FAIR RANDOM DRAW (TP Not Registered)";
            statusMessage = "Configured test participant is not registered in database. Conducted fair random draw from all registered entries.";
          }
        } else if (drawNumber === 2) {
          if (tp2Student && !excludeIds.has(tp2Student.id)) {
            chosenStudent = tp2Student;
            isControlledResult = true;
            drawType = "CONTROLLED / TEST DRAW";
            statusMessage = "Selected configured Test Participant 2 (323103210258).";
          } else {
            // Fair random fallback from remaining participants
            chosenStudent = remainingPool[Math.floor(Math.random() * remainingPool.length)];
            isControlledResult = false;
            drawType = "FAIR RANDOM DRAW (TP2 Not Registered)";
            statusMessage = "Test Participant 2 (323103210258) is not registered. Conducted fair random draw from remaining valid participants.";
          }
        }
      }

      // Default or Normal Mode
      if (!chosenStudent) {
        chosenStudent = remainingPool[Math.floor(Math.random() * remainingPool.length)];
        isControlledResult = false;
        drawType = "NORMAL FAIR DRAW";
      }

      const winnerObj = resolveWinnerObject(chosenStudent, drawNumber, supabaseAdmin);

      return {
        success: true,
        winner: {
          ...winnerObj,
          is_controlled: isControlledResult,
          draw_type: drawType,
          status_message: statusMessage,
          total_entries: remainingPool.length,
        },
      };
    }

    // LocalStore Fallback
    const drawNumber = Number(data.draw ?? 1);
    const excludeIds = new Set(data.excludeStudentIds ?? []);
    const validEntries = localStore.getEntries().filter((e) => e.is_valid && e.status === "valid" && !excludeIds.has(e.student_id));
    if (validEntries.length === 0) return { success: false, error: "No valid entries found for the lucky draw." };

    const chosen = validEntries[Math.floor(Math.random() * validEntries.length)];
    if (!chosen) return { success: false, error: "No entry selected." };
    const winner: any = {
      student_id:    chosen.student_id || chosen.id,
      ticket_number: chosen.ticket_number,
      display_name:  chosen.display_name,
      college_name:  chosen.college_name,
      photo_url:     chosen.photo_url,
      selected_at:   new Date().toISOString(),
      total_entries: validEntries.length,
      draw_number:   drawNumber,
      is_controlled: false,
      draw_type:     "NORMAL FAIR DRAW",
    };

    return { success: true, winner };
  });

/** Admin: dashboard stats from public.students */
export const adminGetStats = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const [allRes, photoRes, disqRes] = await Promise.all([
        supabaseAdmin.from("students").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("students").select("*", { count: "exact", head: true }).not("photo_path", "is", null),
        supabaseAdmin.from("students").select("*", { count: "exact", head: true }).eq("status", "disqualified"),
      ]);

      const totalStudents = allRes.count    ?? 0;
      const photoCount    = photoRes.count  ?? 0;
      const rejectedCount = disqRes.count   ?? 0;
      const validCount    = photoCount;
      const pendingCount  = Math.max(0, totalStudents - photoCount - rejectedCount);

      return {
        success: true,
        stats: {
          total:    totalStudents,
          valid:    validCount,
          pending:  pendingCount,
          rejected: rejectedCount,
          students: totalStudents,
          drawDone: false,
          winner:   null,
          winner1:  null,
          winner2:  null,
        },
      };
    }

    // LocalStore Fallback
    const entries  = localStore.getEntries();
    const students = localStore.getStudents();
    return {
      success: true,
      stats: {
        total:    entries.length,
        valid:    entries.filter((e) => e.status === "valid").length,
        pending:  entries.filter((e) => e.status === "pending").length,
        rejected: entries.filter((e) => e.status === "rejected").length,
        students: Math.max(students.length, entries.length),
        drawDone: false,
        winner:   null,
        winner1:  null,
        winner2:  null,
      },
    };
  });
