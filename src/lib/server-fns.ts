/**
 * src/lib/server-fns.ts
 * TanStack Start server functions — all backend API logic.
 * Supports Supabase when configured, with localStore fallback for instant offline testing.
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

// ── Server Functions ──────────────────────────────────

/** Register a new student (no photo yet) */
export const registerStudent = createServerFn({ method: "POST" })
  .validator(RegisterSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Check for duplicates in Supabase
      const { data: existingEmail } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("college_email", data.college_email)
        .maybeSingle();

      if (existingEmail) {
        return { success: false, error: "This email is already registered." };
      }

      const { data: existingReg } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("register_number", data.register_number)
        .maybeSingle();

      if (existingReg) {
        return { success: false, error: "This register number is already used." };
      }

      const { data: existingPhone } = await supabaseAdmin
        .from("students")
        .select("id")
        .eq("contact_number", data.contact_number)
        .maybeSingle();

      if (existingPhone) {
        return { success: false, error: "This phone number is already registered." };
      }

      // 2. Insert student in Supabase
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
        })
        .select("id, full_name, college_name, college_email")
        .single();

      if (error) {
        console.error("Registration error:", error);
        return { success: false, error: "Registration failed. Please try again." };
      }

      return { success: true, studentId: student.id, student };
    }

    // ── LocalStore Fallback ──
    const students = localStore.getStudents();
    if (students.some((s: any) => s.college_email === data.college_email)) {
      return { success: false, error: "This email is already registered." };
    }
    if (students.some((s: any) => s.register_number === data.register_number)) {
      return { success: false, error: "This register number is already used." };
    }
    if (students.some((s: any) => s.contact_number === data.contact_number)) {
      return { success: false, error: "This phone number is already registered." };
    }

    const student = localStore.addStudent(data);
    return { success: true, studentId: student.id, student };
  });

/** Create entry for a registered student after photo upload */
export const createEntry = createServerFn({ method: "POST" })
  .validator(z.object({
    student_id: z.string(),
    ticket_number: z.string(),
    photo_path: z.string(),
    display_name: z.string().optional(),
    college_name: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("entries")
        .select("id")
        .eq("student_id", data.student_id)
        .maybeSingle();

      if (existing) {
        return { success: false, error: "You have already submitted an entry for this contest." };
      }

      const { data: entry, error } = await supabaseAdmin
        .from("entries")
        .insert({
          student_id:    data.student_id,
          ticket_number: data.ticket_number,
          photo_path:    data.photo_path,
          status:        "valid",
          is_valid:      true,
        })
        .select("id, ticket_number")
        .single();

      if (error) {
        console.error("Create entry error:", error);
        return { success: false, error: "Failed to save entry. Please try again." };
      }

      return { success: true, entry };
    }

    // ── LocalStore Fallback ──
    const entries = localStore.getEntries();
    if (entries.some((e) => e.student_id === data.student_id)) {
      return { success: false, error: "You have already submitted an entry for this contest." };
    }

    const newEntry = localStore.addEntry({
      student_id: data.student_id,
      ticket_number: data.ticket_number,
      photo_url: data.photo_path,
      display_name: data.display_name || "Participant",
      college_name: data.college_name || "College",
      register_number: "REG",
      contact_number: "0000000000",
      status: "valid",
      is_valid: true,
    });

    return { success: true, entry: newEntry };
  });

/** Get student's own profile + entry */
export const getStudentProfile = createServerFn({ method: "GET" })
  .validator(z.object({ studentId: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: student } = await supabaseAdmin
        .from("students")
        .select("full_name, college_name, status")
        .eq("id", data.studentId)
        .single();

      if (!student) return { success: false, error: "Student not found." };

      const { data: entry } = await supabaseAdmin
        .from("entries")
        .select("ticket_number, photo_path, status, submitted_at")
        .eq("student_id", data.studentId)
        .maybeSingle();

      let photo_url: string | null = null;
      if (entry?.photo_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("contest-photos")
          .createSignedUrl(entry.photo_path, 3600);
        photo_url = signed?.signedUrl ?? null;
      }

      return {
        success: true,
        student,
        entry: entry ? { ...entry, photo_url } : null,
      };
    }

    // LocalStore Fallback
    const students = localStore.getStudents();
    const student = students.find((s: any) => s.id === data.studentId);
    const entry = localStore.getEntries().find((e) => e.student_id === data.studentId);
    return {
      success: true,
      student: student || { full_name: "Student", college_name: "College", status: "active" },
      entry: entry ? { ticket_number: entry.ticket_number, photo_url: entry.photo_url, status: entry.status, submitted_at: entry.submitted_at } : null,
    };
  });

