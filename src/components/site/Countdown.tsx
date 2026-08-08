import { useEffect, useState } from "react";

const TARGET = new Date("2026-09-09T16:00:00+05:30").getTime();

export function useCountdown() {
  const [left, setLeft] = useState({ days: 2, hours: 15, minutes: 47, seconds: 30 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, TARGET - Date.now());
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return left;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CountdownBoxes() {
  const t = useCountdown();
  const items = [
    { v: t.days, l: "DAYS" },
    { v: t.hours, l: "HOURS" },
    { v: t.minutes, l: "MINUTES" },
    { v: t.seconds, l: "SECONDS" },
  ];
  return (
    <div className="flex gap-3">
      {items.map((i) => (
        <div
          key={i.l}
          className="w-[68px] rounded-xl border border-neon-purple/60 bg-panel/70 py-2.5 text-center glow-ring"
        >
          <div className="text-2xl font-bold text-neon-pink">{pad(i.v)}</div>
          <div className="mt-0.5 text-[9px] tracking-widest text-muted-foreground">{i.l}</div>
        </div>
      ))}
    </div>
  );
}

export { pad };
