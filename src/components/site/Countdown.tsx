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

interface CountdownBoxesProps {
  className?: string;
  compact?: boolean;
}

export function CountdownBoxes({ className = "", compact = false }: CountdownBoxesProps) {
  const t = useCountdown();
  const items = [
    { v: t.days, l: "DAYS" },
    { v: t.hours, l: "HOURS" },
    { v: t.minutes, l: "MINUTES" },
    { v: t.seconds, l: "SECONDS" },
  ];

  const boxClassName = compact
    ? "w-[48px] rounded-lg border border-neon-purple/60 bg-panel/70 py-1.5 text-center glow-ring"
    : "w-[68px] rounded-xl border border-neon-purple/60 bg-panel/70 py-2.5 text-center glow-ring";

  const labelClassName = compact ? "mt-0.5 text-[7px] tracking-widest text-muted-foreground" : "mt-0.5 text-[9px] tracking-widest text-muted-foreground";
  const valueClassName = compact ? "text-lg font-bold text-neon-pink" : "text-2xl font-bold text-neon-pink";

  return (
    <div className={`flex gap-3 ${className}`.trim()}>
      {items.map((i) => (
        <div
          key={i.l}
          className={boxClassName}
        >
          <div className={valueClassName}>{pad(i.v)}</div>
          <div className={labelClassName}>{i.l}</div>
        </div>
      ))}
    </div>
  );
}

export { pad };
