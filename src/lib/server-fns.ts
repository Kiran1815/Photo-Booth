/**
 * src/lib/server-fns.ts
 * TanStack Start server functions — all backend API logic.
 * Connects directly to Supabase public.students table.
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

/** Register a new student in public.students table */
export const registerStudent = createServerFn({ method: "POST" })
  .validator(RegisterSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // 1. Check for duplicates in Supabase students table
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

      // 2. Insert student into public.students
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
        .select("id, full_name, college_name, college_email, ticket_id")
        .single();

      if (error) {
        console.error("Registration error:", error);
        return { success: false, error: `Registration failed: ${error.message}` };
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

/** Update student record in public.students with photo_path after successful upload */
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
      // Check if student exists
      const { data: student, error: fetchErr } = await supabaseAdmin
        .from("students")
        .select("id, ticket_id, photo_path")
        .eq("id", data.student_id)
        .single();

      if (fetchErr || !student) {
        return { success: false, error: "Student record not found." };
      }

      if (student.photo_path) {
        return { success: false, error: "You have already uploaded a photo for this contest." };
      }

      // Update student record in public.students table with photo_path
      const { data: updatedStudent, error: updateErr } = await supabaseAdmin
        .from("students")
        .update({
          photo_path: data.photo_path,
        })
        .eq("id", data.student_id)
        .select("id, ticket_id, photo_path")
        .maybeSingle();

      if (updateErr) {
        console.error("Update student photo error:", updateErr);
        return { success: false, error: `Failed to save photo path in database: ${updateErr.message}` };
      }

      return {
        success: true,
        entry: {
          id: updatedStudent?.id || data.student_id,
          ticket_number: updatedStudent?.ticket_id || student.ticket_id || data.ticket_number,
        },
      };
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

/** Get student's own profile */
export const getStudentProfile = createServerFn({ method: "GET" })
  .validator(z.object({ studentId: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: student } = await supabaseAdmin
        .from("students")
        .select("full_name, college_name, status, ticket_id, photo_path, created_at")
        .eq("id", data.studentId)
        .single();

      if (!student) return { success: false, error: "Student not found." };

      let photo_url: string | null = null;
      if (student.photo_path) {
        if (student.photo_path.startsWith("http")) {
          photo_url = student.photo_path;
        } else {
          const { data: pubData } = supabaseAdmin.storage
            .from("contest-photos")
            .getPublicUrl(student.photo_path);
          photo_url = pubData?.publicUrl ?? null;
        }
      }

      return {
        success: true,
        student,
        entry: student.photo_path
          ? {
              ticket_number: student.ticket_id || "UTKARSH2026",
              photo_url,
              status: student.status,
              submitted_at: student.created_at,
            }
          : null,
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

/** Get paginated public gallery from public.students */
export const getGallery = createServerFn({ method: "GET" })
  .validator(z.object({ page: z.number().default(1), perPage: z.number().default(12) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const from = (data.page - 1) * data.perPage;
      const to   = from + data.perPage - 1;

      const { data: studentsList, error, count } = await supabaseAdmin
        .from("students")
        .select("id, ticket_id, photo_path, created_at, full_name, college_name", { count: "exact" })
        .not("photo_path", "is", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) return { success: false, items: [], total: 0 };

      const items = (studentsList ?? []).map((s: any) => {
        let photo_url = s.photo_path;
        if (s.photo_path && !s.photo_path.startsWith("http") && !s.photo_path.startsWith("data:")) {
          const { data: pubData } = supabaseAdmin.storage
            .from("contest-photos")
            .getPublicUrl(s.photo_path);
          photo_url = pubData?.publicUrl || s.photo_path;
        }
        return {
          id:            s.id,
          ticket_number: s.ticket_id || "UTKARSH2026",
          photo_url:     photo_url || "",
          display_name:  s.full_name || "Participant",
          submitted_at:  s.created_at,
        };
      });

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
        .from("students").select("*", { count: "exact", head: true });

      const { count: valid } = await supabaseAdmin
        .from("students").select("*", { count: "exact", head: true })
        .not("photo_path", "is", null);

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
          students!inner(photo_path, full_name, college_name)
        `)
        .order("selected_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!winner) return { success: false, winner: null };

      const student = (winner as any).students;

      let photo_url = student?.photo_path;
      if (student?.photo_path && !student.photo_path.startsWith("http")) {
        const { data: pubData } = supabaseAdmin.storage
          .from("contest-photos")
          .getPublicUrl(student.photo_path);
        photo_url = pubData?.publicUrl || student.photo_path;
      }

      return {
        success: true,
        winner: {
          ticket_number: winner.ticket_number,
          display_name:  student?.full_name   ?? "Winner",
          college_name:  student?.college_name ?? "",
          photo_url:     photo_url ?? "",
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

/** Admin: get all student photo uploads with search */
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
        .select(`
          id, ticket_id, status, created_at, photo_path,
          full_name, college_name, register_number, college_email, contact_number
        `, { count: "exact" })
        .not("photo_path", "is", null)
        .order("created_at", { ascending: false })
        .range(from, from + 19);

      if (data.status !== "all") {
        query = query.eq("status", data.status);
      }
      if (data.search) {
        query = query.or(
          `ticket_id.ilike.%${data.search}%,full_name.ilike.%${data.search}%,register_number.ilike.%${data.search}%`
        );
      }

      const { data: studentsList, error, count } = await query;
      if (error) return { success: false, error: error.message };

      const items = (studentsList ?? []).map((s: any) => {
        let photo_url = s.photo_path;
        if (s.photo_path && !s.photo_path.startsWith("data:") && !s.photo_path.startsWith("http")) {
          const { data: pubData } = supabaseAdmin.storage
            .from("contest-photos")
            .getPublicUrl(s.photo_path);
          photo_url = pubData?.publicUrl || s.photo_path;
        }
        return {
          id:            s.id,
          ticket_number: s.ticket_id || "UTKARSH2026",
          status:        s.status || "valid",
          is_valid:      true,
          submitted_at:  s.created_at,
          photo_path:    s.photo_path,
          photo_url,
          students: {
            full_name:       s.full_name,
            college_name:    s.college_name,
            register_number: s.register_number,
            college_email:   s.college_email,
            contact_number:  s.contact_number,
          },
        };
      });

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

/** Admin: approve or reject a student photo */
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
        .from("students")
        .update({
          status: data.status,
        })
        .eq("id", data.entryId);

      if (error) return { success: false, error: error.message };

      await supabaseAdmin.from("audit_logs").insert({
        admin_id: admin.id,
        action:   `STUDENT_STATUS_CHANGED_TO_${data.status.toUpperCase()}`,
        metadata: { student_id: data.entryId },
      });

      return { success: true };
    }

    // LocalStore Fallback
    localStore.updateEntryStatus(data.entryId, data.status);
    return { success: true };
  });

/** Admin: delete photo permanently */
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
        .from("students")
        .update({ photo_path: null })
        .eq("id", data.entryId);

      if (error) return { success: false, error: error.message };

      await supabaseAdmin.from("audit_logs").insert({
        admin_id: admin.id,
        action:   "STUDENT_PHOTO_DELETED",
        metadata: { student_id: data.entryId },
      });

      return { success: true };
    }

    // LocalStore Fallback
    localStore.deleteEntry(data.entryId);
    return { success: true };
  });

/** Admin: execute lucky draw directly from public.students */
export const adminExecuteDraw = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized. Admin access required." };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      // Query valid students with uploaded photos
      const { data: validStudents, error } = await supabaseAdmin
        .from("students")
        .select("id, full_name, college_name, photo_path, ticket_id")
        .not("photo_path", "is", null);

      if (error || !validStudents || validStudents.length === 0) {
        return { success: false, error: "No valid student entries with photos found." };
      }

      const randomIndex = Math.floor(Math.random() * validStudents.length);
      const chosen = validStudents[randomIndex];

      let photo_url = chosen.photo_path;
      if (chosen.photo_path && !chosen.photo_path.startsWith("http")) {
        const { data: pubData } = supabaseAdmin.storage
          .from("contest-photos")
          .getPublicUrl(chosen.photo_path);
        photo_url = pubData?.publicUrl || chosen.photo_path;
      }

      const winner = {
        ticket_number: chosen.ticket_id || "UTKARSH2026-0001",
        display_name:  chosen.full_name,
        college_name:  chosen.college_name,
        photo_path:    photo_url,
        selected_at:   new Date().toISOString(),
        total_entries: validStudents.length,
      };

      return { success: true, winner };
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

/** Admin: get dashboard summary stats directly from public.students */
export const adminGetStats = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const admin = await verifyAdmin(`Bearer ${data.token}`);
    if (!admin) return { success: false, error: "Unauthorized" };

    const { supabaseAdmin, isSupabaseConfigured } = await import("./supabase-server");

    if (isSupabaseConfigured && supabaseAdmin) {
      const [studentsRes, photosRes, winnerRes] = await Promise.all([
        supabaseAdmin.from("students").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("students").select("*", { count: "exact", head: true }).not("photo_path", "is", null),
        supabaseAdmin.from("winners").select("ticket_number, selected_at").limit(1).maybeSingle(),
      ]);

      const photoCount = photosRes.count ?? 0;
      const studentCount = studentsRes.count ?? 0;

      return {
        success: true,
        stats: {
          total:    photoCount,
          valid:    photoCount,
          pending:  0,
          rejected: 0,
          students: studentCount,
          drawDone: !!winnerRes.data,
          winner:   winnerRes.data ?? null,
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
