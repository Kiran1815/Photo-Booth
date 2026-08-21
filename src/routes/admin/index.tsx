import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Users, CheckCircle, Clock, XCircle, BarChart3,
  Search, Trophy, Shuffle,
  Shield, LogOut, AlertTriangle, Loader2, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  adminGetStats,
  adminGetEntries,
  adminUpdateEntry,
  adminDeleteEntry,
  adminExecuteDraw,
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
  const [stats,   setStats]   = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [tab,     setTab]     = useState<"overview" | "entries" | "draw">("overview");
  const [loading, setLoading] = useState(true);

  // Draw state machine
  const [drawState,    setDrawState]    = useState<DrawState>("idle");
  const [countdown,    setCountdown]    = useState(3);
  const [flashTicket,  setFlashTicket]  = useState("...");
  const [flashPhoto,   setFlashPhoto]   = useState<string | null>(null);
  const [winner,       setWinner]       = useState<any>(null);
  const [drawError,    setDrawError]    = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedDrawNumber, setSelectedDrawNumber] = useState<number>(1);

  // Session check
  useEffect(() => {
    supabase.auth.getSession().then((result: { data: { session: { access_token: string } | null } | null }) => {
      const session = result.data?.session;
      if (session?.access_token) {
        setToken(session.access_token);
        return;
      }
      const localRaw = typeof window !== "undefined" ? localStorage.getItem("utkarsh_admin_session") : null;
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (parsed.access_token) {
            setToken(parsed.access_token);
            return;
          }
        } catch { /* ignore */ }
      }
      navigate({ to: "/admin-login" });
    });
  }, [navigate]);

  // Load stats
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      const res = await adminGetStats({ data: { token } });
      if (res.success) setStats(res.stats);
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
  useEffect(() => { if (tab === "entries") loadEntries(); }, [tab, search, page, token]);

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

    // Start backend call
    const drawPromise = adminExecuteDraw({ data: { token, draw: selectedDrawNumber } });

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

    setWinner(res.winner);
    setFlashPhoto(null);
    setDrawState("done");
    await refreshStats();
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

            {stats.drawDone ? (
              <div className="panel p-6 border border-neon-gold/40">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="h-6 w-6 text-neon-gold icon-glow-gold" />
                  <h2 className="text-lg font-bold">Draw Completed</h2>
                </div>
                <p className="text-neon-gold font-black text-2xl">{stats.winner?.ticket_number}</p>
                <p className="text-sm text-muted-foreground mt-1">Winner has been selected and stored permanently.</p>
              </div>
            ) : (
              <div className="panel p-6 border border-neon-purple/30">
                <div className="flex items-center gap-3 mb-2">
                  <Shuffle className="h-6 w-6 text-neon-purple icon-glow-purple" />
                  <h2 className="text-lg font-bold">Lucky Draw</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.valid} valid entries eligible. Draw has not been run yet.
                </p>
                <button onClick={() => setTab("draw")}
                  className="btn-neon rounded-full px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2">
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
                          <p className="text-[11px] text-muted-foreground">{e.students?.college_email}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-[12px]">
                          {e.students?.college_name || e.college_name}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-[12px]">
                          {e.students?.register_number || e.register_number}
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
                            {e.status !== "rejected" && (
                              <button onClick={() => handleEntryStatus(e.id, "rejected")}
                                className="rounded-lg border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors">
                                ✕ Reject
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
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-black tracking-wide mb-8 text-center">🎰 Lucky Draw</h1>

            <div className="panel p-8 text-center">
              <div className="mb-4 flex gap-4 justify-center">
                {/* Show Draw 1/2 winners if present */}
                {stats?.winner1 ? (
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">Draw 1 Winner</p>
                    <p className="text-neon-gold font-black">{stats.winner1.ticket_number}</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">Draw 1: Not run</div>
                )}

                {stats?.winner2 ? (
                  <div className="text-center">
                    <p className="text-[11px] text-muted-foreground">Draw 2 Winner</p>
                    <p className="text-neon-gold font-black">{stats.winner2.ticket_number}</p>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">Draw 2: Not run</div>
                )}
              </div>
                {/* IDLE */}
                {drawState === "idle" && (
                  <>
                    <Shuffle className="mx-auto h-14 w-14 text-neon-purple icon-glow-purple mb-4 animate-pulse" />
                    <h2 className="text-xl font-bold">Ready to Draw</h2>
                    <p className="mt-2 text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">{stats?.valid ?? 0}</strong> valid entries eligible.
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-6">
                      Winner is selected randomly by the server. Every entry has equal probability.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button onClick={() => startDrawFlow(1)}
                        className="btn-neon rounded-full px-8 py-3 text-base font-black inline-flex items-center gap-2">
                        DRAW 1
                      </button>
                      <button onClick={() => startDrawFlow(2)}
                        className="btn-neon rounded-full px-8 py-3 text-base font-black inline-flex items-center gap-2">
                        DRAW 2
                      </button>
                    </div>
                  </>
                )}

                {/* CONFIRM */}
                {drawState === "confirm" && (
                  <>
                    <AlertTriangle className="mx-auto h-14 w-14 text-neon-gold icon-glow-gold mb-4" />
                    <h2 className="text-xl font-bold">Are You Sure?</h2>
                    <p className="mt-2 text-sm text-muted-foreground mb-6">
                      This will permanently select ONE winner for <strong>DRAW {selectedDrawNumber}</strong> from all {stats?.valid ?? 0} valid entries.
                      <br />This action <strong className="text-foreground">cannot be undone</strong>.
                    </p>
                    <div className="flex gap-4 justify-center">
                      <button onClick={() => setDrawState("idle")}
                        className="btn-outline-neon border rounded-full px-6 py-3 text-sm font-semibold">
                        Cancel
                      </button>
                      <button onClick={executeDraw}
                        className="btn-neon rounded-full px-8 py-3 text-sm font-black inline-flex items-center gap-2">
                        <Trophy className="h-4 w-4" /> Confirm Draw
                      </button>
                    </div>
                  </>
                )}

                {/* COUNTDOWN */}
                {drawState === "counting" && (
                  <div className="py-8">
                    <p className="text-8xl font-black text-neon-pink icon-glow-pink animate-pulse">{countdown}</p>
                    <p className="mt-4 text-muted-foreground">Drawing in...</p>
                  </div>
                )}

                {/* ANIMATING — photo shuffle */}
                {drawState === "animating" && (
                  <div className="py-6">
                    <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-4 animate-pulse">
                      Shuffling all entries…
                    </p>
                    {/* Photo wheel */}
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

                {/* DONE */}
                {drawState === "done" && winner && (
                  <div className="animate-in fade-in zoom-in duration-700">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-2xl font-black text-neon-gold icon-glow-gold">WINNER!</h2>
                    <div className="mt-4 rounded-2xl border-2 border-neon-gold/60 bg-gradient-to-br from-yellow-900/20 to-background p-6">
                      <p className="text-3xl font-black text-neon-gold tracking-wider">{winner.ticket_number}</p>
                      <p className="mt-2 text-lg font-bold">{winner.display_name}</p>
                      <p className="text-sm text-muted-foreground">{winner.college_name}</p>
                    </div>
                    {(winner.photo_url || winner.photo_path) && (
                      <img src={winner.photo_url || winner.photo_path} alt="Winner"
                        className="mx-auto mt-4 w-48 h-48 object-cover rounded-xl border-2 border-neon-gold/60" />
                    )}
                    <p className="mt-4 text-[12px] text-muted-foreground">
                      Winner recorded permanently. Total entries: {winner.total_entries}
                    </p>
                  </div>
                )}

                {/* ERROR */}
                {drawState === "error" && (
                  <div>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-lg font-bold text-destructive">Draw Failed</h2>
                    <p className="mt-2 text-sm text-muted-foreground mb-4">{drawError}</p>
                    <button onClick={() => { setDrawState("idle"); setDrawError(null); }}
                      className="btn-outline-neon border rounded-full px-6 py-3 text-sm font-semibold">
                      Try Again
                    </button>
                  </div>
                )}
            </div>
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
