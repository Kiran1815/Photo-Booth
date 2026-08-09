import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, UserRound, School, Hash, Phone, Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import { registerStudent } from "@/lib/server-fns";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register | Utkarsh 2026 Photo Booth Contest" },
      { name: "description", content: "Register for the Utkarsh 2026 Photo Booth Contest." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    college: "",
    registerNo: "",
    contact: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerStudent({
        data: {
          full_name:       form.name.trim(),
          college_email:   form.email.trim(),
          college_name:    form.college.trim(),
          register_number: form.registerNo.trim(),
          contact_number:  form.contact.trim(),
        },
      });

      if (!res.success) {
        setError(res.error ?? "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      // Store student session info locally for the next upload step
      if (typeof window !== "undefined") {
        sessionStorage.setItem("studentId",   res.studentId!);
        sessionStorage.setItem("studentName", form.name.trim());
      }

      navigate({ to: "/upload-photo" });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden py-8">
      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-neon-purple/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-neon-pink/10 blur-[120px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex flex-col items-center mb-8 group">
          <img
            src={utkarshLogoFont}
            alt="utkarsh 2026"
            className="h-10 w-auto object-contain [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen"
          />
          <span className="mt-1 text-[9px] tracking-[0.32em] font-bold text-neon-pink uppercase icon-glow-pink">
            PHOTO BOOTH CONTEST
          </span>
        </Link>

        <div className="panel rounded-2xl p-8">
          {/* Decorative top bar */}
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue mb-7" />

          <h2 className="text-2xl font-black tracking-wide text-foreground mb-1">
            Student Registration
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in your details to join the contest and get your lucky draw ticket.
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div className="relative">
              <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-pink icon-glow-pink" />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full Name"
                required
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/30 transition-all"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-purple icon-glow-purple" />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email Address"
                required
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30 transition-all"
              />
            </div>

            {/* College */}
            <div className="relative">
              <School className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-blue icon-glow-purple" />
              <input
                type="text"
                name="college"
                value={form.college}
                onChange={handleChange}
                placeholder="College Name"
                required
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/30 transition-all"
              />
            </div>

            {/* Register No */}
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-gold icon-glow-gold" />
              <input
                type="text"
                name="registerNo"
                value={form.registerNo}
                onChange={handleChange}
                placeholder="Register Number / Student ID"
                required
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/30 transition-all"
              />
            </div>

            {/* Contact */}
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-pink icon-glow-pink" />
              <input
                type="tel"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="10-digit Phone Number"
                required
                pattern="\d{10}"
                maxLength={10}
                className="w-full rounded-xl border border-border bg-input pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-pink focus:ring-2 focus:ring-neon-pink/30 transition-all"
              />
            </div>

            {/* Register button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide btn-neon disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 icon-glow-pink" />
                  Register &amp; Next Step
                  <ArrowRight className="h-4 w-4 icon-glow-pink" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[11px] tracking-widest text-muted-foreground">OR</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Login as Admin */}
          <button
            onClick={() => navigate({ to: "/admin-login" })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold tracking-wide btn-outline-neon"
          >
            <UserRound className="h-4 w-4 text-neon-purple icon-glow-purple" />
            Login As Admin
          </button>
        </div>

        <p className="text-center mt-5 text-[12px] text-muted-foreground">
          <Link to="/" className="hover:text-neon-pink transition-colors">← Back to Contest</Link>
        </p>
      </div>
    </div>
  );
}
