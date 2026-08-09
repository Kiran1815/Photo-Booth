/**
 * src/components/mobile/MobileLayout.tsx
 * Complete premium mobile layout — shown only on screens < 768px
 * Desktop layout is completely separate and unchanged.
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Camera, Upload, Trophy, Gift, Users, Clock,
  Home, Ticket, Star, Menu, X, ChevronRight,
  Instagram, Facebook, Youtube, Mail, Send, QrCode,
  ArrowRight, Sparkles, Heart,
} from "lucide-react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import trophy from "@/assets/trophy.png";
import giftbox from "@/assets/giftbox.png";


import { getStats } from "@/lib/server-fns";
import { localStore } from "@/lib/local-store";
import { useCountdown, CountdownBoxes, pad } from "@/components/site/Countdown";

// ── Bottom Nav Items ──────────────────────────────────
const BOTTOM_NAV = [
  { id: "home",     label: "Home",    icon: Home,   href: "#m-home" },
  { id: "upload",   label: "Upload",  icon: Camera, href: "#m-upload", cta: true },
  { id: "winners",  label: "Winners", icon: Trophy, href: "#m-winners" },
  { id: "contact",  label: "Contact", icon: Mail,   href: "#m-contact" },
];



// ── Main Component ────────────────────────────────────
export function MobileLayout() {
  const navigate = useNavigate();
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const [totalEntries, setTotalEntries]   = useState(() => localStore.getEntries().length);
  const t = useCountdown();

  const handleMobileUploadClick = () => {
    const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;
    if (!studentId) {
      navigate({ to: "/register" });
    } else {
      navigate({ to: "/upload-photo" });
    }
  };

  const loadMobileData = async () => {
    const statsRes = await getStats();
    if (statsRes.success) {
      setTotalEntries(statsRes.totalEntries || localStore.getEntries().length);
    }
  };

  useEffect(() => {
    loadMobileData();
  }, []);



  const NAV_LINKS = [
    { label: "Home",         href: "#m-home" },
    { label: "How It Works", href: "#m-how-it-works" },
    { label: "Winners",      href: "#m-winners" },
    { label: "Contact",      href: "#m-contact" },
  ];

  return (
    <div className="lg:hidden flex flex-col min-h-screen bg-background text-foreground">
      {/* ── HAMBURGER MENU OVERLAY ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-background/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          {/* Drawer */}
          <div className="w-72 bg-background border-l border-border/50 flex flex-col py-8 px-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <img src={utkarshLogoFont} alt="Utkarsh 2026"
                className="h-7 w-auto [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen" />
              <button onClick={() => setMenuOpen(false)}
                className="rounded-full border border-border p-1.5 hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((n) => (
                <a key={n.label} href={n.href} onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition-colors">
                  {n.label}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </nav>
            <div className="mt-auto pt-8 space-y-3">
              <Link to="/register" onClick={() => setMenuOpen(false)}
                className="block btn-neon rounded-xl py-3 text-center text-sm font-semibold">
                Register for Event
              </Link>
              <Link to="/admin-login" onClick={() => setMenuOpen(false)}
                className="block btn-outline-neon border rounded-xl py-3 text-center text-sm font-semibold">
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY TOP HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 py-2 flex items-center gap-3">
        <div className="flex flex-col">
          <img src={utkarshLogoFont} alt="Utkarsh 2026"
            className="h-6 w-auto [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen" />
          <span className="text-[7px] tracking-[0.2em] text-neon-pink uppercase font-semibold -mt-0.5">
            PHOTO BOOTH CONTEST
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/register"
            className="btn-neon rounded-full px-4 py-1.5 text-[11px] font-semibold whitespace-nowrap">
            Register
          </Link>
          <button onClick={() => setMenuOpen(true)}
            className="rounded-full border border-border/60 p-2 hover:bg-secondary transition-colors">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ────────────────── MAIN CONTENT ────────────────── */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* ── HERO ── */}
        <section id="m-home" className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0">
            <img src={heroBg} alt="" className="h-full w-full object-cover brightness-100" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/50 to-background" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-5 pt-8 pb-6">
            {/* Tagline */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-neon-pink/40 bg-neon-pink/10 px-3 py-1 mb-4">
              <Sparkles className="h-3 w-3 text-neon-pink" />
              <span className="text-[11px] text-neon-pink font-semibold">Smile. Click. Win! 📸</span>
            </div>

            <h1 className="text-4xl font-black tracking-tight leading-none">
              CAPTURE
            </h1>
            <span className="font-script text-5xl font-normal text-gradient leading-tight block">
              the Moment
            </span>

            <p className="mt-3 text-sm leading-6 text-muted-foreground max-w-xs">
              Upload your best click from the fest and stand a chance to win exciting prizes in our Lucky Draw!
            </p>

            {/* Countdown */}
            <p className="mt-5 text-[9px] tracking-[0.28em] text-muted-foreground uppercase">Contest Ends In</p>
            <CountdownBoxes className="mt-2" compact />

            {/* Upload CTA */}
            <div className="mt-6">
              <button onClick={handleMobileUploadClick}
                className="btn-neon w-full rounded-2xl py-4 text-sm font-black inline-flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" />
                UPLOAD YOUR PHOTO
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── QUICK STATS ── */}
        <section className="px-4 py-4 grid grid-cols-2 gap-3">
          <div className="panel px-4 py-4">
            <Users className="h-5 w-5 text-neon-purple mb-2" />
            <p className="text-2xl font-black">{totalEntries}</p>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Entries</p>
            <p className="text-[10px] text-muted-foreground">and counting…</p>
          </div>
          <div className="panel px-4 py-4">
            <Clock className="h-5 w-5 text-neon-pink mb-2" />
            <p className="text-xl font-black">{pad(t.days)} : {pad(t.hours)} : {pad(t.minutes)}</p>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Time Left</p>
            <p className="text-[10px] text-muted-foreground">Days  Hrs  Mins</p>
          </div>
          <div className="panel px-4 py-4">
            <Gift className="h-5 w-5 text-neon-gold mb-2" />
            <p className="text-2xl font-black text-neon-gold">₹5,000</p>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Prize Pool</p>
            <p className="text-[10px] text-muted-foreground">Exciting Prizes</p>
          </div>
          <div className="panel px-4 py-4">
            <Ticket className="h-5 w-5 text-neon-blue mb-2" />
            <p className="text-sm font-black text-neon-blue">UTKARSH2026-????</p>
            <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Your Ticket</p>
            <Link to="/register"
              className="text-[10px] text-neon-pink hover:underline block mt-0.5">Register →</Link>
          </div>
        </section>

        {/* ── PRIZE POOL ── */}
        <section className="px-4 pb-4">
          <div className="rounded-2xl border border-neon-gold/30 bg-gradient-to-br from-yellow-900/20 to-background p-5">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-neon-gold icon-glow-gold" />
              <h2 className="text-base font-black tracking-wide">PRIZE POOL 🎁</h2>
            </div>
            <p className="text-3xl font-black text-neon-gold mb-1">₹5,000</p>
            <p className="text-[11px] text-muted-foreground mb-4">Lucky draw — every valid entry wins a chance!</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neon-gold/20 bg-background/50 p-3 text-center">
                <span className="text-lg">🥇</span>
                <p className="text-lg font-black text-neon-gold">₹3,000</p>
                <p className="text-[10px] text-muted-foreground">1st Prize</p>
                <p className="text-[9px] text-muted-foreground">Winner takes all</p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/50 p-3 text-center">
                <span className="text-lg">🥈</span>
                <p className="text-lg font-black">₹2,000</p>
                <p className="text-[10px] text-muted-foreground">2nd Prize</p>
                <p className="text-[9px] text-muted-foreground">Runner-up reward</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Winners announced on <span className="text-neon-pink font-semibold">9th Sep 2026 at 4:00 PM</span>
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="m-how-it-works" className="px-4 pb-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-neon-purple icon-glow-purple" />
              <h2 className="text-base font-black tracking-wide">HOW IT WORKS</h2>
            </div>
            <ol className="space-y-4">
              {[
                { n: "01", title: "Get Registered",    desc: "Fill in your details to join the contest." },
                { n: "02", title: "Upload Photo",       desc: "Only one entry is allowed." },
                { n: "03", title: "Get Your Ticket ID", desc: "You'll get a unique ticket for the lucky draw." },
                { n: "04", title: "Lucky Draw",         desc: "Winners will be selected randomly." },
              ].map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neon-purple/60 text-[11px] font-black text-neon-purple">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-[12px] text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <img src={trophy} alt="Trophy" className="mx-auto mt-4 w-28 opacity-90" />
          </div>
        </section>

        {/* Gallery removed — visible only to admin in admin portal */}

        {/* ── LUCKY DRAW / GOLDEN TICKET ── */}
        <section className="px-4 pb-4">
          <div className="panel p-5">
            <h2 className="text-base font-black tracking-wide mb-2">LUCKY DRAW</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Every valid entry gets a chance to win!
            </p>
            <p className="text-[12px] text-muted-foreground mb-4">
              Winners will be selected randomly.
            </p>
            <div className="rounded-2xl border-2 border-neon-gold/40 bg-gradient-to-r from-yellow-900/20 to-background p-4 text-center mb-4">
              <p className="text-[9px] tracking-[0.2em] text-neon-gold/70 uppercase mb-1">Golden Ticket</p>
              <p className="text-lg font-black text-neon-gold">BY THE LUCKY ONE</p>
              <img src={giftbox} alt="Gift" className="mx-auto w-20 mt-2" />
            </div>
            <Link to="/register"
              className="block btn-outline-neon border rounded-xl py-3 text-center text-sm font-semibold">
              VIEW PRIZES
            </Link>
          </div>
        </section>

        {/* ── WINNER REVEAL ── */}
        <section id="m-winners" className="px-4 pb-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-5 w-5 text-neon-gold icon-glow-gold" />
              <h2 className="text-base font-black tracking-wide">WINNER REVEAL</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Winners will be announced on</p>
            <p className="font-semibold text-neon-pink">9th Sep, 2026 at 4:00 PM</p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-xl border border-neon-purple/60 px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
              🔔 Notify Me
            </button>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section id="m-contact" className="px-4 pb-4 space-y-3">
          <h2 className="text-base font-black tracking-wide">CONTACT &amp; FOLLOW</h2>

          <div className="panel p-4 flex items-center gap-4">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=Utkarsh2026-PhotoBooth&bgcolor=ffffff"
              alt="QR Code" className="h-14 w-14 rounded" />
            <div>
              <p className="text-[13px] font-semibold">SCAN &amp; PARTICIPATE</p>
              <p className="text-[11px] text-muted-foreground leading-4 mt-1">
                Scan the QR at the photo booth and join now!
              </p>
            </div>
          </div>

          <div className="panel p-4">
            <p className="text-[12px] font-semibold mb-3">FOLLOW US</p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Youtube].map((I, i) => (
                <a key={i} href="#contact" aria-label="Social"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neon-purple/60 text-neon-purple hover:bg-secondary transition-colors">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-neon-purple" />
              <div>
                <p className="text-[12px] font-semibold">HAVE QUESTIONS?</p>
                <p className="text-[11px] text-muted-foreground">info@fest26.com</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-4 text-center">
          <p className="text-[11px] text-muted-foreground">
            © 2026 Utkarsh Photo Booth Contest. All rights reserved.
          </p>
        </footer>
      </main>

      {/* ── STICKY BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {BOTTOM_NAV.map((n) => (
            n.cta ? (
              <button key={n.id}
                onClick={handleMobileUploadClick}
                className="flex flex-col items-center gap-0.5 -mt-5">
                <span className="btn-neon flex h-12 w-12 items-center justify-center rounded-full shadow-lg">
                  <n.icon className="h-5 w-5" />
                </span>
                <span className="text-[9px] font-semibold text-neon-pink mt-1">{n.label}</span>
              </button>
            ) : (
              <a key={n.id} href={n.href}
                onClick={() => setActiveNav(n.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                  activeNav === n.id ? "text-neon-pink" : "text-muted-foreground"
                }`}>
                <n.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{n.label}</span>
              </a>
            )
          ))}
        </div>
      </nav>
    </div>
  );
}
