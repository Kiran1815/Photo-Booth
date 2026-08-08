import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { Upload, Camera, CheckCircle, AlertCircle, Loader2, ArrowLeft, Ticket } from "lucide-react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import { supabase } from "@/lib/supabase";
import { createEntry } from "@/lib/server-fns";

export const Route = createFileRoute("/upload-photo")({
  head: () => ({
    meta: [
      { title: "Upload Photo | Utkarsh 2026 Photo Booth Contest" },
      { name: "description", content: "Upload your contest photo and get your ticket." },
    ],
  }),
  component: UploadPhotoPage,
});

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

type Step = "select" | "preview" | "uploading" | "success" | "error";

function UploadPhotoPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Student ID stored in sessionStorage after registration
  const studentId =
    typeof window !== "undefined" ? sessionStorage.getItem("studentId") ?? "" : "";
  const studentName =
    typeof window !== "undefined" ? sessionStorage.getItem("studentName") ?? "" : "";

  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback((f: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
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

  const handleSubmit = async () => {
    if (!file || !studentId) {
      setError("Session expired. Please register again.");
      return;
    }

    setStep("uploading");
    setError(null);

    try {
      // 1. Generate ticket number via Supabase RPC
      const { data: ticketNum, error: ticketErr } = await supabase
        .rpc("generate_ticket_number");

      if (ticketErr || !ticketNum) throw new Error("Failed to generate ticket number.");

      // 2. Upload photo to Supabase Storage
      const ext       = file.name.split(".").pop();
      const photoPath = `2026/${ticketNum}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("contest-photos")
        .upload(photoPath, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw new Error("Photo upload failed: " + uploadErr.message);

      // 3. Create entry record via server function
      const json = await createEntry({
        data: {
          student_id:    studentId,
          ticket_number: ticketNum,
          photo_path:    photoPath,
        },
      });
      if (!json.success) throw new Error(json.error ?? "Failed to save entry.");

      setTicket(ticketNum);
      setStep("success");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setStep("error");
    }
  };

  // Redirect if no student session
  if (!studentId && typeof window !== "undefined") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="panel p-8 text-center max-w-sm w-full">
          <AlertCircle className="mx-auto h-12 w-12 text-neon-pink icon-glow-pink mb-4" />
          <h2 className="text-lg font-bold">Session Expired</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please register first before uploading your photo.
          </p>
          <Link to="/register" className="mt-6 inline-flex btn-neon rounded-full px-6 py-3 text-sm font-semibold">
            Register Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-neon-purple/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-neon-pink/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <Link to="/" className="flex flex-col items-center mb-8">
          <img src={utkarshLogoFont} alt="Utkarsh 2026"
            className="h-8 w-auto [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen" />
          <span className="mt-1 text-[9px] tracking-[0.32em] text-neon-pink uppercase">PHOTO BOOTH CONTEST</span>
        </Link>

        {/* ── SUCCESS STATE ── */}
        {step === "success" && ticket && (
          <div className="panel p-8 text-center animate-in fade-in zoom-in duration-500">
            <div className="h-1 w-full rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue mb-6" />
            <CheckCircle className="mx-auto h-14 w-14 text-neon-pink icon-glow-pink mb-4" />
            <h1 className="text-2xl font-black tracking-wide">You're In!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {studentName}, your photo has been submitted.
            </p>

            {/* Ticket */}
            <div className="mt-6 rounded-2xl border-2 border-neon-gold/60 bg-gradient-to-br from-yellow-900/20 to-background p-5">
              <p className="text-[10px] tracking-[0.3em] text-neon-gold/80 uppercase">Your Lucky Draw Ticket</p>
              <p className="mt-2 text-3xl font-black text-neon-gold icon-glow-gold tracking-wider">{ticket}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Every valid entry wins an equal chance!</p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {preview && (
                <img src={preview} alt="Your submitted photo"
                  className="w-full rounded-xl object-cover max-h-48 border border-border" />
              )}
              <Link to="/" className="btn-neon rounded-full px-6 py-3 text-sm font-semibold inline-flex justify-center gap-2">
                <Camera className="h-4 w-4" /> Back to Contest
              </Link>
            </div>
          </div>
        )}

        {/* ── SELECT/PREVIEW/UPLOADING/ERROR STATES ── */}
        {step !== "success" && (
          <div className="panel p-8">
            <div className="h-1 w-full rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue mb-6" />
            <h1 className="text-2xl font-black tracking-wide">Upload Your Photo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One entry per participant. Choose your best shot!
            </p>

            {/* Drop zone */}
            {step !== "uploading" && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => step !== "preview" && fileRef.current?.click()}
                className="mt-6 cursor-pointer rounded-2xl border-2 border-dashed border-neon-purple/50 bg-secondary/30 
                           flex flex-col items-center justify-center py-8 px-4 text-center
                           hover:border-neon-pink/70 hover:bg-secondary/50 transition-all duration-200"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-64 rounded-xl object-contain" />
                ) : (
                  <>
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-neon-purple/70 glow-ring">
                      <Camera className="h-8 w-8 text-neon-pink icon-glow-pink" />
                    </div>
                    <p className="text-sm font-semibold">Tap to select photo</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      JPG, PNG or WEBP · Max {MAX_SIZE_MB}MB
                    </p>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {/* Error */}
            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Uploading */}
            {step === "uploading" && (
              <div className="mt-6 flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-neon-pink" />
                <p className="text-sm font-semibold">Uploading your photo...</p>
                <p className="text-[12px] text-muted-foreground">Generating your ticket number...</p>
              </div>
            )}

            {/* Buttons */}
            {step !== "uploading" && (
              <div className="mt-6 flex flex-col gap-3">
                {step === "preview" && (
                  <>
                    <button onClick={handleSubmit}
                      className="btn-neon w-full rounded-xl py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4" /> Submit &amp; Get Ticket
                    </button>
                    <button onClick={() => { setFile(null); setPreview(null); setStep("select"); setError(null); }}
                      className="btn-outline-neon w-full rounded-xl py-3.5 text-sm font-semibold border">
                      Choose Different Photo
                    </button>
                  </>
                )}
                {(step === "select" || step === "error") && (
                  <button onClick={() => fileRef.current?.click()}
                    className="btn-neon w-full rounded-xl py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2">
                    <Camera className="h-4 w-4" /> Select Photo
                  </button>
                )}
                {step === "error" && (
                  <button onClick={() => { setError(null); setStep(file ? "preview" : "select"); }}
                    className="btn-outline-neon w-full rounded-xl py-3.5 text-sm font-semibold border">
                    Try Again
                  </button>
                )}
              </div>
            )}

            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              <Link to="/" className="hover:text-neon-pink transition-colors">
                <ArrowLeft className="inline h-3 w-3 mr-1" />Back to Contest
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
