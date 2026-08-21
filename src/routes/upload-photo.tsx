import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { Upload, Camera, CheckCircle, AlertCircle, Loader2, ArrowLeft, Ticket } from "lucide-react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import goldenTicket from "@/assets/golden-ticket.png";
import { supabase } from "@/lib/supabase";
import { createEntry } from "@/lib/server-fns";
import { localStore } from "@/lib/local-store";

export const Route = createFileRoute("/upload-photo")({
  head: () => ({
    meta: [
      { title: "Upload Photo | Utkarsh 2026 Photo Booth Contest" },
      { name: "description", content: "Upload your contest photo and get your unique ticket number." },
    ],
  }),
  component: UploadPhotoPage,
});

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

type Step = "select" | "preview" | "uploading" | "success" | "error";

function UploadPhotoPage() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  // Read student session info from registration step
  const studentId =
    typeof window !== "undefined" ? sessionStorage.getItem("studentId") ?? "" : "";
  const studentName =
    typeof window !== "undefined" ? sessionStorage.getItem("studentName") ?? "" : "";

  const [step, setStep]       = useState<Step>("select");
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ticket, setTicket]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds limit (${MAX_SIZE_MB}MB max). Please select a smaller photo.`);
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("preview");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const readFileAsDataUrl = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  };

  const handleSubmit = async () => {
    if (!file || !studentId) {
      setError("Session expired or missing registration details. Please register again.");
      setStep("select");
      return;
    }

    setStep("uploading");
    setError(null);

    try {
      // 1. Read file as Data URL for guaranteed display fallback
      const dataUrl = await readFileAsDataUrl(file);

      // 2. Get the student's existing ticket_number from DB (already assigned at registration)
      let ticketNum = "";
      try {
        const { data: studentRow } = await supabase
          .from("students")
          .select("ticket_id, ticket_number")
          .eq("id", studentId)
          .maybeSingle();
        if (studentRow?.ticket_id) {
          ticketNum = studentRow.ticket_id;
        }
      } catch (e) {
        console.warn("Could not fetch student ticket_id:", e);
      }
      // Fallback: try RPC
      if (!ticketNum) {
        try {
          const { data: rpcTicket } = await supabase.rpc("generate_ticket_number");
          ticketNum = rpcTicket || "";
        } catch (e) {
          console.warn("RPC ticket error:", e);
        }
      }
      if (!ticketNum) {
        ticketNum = localStore.getNextTicketNumber();
      }

      let savedPhotoPath = dataUrl;

      // 3. Upload to Supabase Storage
      try {
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const storageFilePath = `${ticketNum}_${Date.now()}.${ext}`;

        const { data: storageResult, error: uploadErr } = await supabase.storage
          .from("contest-photos")
          .upload(storageFilePath, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (!uploadErr && storageResult?.path) {
          // Save the bare storage path (e.g. "UTKARSH2026-0007_1234567890.jpg"),
          // NOT the public URL. This lets delete work by calling .remove([photo_path]).
          savedPhotoPath = storageResult.path;
        } else if (uploadErr) {
          console.warn("Storage upload failed, using Data URL fallback:", uploadErr.message);
        }
      } catch (storageErr) {
        console.warn("Storage upload fallback to Data URL:", storageErr);
      }

      // 4. Update student record with photo path
      const res = await createEntry({
        data: {
          student_id:    studentId,
          ticket_number: ticketNum,
          photo_path:    savedPhotoPath,
          display_name:  studentName || "Participant",
        },
      });

      if (!res.success) {
        throw new Error(res.error ?? "Failed to save photo in student record.");
      }

      // 5. Success: set verified ticket number
      const finalTicket = res.entry?.ticket_number || ticketNum;
      setTicket(finalTicket);
      setStep("success");
    } catch (err: any) {
      console.error("Submission failure:", err);
      setError(err.message ?? "Photo upload failed. Please try again.");
      setStep("error");
    }
  };

  // Redirect if no student session
  if (!studentId && typeof window !== "undefined") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="panel p-8 text-center max-w-sm w-full border border-neon-pink/30 shadow-[0_0_30px_rgba(236,72,153,0.2)]">
          <AlertCircle className="mx-auto h-12 w-12 text-neon-pink icon-glow-pink mb-4" />
          <h2 className="text-xl font-black">Registration Required</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Please register for Utkarsh 2026 before uploading your photo entry.
          </p>
          <Link
            to="/register"
            className="mt-6 inline-flex btn-neon rounded-full px-8 py-3 text-sm font-semibold items-center gap-2"
          >
            Register for Event →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-neon-purple/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-neon-pink/10 blur-[120px]" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header link */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <img src={utkarshLogoFont} alt="Utkarsh 2026" className="h-6 w-auto [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen" />
        </div>

        {/* STEP 1: Select or Drop File */}
        {step === "select" && (
          <div className="panel p-8 text-center space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-neon-pink/40 bg-neon-pink/10">
              <Camera className="h-8 w-8 text-neon-pink icon-glow-pink" />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-wide">Upload Contest Photo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Select your best fest photo. Every valid entry receives a unique ticket!
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border/60 hover:border-neon-pink/60 rounded-2xl p-10 cursor-pointer transition-colors bg-secondary/20 hover:bg-secondary/40 flex flex-col items-center justify-center gap-3"
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-semibold">
                Drag & drop your photo here, or <span className="text-neon-pink underline">browse</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Supports JPG, PNG, WEBP (Max {MAX_SIZE_MB}MB)
              </p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {/* STEP 2: Preview Selected File */}
        {step === "preview" && preview && (
          <div className="panel p-8 text-center space-y-6">
            <h1 className="text-2xl font-black">Confirm Photo</h1>

            <div className="relative mx-auto w-64 h-64 rounded-2xl overflow-hidden border-2 border-neon-pink/50 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              <img src={preview} alt="Selected preview" className="w-full h-full object-cover" />
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => { setStep("select"); setFile(null); setPreview(null); }}
                className="btn-outline-neon border rounded-full px-6 py-3 text-xs font-semibold"
              >
                Choose Different
              </button>
              <button
                onClick={handleSubmit}
                className="btn-neon rounded-full px-8 py-3 text-xs font-black inline-flex items-center gap-2"
              >
                <Upload className="h-4 w-4" /> Submit Entry
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Uploading Indicator */}
        {step === "uploading" && (
          <div className="panel p-12 text-center space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-neon-pink animate-spin" />
            <h2 className="text-xl font-bold">Uploading Photo & Generating Ticket…</h2>
            <p className="text-xs text-muted-foreground">Storing image in Supabase Storage bucket contest-photos</p>
          </div>
        )}

        {/* STEP 4: Success & Golden Ticket */}
        {step === "success" && ticket && (
          <div className="panel p-8 text-center space-y-6 animate-in zoom-in duration-500 border border-neon-gold/50 shadow-[0_0_50px_rgba(234,179,8,0.2)]">
            <CheckCircle className="mx-auto h-16 w-16 text-neon-gold icon-glow-gold" />
            <h1 className="text-3xl font-black text-neon-gold icon-glow-gold">CONTEST ENTRY CONFIRMED!</h1>
            <p className="text-sm text-muted-foreground">Your photo has been uploaded and stored in the database.</p>

            {/* Golden Ticket Card */}
            <div className="relative mx-auto rounded-2xl border-2 border-neon-gold/60 bg-gradient-to-br from-yellow-900/30 via-background to-yellow-950/40 p-6 text-center shadow-2xl">
              <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-neon-gold font-semibold uppercase mb-4 border-b border-neon-gold/20 pb-2">
                <span>Utkarsh 2026 Ticket</span>
                <span>Lucky Draw Entry</span>
              </div>
              <Ticket className="mx-auto h-10 w-10 text-neon-gold mb-2" />
              <p className="text-3xl font-black font-mono tracking-widest text-neon-gold icon-glow-gold">
                {ticket}
              </p>
              <p className="mt-2 text-xs text-foreground font-medium">{studentName || "Participant"}</p>
              <p className="mt-4 text-[10px] text-muted-foreground">
                Keep this ticket number safe! Winner draw on 9th Sep 2026 at 4:00 PM.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn-neon rounded-full px-8 py-3 text-xs font-black">
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* STEP 5: Error Screen */}
        {step === "error" && (
          <div className="panel p-8 text-center space-y-6 border border-destructive/40">
            <AlertCircle className="mx-auto h-14 w-14 text-destructive mb-2" />
            <h2 className="text-xl font-bold text-destructive">Upload Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => setStep("select")}
              className="btn-outline-neon border rounded-full px-8 py-3 text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
