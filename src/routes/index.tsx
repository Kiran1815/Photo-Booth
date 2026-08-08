import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Camera,
  Upload,
  ArrowRight,
  Users,
  Clock,
  Gift,
  Ticket,
  MailCheck,
  ImageUp,
  ScanLine,
  Sparkles,
  Heart,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  Send,
  Bell,
  UserRound,
  ClipboardList,
} from "lucide-react";

import { CountdownBoxes, useCountdown, pad } from "@/components/site/Countdown";
import heroBg from "@/assets/hero-bg.jpg";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import trophy from "@/assets/trophy.png";
import goldenTicket from "@/assets/golden-ticket.png";
import giftbox from "@/assets/giftbox.png";
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";
import g5 from "@/assets/g5.jpg";
import g6 from "@/assets/g6.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Utkarsh 2026 Photo Booth Contest | Capture the Moment" },
      {
        name: "description",
        content:
          "Upload your best click from Utkarsh 2026, get a lucky draw ticket and win from a ₹5,000 prize pool. One entry per college email.",
      },
      { property: "og:title", content: "Utkarsh 2026 Photo Booth Contest" },
      {
        property: "og:description",
        content:
          "Upload your best fest click and stand a chance to win exciting prizes in the Utkarsh 2026 lucky draw.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const NAV: { label: string; href: string }[] = [
  { label: "Home",         href: "#home" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Gallery",      href: "#gallery" },
  { label: "Winners",      href: "#winners" },
  { label: "Contact",      href: "#contact" },
];

const GALLERY = [
  { src: g1, id: "FEST26-0001", name: "Ananya R."    },
  { src: g2, id: "FEST26-0002", name: "Rahul K."     },
  { src: g3, id: "FEST26-0003", name: "Sneha P."     },
  { src: g4, id: "FEST26-0004", name: "Aditya V."    },
  { src: g5, id: "FEST26-0005", name: "Meera & Diya" },
  { src: g6, id: "FEST26-0006", name: "Kiran M."     },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: "Get Registered to the Event",
    desc: "Fill in your details to join the contest.",
  },
  {
    icon: ImageUp,
    title: "Upload your best photo",
    desc: "Only one entry per email is allowed.",
  },
  {
    icon: Ticket,
    title: "Get your unique ticket ID",
    desc: "You'll get a ticket for the lucky draw.",
  },
  {
    icon: Sparkles,
    title: "Winners will be selected randomly",
    desc: "Stay tuned for the big reveal!",
  },
];

import { MobileLayout } from "@/components/mobile/MobileLayout";
import { useEffect } from "react";
import { getGallery } from "@/lib/server-fns";
import { localStore } from "@/lib/local-store";