/** Get paginated public gallery */
export const getGallery = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().default(1), perPage: z.number().default(12) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const from = (data.page - 1) * data.perPage;
      const to   = from + data.perPage - 1;

      const { data: entries, error, count } = await supabaseAdmin
        .from("entries")
        .select(`
          id,
          ticket_number,
          photo_path,
          submitted_at,
          students!inner(full_name)
        `, { count: "exact" })
        .eq("is_valid", true)
        .eq("status",   "valid")
        .order("submitted_at", { ascending: false })
        .range(from, to);

      if (error) return { success: false, items: [], total: 0 };

      const items = await Promise.all(
        (entries ?? []).map(async (e) => {
          const { data: signed } = await supabaseAdmin.storage
            .from("contest-photos")
            .createSignedUrl(e.photo_path, 3600);
          return {
            id:             e.id,
            ticket_number:  e.ticket_number,
            photo_url:      signed?.signedUrl ?? "",
            display_name:   (e.students as any)?.full_name ?? "Participant",
            submitted_at:   e.submitted_at,
          };
        })
      );

      return { success: true, items, total: count ?? 0 };
    }

    // LocalStore Fallback
    const entries = localStore.getEntries().filter((e) => e.is_valid && e.status === "valid");
    const from = (data.page - 1) * data.perPage;
    const items = entries.slice(from, from + data.perPage).map((e) => ({
      id: e.id,
      ticket_number: e.ticket_number,
      photo_url: e.photo_url,
      display_name: e.display_name,
      submitted_at: e.submitted_at,
    }));
    return { success: true, items, total: entries.length };
  });

/** Get live event stats */
export const getStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { count: total } = await supabaseAdmin
        .from("entries").select("*", { count: "exact", head: true });

      const { count: valid } = await supabaseAdmin
        .from("entries").select("*", { count: "exact", head: true })
        .eq("is_valid", true).eq("status", "valid");

      return {
        success: true,
        totalEntries: total ?? 0,
        validEntries: valid ?? 0,
      };
    }

    // LocalStore Fallback
    const entries = localStore.getEntries();
    const valid = entries.filter((e) => e.is_valid && e.status === "valid");
    return {
      success: true,
      totalEntries: entries.length,
      validEntries: valid.length,
    };
  });

/** Get public winner (sanitized, no PII) */
export const getPublicWinner = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: winner } = await supabaseAdmin
        .from("winners")
        .select(`
          ticket_number,
          selected_at,
          entries!inner(photo_path, students!inner(full_name, college_name))
        `)
        .order("selected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!winner) return { success: false, winner: null };

      const entry   = (winner as any).entries;
      const student = entry?.students;

      const { data: signed } = await supabaseAdmin.storage
        .from("contest-photos")
        .createSignedUrl(entry?.photo_path ?? "", 86400);

      return {
        success: true,
        winner: {
          ticket_number: winner.ticket_number,
          display_name:  student?.full_name   ?? "Winner",
          college_name:  student?.college_name ?? "",
          photo_url:     signed?.signedUrl ?? "",
          selected_at:   winner.selected_at,
        },
      };
    }

    // LocalStore Fallback
    const winner = localStore.getWinner();
    return { success: true, winner };
  });

// ── Admin Functions ────────────────────────────────────

/** Verify admin JWT token server-side */
async function verifyAdmin(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  }
  // Mock token check
  if (token.startsWith("mock_admin_token_")) {
    return { id: "admin_1", email: "admin@utkarsh2026.com" };
  }
  return null;
}

/** Admin: get all entries with search */
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
        .from("entries")
        .select(`
          id, ticket_number, status, is_valid, submitted_at, photo_path,
          students!inner(full_name, college_name, register_number, college_email, contact_number)
        `, { count: "exact" })
        .order("submitted_at", { ascending: false })
        .range(from, from + 19);

      if (data.status !== "all") {
        query = query.eq("status", data.status);
      }
      if (data.search) {
        query = query.or(
          `ticket_number.ilike.%${data.search}%,students.full_name.ilike.%${data.search}%,students.register_number.ilike.%${data.search}%`
        );
      }

      const { data: entries, error, count } = await query;
      if (error) return { success: false, error: error.message };

      const items = await Promise.all(
        (entries ?? []).map(async (e: any) => {
          let photo_url = e.photo_path;
          if (e.photo_path && !e.photo_path.startsWith("data:") && !e.photo_path.startsWith("http")) {
            const { data: pubData } = supabaseAdmin.storage
              .from("contest-photos")
              .getPublicUrl(e.photo_path);
            photo_url = pubData?.publicUrl || e.photo_path;
          }
          return {
            ...e,
            photo_url,
          };
        })
      );

      return { success: true, entries: items, total: count ?? 0 };
    }

    // LocalStore Fallback
    let entries = localStore.getEntries();
    if (data.status !== "all") {
      entries = entries.filter((e) => e.status === data.status);
    }
    if (data.search) {
      const q = data.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.ticket_number.toLowerCase().includes(q) ||
          e.display_name.toLowerCase().includes(q) ||
          e.register_number.toLowerCase().includes(q)
      );
    }

    const formatted = entries.map((e) => ({
      id: e.id,
      ticket_number: e.ticket_number,
      status: e.status,
      is_valid: e.is_valid,
      submitted_at: e.submitted_at,
      photo_path: e.photo_url,
      students: {
        full_name: e.display_name,
        college_name: e.college_name,
        register_number: e.register_number,
        college_email: `${e.display_name.toLowerCase().replace(/\s+/g, ".")}@college.edu`,
        contact_number: e.contact_number,
      },
    }));

    return { success: true, entries: formatted, total: formatted.length };
  });

