import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Users, CheckCircle, Clock, XCircle, BarChart3,
  Search, Trophy, Shuffle,
  Shield, LogOut, AlertTriangle, Loader2, Trash2, RotateCcw,
  Lock, Unlock, ShieldAlert, Check, X, ToggleLeft, ToggleRight, Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  adminGetStats,
  adminGetEntries,
  adminUpdateEntry,
  adminDeleteEntry,
  adminExecuteDraw,
  adminGetGlobalDrawState,
  adminSetGlobalDrawState,
  adminCheckTestParticipants,
  getAvatarFallback,
} from "@/lib/server-fns";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin Dashboard | Utkarsh 2026" }],
  }),
  component: AdminDashboard,
});

type DrawState = "idle" | "confirm" | "counting" | "animating" | "done" | "error";

function AdminDashboard() {
  const navigate  = useNavigate();
  const [token,   setToken]   = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const isSuperController = userEmail.toLowerCase() === "utkarshhhhh@gmail.com";

  const [stats,   setStats]   = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [tab,     setTab]     = useState<"overview" | "entries" | "draw">("overview");
  const [loading, setLoading] = useState(true);

  // Controlled Mode Global State
  const [isControlledOn, setIsControlledOn] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<any>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Draw state machine (Session in-memory; refreshed upon page reload)
  const [drawState,    setDrawState]    = useState<DrawState>("idle");
  const [countdown,    setCountdown]    = useState(3);
  const [flashTicket,  setFlashTicket]  = useState("...");
  const [flashPhoto,   setFlashPhoto]   = useState<string | null>(null);
  const [winner,       setWinner]       = useState<any>(null);
  const [winner1,      setWinner1]      = useState<any>(null);
  const [winner2,      setWinner2]      = useState<any>(null);
  const [drawError,    setDrawError]    = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedDrawNumber, setSelectedDrawNumber] = useState<number>(1);

  // Session check
  useEffect(() => {
    const localRaw = typeof window !== "undefined" ? localStorage.getItem("utkarsh_admin_session") : null;
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw);
        if (parsed.user?.email) {
          setUserEmail(parsed.user.email);
        }
        if (parsed.access_token) {
          setToken(parsed.access_token);
          return;
        }
      } catch { /* ignore */ }
    }

    supabase.auth.getSession().then((result: { data: { session: { access_token: string; user?: { email?: string } } | null } | null }) => {
      const session = result.data?.session;
      if (session?.access_token) {
        setToken(session.access_token);
        if (session.user?.email) {
          setUserEmail(session.user.email);
        }
        return;
      }
      navigate({ to: "/admin-login" });
    });
  }, [navigate]);

  // Load stats & global draw state
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      const res = await adminGetStats({ data: { token } });
      if (res.success) setStats(res.stats);

      const drawStateRes = await adminGetGlobalDrawState({ data: { token } });
      if (drawStateRes.success) {
        setIsControlledOn(drawStateRes.enabled);
      }

      const tpRes = await adminCheckTestParticipants({ data: { token } });
      if (tpRes.success) {
        setTestStatus(tpRes);
      }

      setLoading(false);
    };
    load();
  }, [token]);

  // Load entries
  const loadEntries = async () => {
    if (!token) return;
    const res = await adminGetEntries({ data: { token, search, page, status: "all" } });
    if (res.success) { setEntries(res.entries ?? []); setTotal(res.total ?? 0); }
  };
  useEffect(() => { if (tab === "entries" || tab === "draw") loadEntries(); }, [tab, search, page, token]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("utkarsh_admin_session");
    }
    navigate({ to: "/admin-login" });
  };

  const refreshStats = async () => {
    if (!token) return;
    const statsRes = await adminGetStats({ data: { token } });
    if (statsRes.success) setStats(statsRes.stats);
  };

  const handleEntryStatus = async (entryId: string, status: "valid" | "rejected") => {
    if (!token) return;
    const res = await adminUpdateEntry({ data: { token, entryId, status } });
    if (!res.success) {
      alert(`Failed to update status: ${res.error ?? "Unknown error"}`);
      return;
    }
    await Promise.all([loadEntries(), refreshStats()]);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!token) return;
    const res = await adminDeleteEntry({ data: { token, entryId } });
    setDeleteConfirm(null);
    if (!res.success) {
      alert(`Delete failed: ${res.error ?? "Unknown error"}`);
      return;
    }
    await Promise.all([loadEntries(), refreshStats()]);
  };

  // ── Lucky Draw ──
  const startDrawFlow = (drawNum: number) => { setSelectedDrawNumber(drawNum); setDrawState("confirm"); };

  const handleResetDraws = () => {
    setWinner1(null);
    setWinner2(null);
    setWinner(null);
    setDrawState("idle");
    setDrawError(null);
  };

  const handleToggleGlobalControlled = async () => {
    if (!token) return;
    setToggleLoading(true);
    const nextState = !isControlledOn;
    setIsControlledOn(nextState);
    try {
      const res = await adminSetGlobalDrawState({ data: { token, enabled: nextState } });
      if (res.success) {
        setIsControlledOn(res.enabled);
      }
      const tpRes = await adminCheckTestParticipants({ data: { token } });
      if (tpRes.success) setTestStatus(tpRes);
    } catch { /* ignore */ }
    setToggleLoading(false);
  };

  const getEntryPhotoUrl = (entry: any) => {
    if (!entry) return null;
    const raw = entry.photo_url || entry.photo_path;
    if (raw && (raw.startsWith("http") || raw.startsWith("data:"))) return raw;
    if (raw) {
      try {
        const pubUrl = supabase.storage.from("contest-photos").getPublicUrl(raw).data?.publicUrl;
        if (pubUrl && !pubUrl.includes("YOUR_PROJECT_ID")) {
          return pubUrl;
        }
      } catch { /* ignore */ }
    }
    return getAvatarFallback(entry.students?.full_name || entry.display_name, entry.ticket_number);
  };

  const executeDraw = async () => {
    if (!token) return;
    setDrawState("counting");
    setCountdown(3);

    // Countdown 3-2-1
    for (let i = 3; i >= 1; i--) {
      setCountdown(i);
      await delay(900);
    }

    setDrawState("animating");

    // Pass the other draw winner ID (if any) to exclude it from this draw
    const excludeIds: string[] = [];
    if (selectedDrawNumber === 1 && winner2?.student_id) {
      excludeIds.push(winner2.student_id);
    } else if (selectedDrawNumber === 2 && winner1?.student_id) {
      excludeIds.push(winner1.student_id);
    }

    // Start backend call
    const drawPromise = adminExecuteDraw({
      data: {
        token,
        draw: selectedDrawNumber,
        excludeStudentIds: excludeIds,
      },
    });

    // Collect photos from current entries for the shuffle animation
    const entryPhotos = entries
      .map(getEntryPhotoUrl)
      .filter(Boolean) as string[];

    // Shuffle animation: cycle through ticket numbers AND photos
    let photoIdx = 0;
    const flashInterval = setInterval(() => {
      const rand = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
      setFlashTicket(`UTKARSH2026-${rand}`);
      if (entryPhotos.length > 0) {
        const photo = entryPhotos[photoIdx % entryPhotos.length];
        if (photo) setFlashPhoto(photo);
        photoIdx++;
      }
    }, 120);

    const [res] = await Promise.all([drawPromise, delay(4000)]);
    clearInterval(flashInterval);

    if (!res.success) {
      setDrawError(res.error ?? "Draw failed.");
      setDrawState("error");
      return;
    }

    if (selectedDrawNumber === 1) {
      setWinner1(res.winner);
    } else if (selectedDrawNumber === 2) {
      setWinner2(res.winner);
    }

    setWinner(res.winner);
    setFlashPhoto(null);
    setDrawState("done");
  };

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neon-pink" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3">
          <img src={utkarshLogoFont} alt="Utkarsh 2026"
            className="h-7 w-auto [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen" />
          <span className="ml-2 text-[10px] tracking-[0.2em] text-neon-purple font-semibold uppercase flex items-center gap-1">
            <Shield className="h-3 w-3" /> Admin Dashboard
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Public Site
            </Link>
            <button onClick={handleLogout}
              className="inline-flex items-center gap-1.5 btn-outline-neon rounded-full px-4 py-1.5 text-xs border">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 py-8">
        {/* Tab Nav */}
        <div className="flex gap-2 mb-8 border-b border-border/50 pb-4">
          {(["overview", "entries", "draw"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                tab === t ? "btn-neon" : "btn-outline-neon border"
              }`}>
              {t === "draw" ? "🎰 Lucky Draw" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black tracking-wide">Contest Overview</h1>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Total Entries",    value: stats.total,    icon: BarChart3,    color: "text-neon-purple" },
                { label: "Valid Entries",    value: stats.valid,    icon: CheckCircle,  color: "text-green-400" },
                { label: "Pending Review",   value: stats.pending,  icon: Clock,        color: "text-neon-gold" },
                { label: "Rejected",         value: stats.rejected, icon: XCircle,      color: "text-destructive" },
                { label: "Total Students",   value: stats.students, icon: Users,        color: "text-neon-blue" },
              ].map((s) => (
                <div key={s.label} className="panel px-5 py-5 flex flex-col gap-2">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <p className="text-2xl font-black">{s.value}</p>
                  <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {winner1 || winner2 ? (
              <div className="panel p-6 border border-neon-gold/40">
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-neon-gold icon-glow-gold" />
                    <div>
                      <h2 className="text-lg font-bold">Lucky Draw Status</h2>
                      <p className="text-xs text-muted-foreground">
                        {winner1 && winner2
                          ? "Both lucky draws completed!"
                          : winner1
                          ? "Draw 1 completed, Draw 2 pending"
                          : "Draw 2 completed, Draw 1 pending"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetDraws}
                      className="btn-outline-neon border rounded-full px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-secondary"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                    <button
                      onClick={() => setTab("draw")}
                      className="btn-neon rounded-full px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Trophy className="h-3.5 w-3.5" /> Manage Draws
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className={`p-4 rounded-xl border ${winner1 ? "border-neon-gold/50 bg-neon-gold/5" : "border-border/40 bg-secondary/20"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Draw 1 (1st Prize - ₹3,000)</p>
                      {winner1 && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          winner1.is_controlled ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-green-500/20 text-green-300 border border-green-500/40"
                        }`}>
                          {winner1.draw_type || (winner1.is_controlled ? "CONTROLLED" : "FAIR DRAW")}
                        </span>
                      )}
                    </div>
                    {winner1 ? (
                      <div className="mt-2">
                        <p className="text-xl font-black text-neon-gold">{winner1.ticket_number}</p>
                        <p className="text-sm font-semibold">{winner1.display_name}</p>
                        <p className="text-xs text-muted-foreground">{winner1.college_name}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground italic">Not executed yet</p>
                    )}
                  </div>

                  <div className={`p-4 rounded-xl border ${winner2 ? "border-cyan-400/50 bg-cyan-500/5" : "border-border/40 bg-secondary/20"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Draw 2 (2nd Prize - ₹2,000)</p>
                      {winner2 && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          winner2.is_controlled ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-green-500/20 text-green-300 border border-green-500/40"
                        }`}>
                          {winner2.draw_type || (winner2.is_controlled ? "CONTROLLED" : "FAIR DRAW")}
                        </span>
                      )}
                    </div>
                    {winner2 ? (
                      <div className="mt-2">
                        <p className="text-xl font-black text-cyan-400">{winner2.ticket_number}</p>
                        <p className="text-sm font-semibold">{winner2.display_name}</p>
                        <p className="text-xs text-muted-foreground">{winner2.college_name}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground italic">Not executed yet</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel p-6 border border-neon-purple/30">
                <div className="flex items-center gap-3 mb-2">
                  <Shuffle className="h-6 w-6 text-neon-purple icon-glow-purple" />
                  <h2 className="text-lg font-bold">Lucky Draw</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.valid} valid entries eligible. Draw 1 and Draw 2 have not been run yet.
                </p>
                <button
                  onClick={() => setTab("draw")}
                  className="btn-neon rounded-full px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Trophy className="h-4 w-4" /> Go to Lucky Draw
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ENTRIES TAB ── */}
        {tab === "entries" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-2xl font-black tracking-wide">All Entries</h1>
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 min-w-[220px]">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search ticket, name, register no…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
            </div>

            {/* Photo grid */}
            {entries.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {entries.map((e: any) => {
                  const photoSrc = getEntryPhotoUrl(e);
                  return (
                    <div key={e.id} className="group relative rounded-2xl overflow-hidden border border-border/50 bg-secondary/20">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={e.ticket_number}
                          className="w-full aspect-square object-cover"
                          onError={(evt) => {
                            const fallback = getAvatarFallback(e.students?.full_name || e.display_name, e.ticket_number);
                            (evt.target as HTMLImageElement).src = fallback;
                          }}
                        />
                      ) : (
                        <div className="w-full aspect-square bg-secondary/40 flex items-center justify-center text-muted-foreground text-xs">
                          No photo
                        </div>
                      )}
                      {/* Overlay info */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <p className="text-[10px] font-mono text-neon-pink">{e.ticket_number}</p>
                        <p className="text-[11px] font-semibold truncate">{e.students?.full_name || e.display_name}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold w-fit ${
                          e.status === "valid" ? "bg-green-500/20 text-green-400"
                            : e.status === "rejected" ? "bg-destructive/20 text-destructive"
                            : "bg-neon-gold/20 text-neon-gold"
                        }`}>{e.status}</span>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => setDeleteConfirm(e.id)}
                        className="absolute top-2 right-2 rounded-full bg-destructive/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table */}
            <div className="panel overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50">
                  <tr className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
                    <th className="px-4 py-3 text-left">Photo</th>
                    <th className="px-4 py-3 text-left">Ticket</th>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">College</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Reg No.</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {entries.map((e: any) => {
                    const photoSrc = getEntryPhotoUrl(e);
                    return (
                      <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt=""
                              className="h-10 w-10 object-cover rounded-lg border border-border/40"
                              onError={(evt) => {
                                const fallback = getAvatarFallback(e.students?.full_name || e.display_name, e.ticket_number);
                                (evt.target as HTMLImageElement).src = fallback;
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-secondary/40 flex items-center justify-center text-muted-foreground text-[9px]">N/A</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-neon-pink">{e.ticket_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{e.students?.full_name || e.display_name}</p>
                          <p className="text-[11px] text-muted-foreground">{e.students?.college_email || e.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-[12px]">
                          {e.students?.college_name || e.college_name}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-[12px]">
                          {e.students?.register_number || e.register_number}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-[12px]">
                          {e.students?.contact_number || e.contact_number || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            e.status === "valid"
                              ? "bg-green-500/15 text-green-400"
                              : e.status === "rejected"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-neon-gold/15 text-neon-gold"
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {e.status !== "valid" && (
                              <button onClick={() => handleEntryStatus(e.id, "valid")}
                                className="rounded-lg border border-green-500/40 px-2.5 py-1 text-[11px] text-green-400 hover:bg-green-500/10 transition-colors">
                                ✓ Approve
                              </button>
                            )}
                            <button onClick={() => setDeleteConfirm(e.id)}
                              className="rounded-lg border border-destructive/60 px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors inline-flex items-center gap-1">
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No entries found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {entries.length} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="btn-outline-neon border rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">← Prev</button>
                <button disabled={entries.length < 20} onClick={() => setPage((p) => p + 1)}
                  className="btn-outline-neon border rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">Next →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── LUCKY DRAW TAB ── */}
        {tab === "draw" && (
          <div className="max-w-4xl mx-auto">
            {/* 1. SUPER CONTROLLER INTERFACE (Visible ONLY to utkarshhhhh@gmail.com) */}
            {isSuperController && (
              <div className="mb-8 p-6 rounded-2xl panel border-2 border-neon-gold/60 shadow-[0_0_30px_rgba(234,179,8,0.2)] bg-gradient-to-b from-secondary/50 to-background">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-neon-gold icon-glow-gold" />
                      <h2 className="text-lg font-black text-foreground">Controlled Draw Master Switch</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Logged in as Super Admin ({userEmail}). Toggle state applies globally to all operator draws.
                    </p>
                  </div>

                  <button
                    onClick={handleToggleGlobalControlled}
                    disabled={toggleLoading}
                    className={`px-6 py-2.5 rounded-full text-xs font-black transition-all inline-flex items-center gap-2.5 shadow-lg ${
                      isControlledOn
                        ? "bg-green-500 text-black hover:bg-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                        : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {toggleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isControlledOn ? (
                      <ToggleRight className="h-5 w-5 text-black" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                    {isControlledOn ? "CONTROLLED DRAW: ON" : "CONTROLLED DRAW: OFF"}
                  </button>
                </div>

                {/* Status & Rules */}
                <div className="mt-4 space-y-3">
                  <div className="p-3 rounded-xl bg-background/50 border border-border/50 text-xs flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Current Global Behavior:</span>
                    <span className={`font-black uppercase px-2.5 py-0.5 rounded-full text-[11px] ${
                      isControlledOn
                        ? "bg-green-500/20 text-green-300 border border-green-500/40"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    }`}>
                      {isControlledOn ? "⚡ Active: Pre-configured test candidates will win" : "🎲 Normal: 100% Fair Random Draw"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-background/40 border border-border/40 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">Test Candidate 1:</span>
                        {testStatus?.tp1Registered ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold flex items-center gap-1 border border-green-500/40">
                            <Check className="h-2.5 w-2.5" /> Registered in DB
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold flex items-center gap-1 border border-destructive/40">
                            <X className="h-2.5 w-2.5" /> Not Registered
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-neon-gold">24A21A05S0</p>
                      <p className="text-muted-foreground text-[10px]">kopparthisarupya369@gmail.com • 9959606487</p>
                    </div>

                    <div className="p-3 rounded-xl bg-background/40 border border-border/40 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">Test Candidate 2:</span>
                        {testStatus?.tp2Registered ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-bold flex items-center gap-1 border border-green-500/40">
                            <Check className="h-2.5 w-2.5" /> Registered in DB
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold flex items-center gap-1 border border-destructive/40">
                            <X className="h-2.5 w-2.5" /> Not Registered (Fair Fallback)
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-cyan-400">323103210258</p>
                      <p className="text-muted-foreground text-[10px]">navyatatakuntla99@gmail.com • 9618693109</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Lucky Draw Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black tracking-wide mb-1">🎰 Lucky Draw</h1>
              <p className="text-xs text-muted-foreground">
                Select winners for Draw 1 (1st Prize - ₹3,000) and Draw 2 (2nd Prize - ₹2,000)
              </p>
            </div>

            {/* CONFIRM MODAL / STATE */}
            {drawState === "confirm" && (
              <div className="panel p-8 text-center max-w-md mx-auto">
                <AlertTriangle className="mx-auto h-14 w-14 text-neon-gold icon-glow-gold mb-4" />
                <h2 className="text-xl font-bold">Confirm Draw {selectedDrawNumber}?</h2>
                <p className="mt-2 text-sm text-muted-foreground mb-6">
                  This will select the winner for{" "}
                  <strong className="text-neon-gold">
                    {selectedDrawNumber === 1 ? "Draw 1 (1st Prize - ₹3,000)" : "Draw 2 (2nd Prize - ₹2,000)"}
                  </strong>{" "}
                  from eligible registered participants.
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setDrawState("idle")}
                    className="btn-outline-neon border rounded-full px-6 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDraw}
                    className="btn-neon rounded-full px-8 py-2.5 text-sm font-black inline-flex items-center gap-2"
                  >
                    <Trophy className="h-4 w-4" /> Start Draw
                  </button>
                </div>
              </div>
            )}

            {/* COUNTDOWN */}
            {drawState === "counting" && (
              <div className="panel p-12 text-center max-w-md mx-auto">
                <p className="text-8xl font-black text-neon-pink icon-glow-pink animate-pulse">{countdown}</p>
                <p className="mt-4 text-sm font-semibold text-muted-foreground tracking-wider uppercase">
                  Drawing Draw {selectedDrawNumber} in...
                </p>
              </div>
            )}

            {/* ANIMATING — Photo Wheel & Ticket Shuffle (uses ALL genuine entries) */}
            {drawState === "animating" && (
              <div className="panel p-8 text-center max-w-md mx-auto">
                <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-4 animate-pulse">
                  Shuffling registered participants for Draw {selectedDrawNumber}…
                </p>
                {flashPhoto ? (
                  <div className="relative mx-auto mb-4 w-48 h-48 rounded-2xl overflow-hidden border-2 border-neon-pink/60 shadow-[0_0_40px_rgba(236,72,153,0.4)]">
                    <img
                      key={flashPhoto}
                      src={flashPhoto}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ animation: "pulse 0.12s ease-in-out" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                  </div>
                ) : (
                  <div className="mx-auto mb-4 w-48 h-48 rounded-2xl border-2 border-neon-pink/60 bg-secondary/30 flex items-center justify-center">
                    <Shuffle className="h-12 w-12 text-neon-purple animate-spin" />
                  </div>
                )}
                <p className="text-2xl font-black text-neon-pink icon-glow-pink font-mono animate-pulse">
                  {flashTicket}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Selecting winner...</p>
              </div>
            )}

            {/* DONE / WINNER CELEBRATION */}
            {drawState === "done" && winner && (
              <div className="animate-in fade-in zoom-in duration-700 max-w-md mx-auto text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-2xl font-black text-neon-gold icon-glow-gold mb-1">
                  DRAW {winner.draw_number ?? selectedDrawNumber} WINNER SELECTED!
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {(winner.draw_number ?? selectedDrawNumber) === 1 ? "1st Prize (₹3,000)" : "2nd Prize (₹2,000)"}
                </p>

                <div className="panel p-6 border-2 border-neon-gold/70 shadow-[0_0_30px_rgba(234,179,8,0.25)] rounded-2xl flex flex-col items-center bg-gradient-to-b from-secondary/40 to-background">
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-border/60 mb-4 bg-secondary/40 shadow-inner">
                    <img
                      src={winner.photo_url || winner.photo_path || getAvatarFallback(winner.display_name, winner.ticket_number)}
                      alt={winner.display_name}
                      className="w-full h-full object-cover"
                      onError={(evt) => {
                        (evt.target as HTMLImageElement).src = getAvatarFallback(winner.display_name, winner.ticket_number);
                      }}
                    />
                  </div>
                  <p className="font-mono text-2xl font-black text-neon-gold tracking-wider">{winner.ticket_number}</p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{winner.display_name}</h3>
                  <p className="text-xs text-muted-foreground">{winner.college_name}</p>
                  <div className="mt-3 space-y-1 text-center">
                    {winner.register_number && (
                      <p className="text-[11px] text-muted-foreground">Reg: <span className="text-foreground font-mono">{winner.register_number}</span></p>
                    )}
                    {winner.contact_number && (
                      <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-semibold">{winner.contact_number}</span></p>
                    )}
                    {winner.email && (
                      <p className="text-[11px] text-muted-foreground">Email: <span className="text-foreground">{winner.email}</span></p>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Total entries eligible: {winner.total_entries}
                  </p>
                </div>

                <div className="mt-6 flex justify-center gap-4">
                  <button
                    onClick={() => { setDrawState("idle"); setWinner(null); }}
                    className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2"
                  >
                    {(!winner1 || !winner2)
                      ? `Proceed to Draw ${(winner.draw_number ?? selectedDrawNumber) === 1 ? 2 : 1} →`
                      : "View Both Winners Side-by-Side →"}
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {drawState === "error" && (
              <div className="panel p-8 text-center max-w-md mx-auto">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                <h2 className="text-lg font-bold text-destructive">Draw Failed</h2>
                <p className="mt-2 text-sm text-muted-foreground mb-4">{drawError}</p>
                <button
                  onClick={() => { setDrawState("idle"); setDrawError(null); }}
                  className="btn-outline-neon border rounded-full px-6 py-2.5 text-sm font-semibold"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* IDLE: DASHBOARD OF DRAWS */}
            {drawState === "idle" && (
              <div className="space-y-6">
                {(winner1 || winner2) && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleResetDraws}
                      className="btn-outline-neon border rounded-full px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-secondary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Retake / Reset Draws
                    </button>
                  </div>
                )}

                {/* 1. BOTH DRAWS COMPLETED -> SIDE BY SIDE */}
                {winner1 && winner2 && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl border border-green-500/40 bg-green-500/10 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-green-400">
                        🎉 Both Lucky Draws Completed!
                      </p>
                      <button
                        onClick={handleResetDraws}
                        className="btn-outline-neon border rounded-full px-4 py-1 text-xs font-semibold inline-flex items-center gap-1 hover:bg-secondary"
                      >
                        <RotateCcw className="h-3 w-3" /> Draw Again
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Winner 1 Card */}
                      <div className="panel p-6 border-2 border-neon-gold/70 shadow-[0_0_30px_rgba(234,179,8,0.25)] rounded-2xl flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-secondary/40 to-background">
                        <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider mb-4 bg-neon-gold/20 text-neon-gold border border-neon-gold/40">
                          🥇 1st Prize Winner (Draw 1) • ₹3,000
                        </span>
                        <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-border/60 mb-4 bg-secondary/40 shadow-inner">
                          <img
                            src={winner1.photo_url || winner1.photo_path || getAvatarFallback(winner1.display_name, winner1.ticket_number)}
                            alt={winner1.display_name}
                            className="w-full h-full object-cover"
                            onError={(evt) => {
                              (evt.target as HTMLImageElement).src = getAvatarFallback(winner1.display_name, winner1.ticket_number);
                            }}
                          />
                        </div>
                        <p className="font-mono text-2xl font-black text-neon-gold tracking-wider">{winner1.ticket_number}</p>
                        <h3 className="mt-1 text-lg font-bold text-foreground">{winner1.display_name}</h3>
                        <p className="text-xs text-muted-foreground">{winner1.college_name}</p>
                        <div className="mt-2 space-y-0.5 text-center">
                          {winner1.register_number && <p className="text-[11px] text-muted-foreground">Reg: <span className="text-foreground font-mono">{winner1.register_number}</span></p>}
                          {winner1.contact_number && <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-semibold">{winner1.contact_number}</span></p>}
                          {winner1.email && <p className="text-[11px] text-muted-foreground">Email: <span className="text-foreground">{winner1.email}</span></p>}
                        </div>
                      </div>

                      {/* Winner 2 Card */}
                      <div className="panel p-6 border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(6,182,212,0.25)] rounded-2xl flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-secondary/40 to-background">
                        <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider mb-4 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          🥈 2nd Prize Winner (Draw 2) • ₹2,000
                        </span>
                        <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-border/60 mb-4 bg-secondary/40 shadow-inner">
                          <img
                            src={winner2.photo_url || winner2.photo_path || getAvatarFallback(winner2.display_name, winner2.ticket_number)}
                            alt={winner2.display_name}
                            className="w-full h-full object-cover"
                            onError={(evt) => {
                              (evt.target as HTMLImageElement).src = getAvatarFallback(winner2.display_name, winner2.ticket_number);
                            }}
                          />
                        </div>
                        <p className="font-mono text-2xl font-black text-cyan-400 tracking-wider">{winner2.ticket_number}</p>
                        <h3 className="mt-1 text-lg font-bold text-foreground">{winner2.display_name}</h3>
                        <p className="text-xs text-muted-foreground">{winner2.college_name}</p>
                        <div className="mt-2 space-y-0.5 text-center">
                          {winner2.register_number && <p className="text-[11px] text-muted-foreground">Reg: <span className="text-foreground font-mono">{winner2.register_number}</span></p>}
                          {winner2.contact_number && <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-semibold">{winner2.contact_number}</span></p>}
                          {winner2.email && <p className="text-[11px] text-muted-foreground">Email: <span className="text-foreground">{winner2.email}</span></p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. DRAW 1 DONE, DRAW 2 PENDING */}
                {winner1 && !winner2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Draw 1 Winner Card */}
                    <div className="panel p-6 border-2 border-neon-gold/70 shadow-[0_0_30px_rgba(234,179,8,0.25)] rounded-2xl flex flex-col items-center text-center bg-gradient-to-b from-secondary/40 to-background">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider mb-4 bg-neon-gold/20 text-neon-gold border border-neon-gold/40">
                        🥇 1st Prize Winner (Draw 1) • ₹3,000
                      </span>
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-border/60 mb-3 bg-secondary/40 shadow-inner">
                        <img
                          src={winner1.photo_url || winner1.photo_path || getAvatarFallback(winner1.display_name, winner1.ticket_number)}
                          alt={winner1.display_name}
                          className="w-full h-full object-cover"
                          onError={(evt) => {
                            (evt.target as HTMLImageElement).src = getAvatarFallback(winner1.display_name, winner1.ticket_number);
                          }}
                        />
                      </div>
                      <p className="font-mono text-xl font-black text-neon-gold tracking-wider">{winner1.ticket_number}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground">{winner1.display_name}</h3>
                      <p className="text-xs text-muted-foreground">{winner1.college_name}</p>
                      <div className="mt-2 space-y-0.5 text-center">
                        {winner1.register_number && <p className="text-[11px] text-muted-foreground">Reg: <span className="text-foreground font-mono">{winner1.register_number}</span></p>}
                        {winner1.contact_number && <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-semibold">{winner1.contact_number}</span></p>}
                        {winner1.email && <p className="text-[11px] text-muted-foreground">Email: <span className="text-foreground">{winner1.email}</span></p>}
                      </div>
                    </div>

                    {/* Draw 2 Action Card */}
                    <div className="panel p-8 border border-cyan-400/40 rounded-2xl flex flex-col items-center text-center bg-secondary/20 min-h-[320px] justify-center">
                      <span className="text-4xl mb-2">🥈</span>
                      <h3 className="text-lg font-black text-foreground">Draw 2 (2nd Prize)</h3>
                      <p className="text-xs font-semibold text-cyan-400 mb-3">Prize Pool: ₹2,000</p>
                      <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
                        Draw 1 is complete! Click below to draw the 2nd prize winner. The Draw 1 winner ({winner1.ticket_number}) is excluded automatically.
                      </p>
                      <button
                        onClick={() => startDrawFlow(2)}
                        className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2"
                      >
                        <Shuffle className="h-4 w-4" /> EXECUTE DRAW 2
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. DRAW 2 DONE, DRAW 1 PENDING */}
                {!winner1 && winner2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Draw 1 Action Card */}
                    <div className="panel p-8 border border-neon-gold/40 rounded-2xl flex flex-col items-center text-center bg-secondary/20 min-h-[320px] justify-center">
                      <span className="text-4xl mb-2">🥇</span>
                      <h3 className="text-lg font-black text-foreground">Draw 1 (1st Prize)</h3>
                      <p className="text-xs font-semibold text-neon-gold mb-3">Prize Pool: ₹3,000</p>
                      <p className="text-xs text-muted-foreground mb-6 max-w-xs leading-relaxed">
                        Draw 2 is complete! Click below to draw the 1st prize winner. The Draw 2 winner ({winner2.ticket_number}) is excluded automatically.
                      </p>
                      <button
                        onClick={() => startDrawFlow(1)}
                        className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2"
                      >
                        <Shuffle className="h-4 w-4" /> EXECUTE DRAW 1
                      </button>
                    </div>

                    {/* Draw 2 Winner Card */}
                    <div className="panel p-6 border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(6,182,212,0.25)] rounded-2xl flex flex-col items-center text-center bg-gradient-to-b from-secondary/40 to-background">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider mb-4 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                        🥈 2nd Prize Winner (Draw 2) • ₹2,000
                      </span>
                      <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-border/60 mb-3 bg-secondary/40 shadow-inner">
                        <img
                          src={winner2.photo_url || winner2.photo_path || getAvatarFallback(winner2.display_name, winner2.ticket_number)}
                          alt={winner2.display_name}
                          className="w-full h-full object-cover"
                          onError={(evt) => {
                            (evt.target as HTMLImageElement).src = getAvatarFallback(winner2.display_name, winner2.ticket_number);
                          }}
                        />
                      </div>
                      <p className="font-mono text-xl font-black text-cyan-400 tracking-wider">{winner2.ticket_number}</p>
                      <h3 className="mt-1 text-base font-bold text-foreground">{winner2.display_name}</h3>
                      <p className="text-xs text-muted-foreground">{winner2.college_name}</p>
                      <div className="mt-2 space-y-0.5 text-center">
                        {winner2.register_number && <p className="text-[11px] text-muted-foreground">Reg: <span className="text-foreground font-mono">{winner2.register_number}</span></p>}
                        {winner2.contact_number && <p className="text-[11px] text-muted-foreground">Phone: <span className="text-foreground font-semibold">{winner2.contact_number}</span></p>}
                        {winner2.email && <p className="text-[11px] text-muted-foreground">Email: <span className="text-foreground">{winner2.email}</span></p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. NEITHER DRAW DONE YET */}
                {!winner1 && !winner2 && (
                  <div className="panel p-8 text-center max-w-xl mx-auto">
                    <Shuffle className="mx-auto h-14 w-14 text-neon-purple icon-glow-purple mb-4 animate-pulse" />
                    <h2 className="text-xl font-bold">Ready to Draw</h2>
                    <p className="mt-2 text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">{stats?.valid ?? 0}</strong> valid entries eligible.
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-6">
                      Winner is selected randomly from registered participants. You can execute Draw 1 or Draw 2 in any order.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                      <button
                        onClick={() => startDrawFlow(1)}
                        className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2"
                      >
                        🥇 DRAW 1 (1st Prize - ₹3,000)
                      </button>
                      <button
                        onClick={() => startDrawFlow(2)}
                        className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2"
                      >
                        🥈 DRAW 2 (2nd Prize - ₹2,000)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="panel p-8 max-w-sm w-full mx-4 border border-destructive/40 text-center">
            <Trash2 className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-black">Delete Entry?</h2>
            <p className="mt-2 text-sm text-muted-foreground mb-6">
              This will permanently delete this entry and photo. This action <strong className="text-foreground">cannot be undone</strong>.
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => setDeleteConfirm(null)}
                className="btn-outline-neon border rounded-full px-6 py-2.5 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={() => handleDeleteEntry(deleteConfirm)}
                className="rounded-full bg-destructive px-6 py-2.5 text-sm font-black text-white hover:bg-destructive/80 transition-colors inline-flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
