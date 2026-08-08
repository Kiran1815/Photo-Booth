import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login | Utkarsh 2026" },
      { name: "description", content: "Admin login for Utkarsh 2026 Photo Booth Contest." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: password,
      });

      if (authErr) throw authErr;

      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message ?? "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      {/* Animated ring container */}
      <div className="ring" onMouseEnter={() => { }} onMouseLeave={() => { }}>
        <i style={{ "--clr": "#3700ffff" } as React.CSSProperties}></i>
        <i style={{ "--clr": "#ff0057" } as React.CSSProperties}></i>
        <i style={{ "--clr": "#44e3ffff" } as React.CSSProperties}></i>

        <div className="ring-login">
          {/* Logo inside the ring */}
          <Link to="/" className="flex flex-col items-center mb-2">
            <img
              src={utkarshLogoFont}
              alt="utkarsh 2026"
              className="h-7 w-auto object-contain [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen"
            />
            <span className="mt-0.5 text-[8px] tracking-[0.28em] font-bold text-neon-pink uppercase">
              PHOTO BOOTH CONTEST
            </span>
          </Link>

          <h2>Admin Login</h2>

          {error && (
            <p className="text-[11px] text-red-400 text-center mb-2">{error}</p>
          )}

          <form onSubmit={handleLogin} className="ring-form">
            <div className="ring-input-box">
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin Email"
                required
                autoComplete="email"
              />
            </div>
            <div className="ring-input-box">
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </div>
            <div className="ring-input-box">
              <input type="submit" value={loading ? "Logging in..." : "Login"} disabled={loading} />
            </div>
          </form>

          <div className="ring-links">
            <button
              type="button"
              onClick={() => navigate({ to: "/register" })}
              className="ring-back-btn"
            >
              ← Registration
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .admin-login-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #0a0a12;
          width: 100%;
          overflow: hidden;
          font-family: "Quicksand", "Outfit", sans-serif;
        }
        .ring {
          position: relative;
          width: 500px;
          height: 500px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .ring i {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(255,255,255,0.15);
          transition: 0.5s;
        }
        .ring i:nth-child(1) {
          border-radius: 38% 62% 63% 37% / 41% 44% 56% 59%;
          animation: ringAnimate 6s linear infinite;
        }
        .ring i:nth-child(2) {
          border-radius: 41% 44% 56% 59% / 38% 62% 63% 37%;
          animation: ringAnimate 4s linear infinite;
        }
        .ring i:nth-child(3) {
          border-radius: 41% 44% 56% 59% / 38% 62% 63% 37%;
          animation: ringAnimate2 10s linear infinite;
        }
        .ring:hover i {
          border: 6px solid var(--clr);
          filter: drop-shadow(0 0 20px var(--clr));
        }
        @keyframes ringAnimate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ringAnimate2 {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        .ring-login {
          position: absolute;
          width: 300px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          gap: 16px;
        }
        .ring-login h2 {
          font-size: 1.8em;
          color: #f7f0f0ff;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .ring-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .ring-input-box {
          position: relative;
          width: 100%;
        }
        .ring-input-box input {
          position: relative;
          width: 100%;
          padding: 12px 20px;
          background: transparent;
          border: 2px solid rgba(247, 243, 243, 1);
          border-radius: 40px;
          font-size: 1em;
          color: #f7f1f1ff;
          outline: none;
          font-family: inherit;
          transition: border-color 0.3s;
        }
        .ring-input-box input:focus {
          border-color: #f8f4f4ff;
          box-shadow: 0 0 12px rgba(255,0,87,0.4);
        }
        .ring-input-box input[type="submit"] {
          background: linear-gradient(45deg, #ff357a, #fc3bbcff);
          border: none;
          cursor: pointer;
          font-weight: 700;
          letter-spacing: 0.1em;
          font-size: 1em;
          color: #111;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ring-input-box input[type="submit"]:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 28px rgba(255,53,122,0.6);
        }
        .ring-input-box input::placeholder {
          color: rgba(250, 249, 249, 1);
        }
        .ring-links {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
        }
        .ring-links a {
          color: rgba(250, 247, 247, 1);
          text-decoration: none;
          font-size: 0.85em;
          transition: color 0.2s;
        }
        .ring-links a:hover { color: #f7f3f3ff; }
        .ring-back-btn {
          background: transparent;
          border: none;
          color: rgba(252, 248, 248, 0.7);
          font-size: 0.85em;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
          padding: 0;
        }
        .ring-back-btn:hover { color: #ff0057; }
      `}</style>
    </div>
  );
}