/** Admin: approve or reject an entry */
export const adminUpdateEntry = createServerFn({ method: "POST" })
  .validator(z.object({
    token:    z.string(),
    entryId:  z.string(),
    status:   z.enum(["valid", "rejected", "pending"]),
  }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("entries")
        .update({
          status:   data.status,
          is_valid: data.status === "valid",
        })
        .eq("id", data.entryId);

      if (error) return { success: false, error: error.message };

      await supabaseAdmin.from("audit_logs").insert({
        admin_id: admin.id,
        action:   `ENTRY_STATUS_CHANGED_TO_${data.status.toUpperCase()}`,
        metadata: { entry_id: data.entryId },
      });

      return { success: true };
    }

    // LocalStore Fallback
    localStore.updateEntryStatus(data.entryId, data.status);
    return { success: true };
  });

/** Admin: delete entry permanently */
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
      const { error } = await supabaseAdmin
        .from("entries")
        .delete()
        .eq("id", data.entryId);

      if (error) return { success: false, error: error.message };

      await supabaseAdmin.from("audit_logs").insert({
        admin_id: admin.id,
        action:   "ENTRY_DELETED",
        metadata: { entry_id: data.entryId },
      });

      return { success: true };
    }

    // LocalStore Fallback
    localStore.deleteEntry(data.entryId);
    return { success: true };
  });

/** Admin: execute lucky draw */
export const adminExecuteDraw = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized. Admin access required." };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: result, error } = await supabaseAdmin
        .rpc("execute_lucky_draw", { p_admin_id: admin.id });

      if (error) {
        console.error("Lucky draw error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, winner: result };
    }

    // LocalStore Fallback
    const existingWinner = localStore.getWinner();
    if (existingWinner) {
      return { success: false, error: "Lucky draw has already been executed. A winner exists." };
    }

    const validEntries = localStore.getEntries().filter((e) => e.is_valid && e.status === "valid");
    if (validEntries.length === 0) {
      return { success: false, error: "No valid entries found for the lucky draw." };
    }

    const randomIndex = Math.floor(Math.random() * validEntries.length);
    const chosen = validEntries[randomIndex];

    const winner: any = {
      ticket_number: chosen.ticket_number,
      display_name:  chosen.display_name,
      college_name:  chosen.college_name,
      photo_url:     chosen.photo_url,
      selected_at:   new Date().toISOString(),
      total_entries: validEntries.length,
    };

    localStore.setWinner(winner);
    return { success: true, winner };
  });

/** Admin: get dashboard summary */
export const adminGetStats = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const [totalRes, validRes, pendingRes, rejectedRes, studentsRes, drawRes] =
        await Promise.all([
          supabaseAdmin.from("entries").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("entries").select("*", { count: "exact", head: true })
            .eq("status", "valid"),
          supabaseAdmin.from("entries").select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabaseAdmin.from("entries").select("*", { count: "exact", head: true })
            .eq("status", "rejected"),
          supabaseAdmin.from("students").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("winners").select("ticket_number, selected_at").limit(1).maybeSingle(),
        ]);

      return {
        success: true,
        stats: {
          total:    totalRes.count    ?? 0,
          valid:    validRes.count    ?? 0,
          pending:  pendingRes.count  ?? 0,
          rejected: rejectedRes.count ?? 0,
          students: studentsRes.count ?? 0,
          drawDone: !!drawRes.data,
          winner:   drawRes.data ?? null,
        },
      };
    }

    // LocalStore Fallback
    const entries = localStore.getEntries();
    const students = localStore.getStudents();
    const winner = localStore.getWinner();

    return {
      success: true,
      stats: {
        total: entries.length,
        valid: entries.filter((e) => e.status === "valid").length,
        pending: entries.filter((e) => e.status === "pending").length,
        rejected: entries.filter((e) => e.status === "rejected").length,
        students: Math.max(students.length, entries.length),
        drawDone: !!winner,
        winner: winner ? { ticket_number: winner.ticket_number, selected_at: winner.selected_at } : null,
      },
    };
  });
