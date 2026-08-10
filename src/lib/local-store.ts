/**
 * src/lib/local-store.ts
 * LocalStorage persistent storage fallback for entries, students, and winners.
 * The live application relies on Supabase; this fallback must not inject demo/gallery data.
 */

export interface StoredEntry {
  id: string;
  ticket_number: string;
  photo_url: string;
  display_name: string;
  submitted_at: string;
  student_id: string;
  college_name: string;
  register_number: string;
  contact_number: string;
  status: "valid" | "pending" | "rejected";
  is_valid: boolean;
}

export interface StoredWinner {
  ticket_number: string;
  display_name: string;
  college_name: string;
  photo_url: string;
  selected_at: string;
  total_entries: number;
}

const STORAGE_KEYS = {
  ENTRIES: "utkarsh_entries_v1",
  STUDENTS: "utkarsh_students_v1",
  WINNER: "utkarsh_winner_v1",
  COUNTER: "utkarsh_ticket_counter_v1",
};

export const localStore = {
  getEntries(): StoredEntry[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify([]));
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  addEntry(entry: Omit<StoredEntry, "id" | "submitted_at">): StoredEntry {
    const entries = this.getEntries();
    const newEntry: StoredEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      submitted_at: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updated));
    }
    return newEntry;
  },

  getNextTicketNumber(): string {
    if (typeof window === "undefined") return "UTKARSH2026-0007";
    const entries = this.getEntries();
    const count = entries.length + 1;
    const current = Number(localStorage.getItem(STORAGE_KEYS.COUNTER) || count);
    const next = Math.max(current, count);
    localStorage.setItem(STORAGE_KEYS.COUNTER, String(next + 1));
    return `UTKARSH2026-${String(next).padStart(4, "0")}`;
  },

  getStudents(): any[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return raw ? JSON.parse(raw) : [];
  },

  addStudent(student: any): any {
    const students = this.getStudents();
    const newStudent = {
      ...student,
      id: `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    students.push(newStudent);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }
    return newStudent;
  },

  getWinner(): StoredWinner | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.WINNER);
    return raw ? JSON.parse(raw) : null;
  },

  setWinner(winner: StoredWinner): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.WINNER, JSON.stringify(winner));
    }
  },

  updateEntryStatus(id: string, status: "valid" | "rejected" | "pending"): void {
    const entries = this.getEntries();
    const updated = entries.map((e) =>
      e.id === id ? { ...e, status, is_valid: status === "valid" } : e
    );
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updated));
    }
  },

  deleteEntry(id: string): void {
    const entries = this.getEntries();
    const updated = entries.filter((e) => e.id !== id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updated));
    }
  },
};