function Index() {
  const t = useCountdown();
  const [email, setEmail] = useState("");
  const [liveGallery, setLiveGallery] = useState<any[]>(GALLERY);

  useEffect(() => {
    const load = async () => {
      const res = await getGallery({ data: { page: 1, perPage: 6 } });
      if (res.success && res.items && res.items.length > 0) {
        setLiveGallery(res.items);
      } else {
        const local = localStore.getEntries().slice(0, 6).map((e) => ({
          id: e.id,
          ticket_number: e.ticket_number,
          photo_url: e.photo_url,
          display_name: e.display_name,
        }));
        setLiveGallery(local);
      }
    };
    load();
  }, []);

  return (
    <>
      <MobileLayout />
      <div className="hidden lg:block min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <a href="#home" className="flex flex-col justify-center py-1 group shrink-0">
            <img
              src={utkarshLogoFont}
              alt="utkarsh 2026"
              className="h-8 sm:h-9 w-auto object-contain [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen"
            />
            <span className="block text-[8.5px] sm:text-[9.5px] tracking-[0.32em] font-bold text-neon-pink uppercase leading-none mt-1 icon-glow-pink">
              PHOTO BOOTH CONTEST
            </span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV.map((n, i) => (
              <a
                key={n.label}
                href={n.href}
                className={`text-sm font-medium transition-colors hover:text-neon-pink ${
                  i === 0 ? "text-neon-pink" : "text-muted-foreground"
                }`}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <Link
            to="/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:px-5 sm:py-2 text-sm btn-neon"
          >
            <UserRound className="h-4 w-4 icon-glow-pink" />
            Register the Event
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative overflow-hidden border-b border-border/50 bg-cover bg-right sm:bg-center bg-no-repeat min-h-[560px] flex items-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        {/* Subtle bottom overlay to anchor content */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

        <div className="relative mx-auto max-w-[1240px] w-full px-5 py-14 sm:py-24">
          <div className="max-w-xl text-left [text-shadow:0_2px_16px_rgba(0,0,0,0.8)]">
            <p className="flex items-center gap-2 font-script text-2xl text-neon-pink sm:text-3xl">
              Smile. Click. Win!
              <Camera className="ml-1 h-6 w-6 icon-glow-pink sm:h-8 sm:w-8" />
            </p>
            <h1 className="mt-2 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              CAPTURE
              <span className="mt-1 block font-script text-5xl font-normal tracking-normal text-gradient sm:text-6xl md:text-7xl">
                the Moment
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-muted-foreground">
              Upload your best click from the fest and stand a chance to win exciting prizes in our
              Lucky Draw!
            </p>

            <p className="mt-8 text-[10px] tracking-[0.22em] text-muted-foreground">
              CONTEST ENDS IN
            </p>
            <div className="mt-3">
              <CountdownBoxes />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {/* Hidden file input to open device media */}
              <input
                type="file"
                id="hero-photo-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) alert(`Photo selected: ${file.name}`);
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("hero-photo-input")?.click()}
                className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-semibold tracking-wide btn-neon"
              >
                <Upload className="h-4 w-4 icon-glow-pink" />
                UPLOAD YOUR PHOTO
                <ArrowRight className="h-4 w-4 icon-glow-pink" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto grid max-w-[1240px] gap-5 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Users,
            label: "TOTAL ENTRIES",
            value: "427",
            sub: "and counting...",
          },
          {
            icon: Clock,
            label: "TIME LEFT",
            value: `${pad(t.days)} : ${pad(t.hours)} : ${pad(t.minutes)}`,
            sub: "Days   Hrs   Mins",
          },
          { icon: Gift, label: "PRIZE POOL", value: "₹5,000", sub: "Exciting Prizes" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-4 panel px-5 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neon-purple/60 bg-secondary/60">
              <s.icon className="h-5 w-5 text-neon-purple icon-glow-purple" />
            </span>
            <div>
              <p className="text-[10px] tracking-[0.18em] text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-xl font-bold ${s.valueClassName || ""}`}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
            </div>
          </div>
        ))}

        {/* YOUR TICKET card with utkarsh logo font */}
        <div className="flex items-center gap-4 panel px-5 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neon-purple/60 bg-secondary/60">
            <Ticket className="h-5 w-5 text-neon-purple icon-glow-purple" />
          </span>
          <div>
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground">YOUR TICKET</p>
            <div className="mt-1 flex items-center gap-1.5">
              <img
                src={utkarshLogoFont}
                alt="Utkarsh 2026"
                className="h-5 w-auto object-contain [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen"
              />
              <span className="text-sm font-semibold text-neon-pink">-0142</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Check your luck!</p>
          </div>
        </div>
      </section>

      {/* Prize Pool + How it works */}
      <section className="mx-auto grid max-w-[1240px] gap-5 px-5 pb-8 lg:grid-cols-2">
        <div id="upload" className="panel p-7 flex flex-col">
          {/* Header */}
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide">
            PRIZE POOL
            <Gift className="h-4 w-4 text-neon-gold icon-glow-gold" />
          </h2>

          {/* Total pool banner */}
          <div
            className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-neon-gold/40 py-6 px-4 text-center"
            style={{ backgroundImage: "var(--gradient-gold)" }}
          >
            <p className="text-[11px] tracking-[0.28em] text-neon-gold/80 uppercase">Total Prize Pool</p>
            <p className="mt-1 text-5xl font-black text-neon-gold icon-glow-gold">₹5,000</p>
            <p className="mt-1 text-xs text-muted-foreground">Lucky draw — every valid entry wins a chance!</p>
          </div>

          {/* Prize breakdown */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* 1st Prize */}
            <div className="flex items-center gap-4 rounded-xl border border-neon-gold/40 bg-secondary/40 px-5 py-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-neon-gold/60 bg-panel text-2xl">
                🥇
              </span>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">1st Prize</p>
                <p className="mt-0.5 text-2xl font-black text-neon-gold icon-glow-gold">₹3,000</p>
                <p className="text-[11px] text-muted-foreground">Winner takes all!</p>
              </div>
            </div>

            {/* 2nd Prize */}
            <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-secondary/40 px-5 py-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/40 bg-panel text-2xl">
                🥈
              </span>
              <div>
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">2nd Prize</p>
                <p className="mt-0.5 text-2xl font-black text-foreground">₹2,000</p>
                <p className="text-[11px] text-muted-foreground">Runner-up reward</p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Winners announced on <span className="text-neon-pink font-semibold">9th Sep 2026 at 4:00 PM</span>
          </p>
        </div>

        <div id="how-it-works" className="relative overflow-hidden panel p-7">
          <h2 className="text-lg font-bold tracking-wide">HOW IT WORKS</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <ul className="space-y-5">
              {STEPS.map((s) => (
                <li key={s.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neon-purple/60 bg-secondary/60">
                    <s.icon className="h-4 w-4 text-neon-purple icon-glow-purple" />
                  </span>
                  <span>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="text-[12px] text-muted-foreground">{s.desc}</p>
                  </span>
                </li>
              ))}
            </ul>
            <img
              src={trophy}
              alt="Golden trophy"
              loading="lazy"
              width={700}
              height={700}
              className="mx-auto w-44"
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="mx-auto max-w-[1240px] px-5 pb-8">
        <div className="panel p-7">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h2 className="flex items-center gap-3 text-lg font-bold tracking-wide">
                LIVE GALLERY
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neon-pink">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-neon-pink icon-glow-pink" />
                  Live
                </span>
              </h2>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Check out the amazing clicks from the fest!
              </p>
            </div>
            <Link
              to="/gallery"
              className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs sm:px-5 sm:py-2.5 sm:text-sm btn-outline-neon"
            >
              View All Photos <ArrowRight className="h-4 w-4 text-neon-purple icon-glow-purple" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {liveGallery.map((p) => (
              <figure key={p.id || p.ticket_number} className="overflow-hidden rounded-xl border border-border">
                <div className="relative">
                  <img
                    src={p.photo_url || p.src}
                    alt={`Fest entry by ${p.display_name || p.name}`}
                    loading="lazy"
                    width={512}
                    height={640}
                    className="h-44 w-full object-cover"
                  />
                </div>
                <figcaption className="bg-panel px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-neon-pink">{p.ticket_number || p.id}</p>
                  <p className="text-[11px] text-muted-foreground">{p.display_name || p.name}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Lucky draw + winner reveal */}
      <section id="winners" className="mx-auto grid max-w-[1240px] gap-5 px-5 pb-8 lg:grid-cols-2">
        <div
          className="flex flex-col items-center gap-6 rounded-2xl border border-neon-gold/30 p-6 sm:flex-row sm:p-7"
          style={{ backgroundImage: "var(--gradient-gold)" }}
        >
          <div>
            <h2 className="text-xl font-bold text-neon-gold">LUCKY DRAW</h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              Every valid entry gets a chance to win!
              <br />
              Winners will be selected randomly.
            </p>
            <button className="mt-6 rounded-lg px-5 py-2.5 text-sm btn-outline-neon">
              VIEW PRIZES
            </button>
          </div>
          <img
            src={goldenTicket}
            alt="Golden lucky draw ticket"
            loading="lazy"
            width={1040}
            height={640}
            className="w-1/2 shrink-0 sm:w-[46%]"
          />
        </div>

        <div className="flex flex-col items-center gap-6 panel p-6 sm:flex-row sm:p-7">
          <div>
            <h2 className="text-xl font-bold tracking-wide">WINNER REVEAL</h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              Winners will be announced on
              <br />
              9th Sep, 2026 at 4:00 PM
            </p>
            <button className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm btn-outline-neon">
              <Bell className="h-4 w-4 text-neon-purple icon-glow-purple" /> NOTIFY ME
            </button>
          </div>
          <img
            src={giftbox}
            alt="Neon gift box"
            loading="lazy"
            width={700}
            height={600}
            className="w-1/2 shrink-0 sm:w-[40%]"
          />
        </div>
      </section>

      {/* Contact strip */}
      <section id="contact" className="mx-auto max-w-[1240px] px-5 pb-8">
        <div className="grid gap-6 divide-border panel px-7 py-6 md:grid-cols-4 md:divide-x">
          <div className="flex items-center gap-4">
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Utkarsh2026-PhotoBooth&bgcolor=ffffff"
              alt="QR code to join the photo booth contest"
              loading="lazy"
              width={64}
              height={64}
              className="h-16 w-16 rounded"
            />
            <div>
              <p className="text-[13px] font-semibold">SCAN &amp; PARTICIPATE</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Scan the QR code at the photo booth and join now!
              </p>
            </div>
          </div>

          <div className="md:pl-7">
            <p className="text-[13px] font-semibold">FOLLOW US</p>
            <div className="mt-3 flex gap-3">
              {[Instagram, Facebook, Youtube].map((I, i) => (
                <a
                  key={i}
                  href="#contact"
                  aria-label="Social link"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neon-purple/60 text-neon-purple transition-colors hover:bg-secondary"
                >
                  <I className="h-4 w-4 icon-glow-purple" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 md:pl-7">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neon-purple/60">
              <Mail className="h-4 w-4 text-neon-purple icon-glow-purple" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">HAVE QUESTIONS?</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Reach out to our team.
                <br />
                info@fest26.com
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 md:pl-7">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neon-purple/60">
              <Send className="h-4 w-4 text-neon-purple icon-glow-purple" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">STAY UPDATED</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Get updates and winner announcements.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact-footer" className="relative px-5 pb-10 text-center">
        <p className="text-[12px] text-muted-foreground">
          © 2026 Fest'26 Photo Booth Contest. All rights reserved.
        </p>
        <Heart className="absolute bottom-12 right-8 hidden h-6 w-6 text-neon-pink icon-glow-pink md:block" />
        <ScanLine className="sr-only" />
      </footer>
    </div>
    </>
  );
}
