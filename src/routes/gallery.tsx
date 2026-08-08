import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Search, Camera } from "lucide-react";
import utkarshLogoFont from "@/assets/utkarsh-logo-font.jpg";
import { getGallery, createEntry } from "@/lib/server-fns";
import { localStore } from "@/lib/local-store";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Live Gallery | Utkarsh 2026 Photo Booth Contest" },
      { name: "description", content: "Browse all photos uploaded for the Utkarsh 2026 Photo Booth Contest." },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhotos = async () => {
    const res = await getGallery({ data: { page: 1, perPage: 100 } });
    if (res.success && res.items && res.items.length > 0) {
      setPhotos(res.items);
    } else {
      // Local fallback
      const local = localStore.getEntries().map((e) => ({
        id: e.id,
        ticket_number: e.ticket_number,
        photo_url: e.photo_url,
        display_name: e.display_name,
        submitted_at: e.submitted_at,
      }));
      setPhotos(local);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const photoUrl = evt.target?.result as string;
      const ticketNum = localStore.getNextTicketNumber();

      await createEntry({
        data: {
          student_id: `guest_${Date.now()}`,
          ticket_number: ticketNum,
          photo_path: photoUrl,
          display_name: "You",
          college_name: "Fest Participant",
        },
      });

      loadPhotos();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filtered = photos.filter(
    (p) =>
      (p.display_name || p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.ticket_number || p.id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={utkarshLogoFont}
              alt="Utkarsh 2026"
              className="h-7 w-auto object-contain [filter:invert(1)_brightness(3)_contrast(500%)] mix-blend-screen"
            />
          </Link>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 ml-4">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search by name or ticket number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold btn-neon"
          >
            <Upload className="h-4 w-4 icon-glow-pink" />
            Upload Photo
          </button>

          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs btn-outline-neon"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden border-b border-border/30 bg-background px-5 py-10 text-center">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-neon-purple/15 blur-[80px]" />
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          LIVE{" "}
          <span className="text-gradient font-script text-4xl font-normal sm:text-5xl">
            Gallery
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {photos.length} photos uploaded · celebrating every click from the fest
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neon-pink/40 px-3 py-1 text-xs font-medium text-neon-pink">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-pink icon-glow-pink" />
          Live · updates in real-time
        </span>
      </div>

      {/* ── Grid ── */}
      <main className="mx-auto max-w-[1240px] px-5 py-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
            <Camera className="h-12 w-12 opacity-30" />
            <p className="text-sm">No photos found for "<span className="text-foreground">{search}</span>"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((p) => (
              <figure
                key={p.id || p.ticket_number}
                className="group overflow-hidden rounded-xl border border-border bg-panel transition-transform hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(255,0,87,0.18)]"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={p.photo_url || p.src}
                    alt={`Fest entry by ${p.display_name || p.name}`}
                    loading="lazy"
                    width={512}
                    height={640}
                    className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <figcaption className="px-3 py-2.5">
                  <p className="text-[12px] font-semibold text-neon-pink">{p.ticket_number || p.id}</p>
                  <p className="text-[11px] text-muted-foreground">{p.display_name || p.name}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* Upload CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-neon-pink/30 bg-secondary/30 p-8 text-center">
          <Camera className="h-10 w-10 text-neon-pink icon-glow-pink" />
          <div>
            <p className="text-lg font-bold">Add your photo to the gallery!</p>
            <p className="mt-1 text-sm text-muted-foreground">One photo per person. Make it your best shot.</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold btn-neon"
          >
            <Upload className="h-4 w-4 icon-glow-pink" />
            Upload Your Photo
          </button>
        </div>
      </main>
    </div>
  );
}
