/**
 * src/lib/local-store.ts
 * LocalStorage persistent storage fallback for entries, students, and winners.
 * Ensures the app works 100% locally with data persisting across refreshes
 * before or alongside Supabase integration.
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

// Default initial demo photos so gallery isn't empty on first load
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";
import g5 from "@/assets/g5.jpg";
import g6 from "@/assets/g6.jpg";

const DEFAULT_ENTRIES: StoredEntry[] = [
  { id: "1", ticket_number: "UTKARSH2026-0001", photo_url: g1, display_name: "Ananya R.",    college_name: "CEC", register_number: "REG001", contact_number: "9876543210", submitted_at: new Date(Date.now() - 3600000 * 5).toISOString(), status: "valid", is_valid: true, student_id: "s1" },
  { id: "2", ticket_number: "UTKARSH2026-0002", photo_url: g2, display_name: "Rahul K.",     college_name: "NIT", register_number: "REG002", contact_number: "9876543211", submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(), status: "valid", is_valid: true, student_id: "s2" },
  { id: "3", ticket_number: "UTKARSH2026-0003", photo_url: g3, display_name: "Sneha P.",     college_name: "IIT", register_number: "REG003", contact_number: "9876543212", submitted_at: new Date(Date.now() - 3600000 * 3).toISOString(), status: "valid", is_valid: true, student_id: "s3" },
  { id: "4", ticket_number: "UTKARSH2026-0004", photo_url: g4, display_name: "Aditya V.",    college_name: "BITS", register_number: "REG004", contact_number: "9876543213", submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(), status: "valid", is_valid: true, student_id: "s4" },
  { id: "5", ticket_number: "UTKARSH2026-0005", photo_url: g5, display_name: "Meera & Diya", college_name: "CEC", register_number: "REG005", contact_number: "9876543214", submitted_at: new Date(Date.now() - 3600000 * 1).toISOString(), status: "valid", is_valid: true, student_id: "s5" },
  { id: "6", ticket_number: "UTKARSH2026-0006", photo_url: g6, display_name: "Kiran M.",     college_name: "VIT", register_number: "REG006", contact_number: "9876543215", submitted_at: new Date().toISOString(),                  status: "valid", is_valid: true, student_id: "s6" },
];

export const localStore = {
  getEntries(): StoredEntry[] {
    if (typeof window === "undefined") return DEFAULT_ENTRIES;
    const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES));
      return DEFAULT_ENTRIES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_ENTRIES;
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
