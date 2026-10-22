import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { fmtSec } from "@/lib/timers";
import type { BarData, BarRow } from "@/lib/overlayBar";
import Logo from "../Logo";

const SZ = {
  s: { w: "w-[min(560px,92%)]", name: "text-[15px]", sub: "text-[10px]", head: "text-[10px]", score: "w-9 text-xl", flag: "h-[14px] w-[21px]", row: "h-8" },
  m: { w: "w-[min(720px,94%)]", name: "text-[clamp(14px,2.2vw,22px)]", sub: "text-[clamp(9px,1vw,12px)]", head: "text-[clamp(9px,1vw,12px)]", score: "w-[clamp(36px,4vw,52px)] text-[clamp(18px,2.6vw,30px)]", flag: "h-[clamp(14px,1.6vw,20px)] w-[clamp(21px,2.4vw,30px)]", row: "h-[clamp(30px,3.6vw,44px)]" },
  l: { w: "w-[min(1000px,96%)]", name: "text-[clamp(18px,3vw,34px)]", sub: "text-[clamp(10px,1.3vw,16px)]", head: "text-[clamp(10px,1.3vw,16px)]", score: "w-[clamp(44px,5.5vw,72px)] text-[clamp(22px,3.6vw,44px)]", flag: "h-[clamp(18px,2.2vw,28px)] w-[clamp(27px,3.3vw,42px)]", row: "h-[clamp(38px,5vw,60px)]" },
};

function Flag({ src }: { src: string | null }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  if (!src || err) return <span className="block h-full w-full bg-white/10" />;
  return <img src={src} alt="" onError={() => setErr(true)} className="h-full w-full object-cover" />;
}

/** Телевизионная плашка: имена, углы, флаги, счёт. Рисует готовые данные — и в программе, и на странице для OBS. */
export default function OverlayBar({ bar, size, pos, inline }: { bar: BarData; size: "s" | "m" | "l"; pos: "top" | "bottom"; inline?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!bar.timer) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [bar.timer]);
  const left = bar.timer ? Math.max(0, Math.ceil((bar.timer.until - now) / 1000)) : null;
  const z = SZ[size];

  const line = (r: BarRow, side: "blue" | "red") => (
    <div className={cn("flex items-center", z.row, r.win === false && "opacity-55")}>
      <span className={cn("h-full w-[6px] shrink-0", side === "blue" ? "bg-corner-blue" : "bg-corner-red")} />
      <span className={cn("ml-2.5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-white/30", z.flag)}>
        <Flag src={r.flag} />
      </span>
      <span className="ml-2.5 flex min-w-0 flex-1 items-baseline gap-2">
        <span className={cn("truncate font-bold tracking-tight text-white", z.name)}>{r.name}</span>
        {r.sub && <span className={cn("hidden truncate text-white/60 sm:inline", z.sub)}>{r.sub}</span>}
      </span>
      {r.fouls > 0 && (
        <span className="mr-2 flex gap-1">
          {Array.from({ length: r.fouls }, (_, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          ))}
        </span>
      )}
      {r.win && <Icon name="Trophy" size={18} className="mr-2 shrink-0 text-gold" />}
      {r.score != null && (
        <span className={cn("flex h-full shrink-0 items-center justify-center font-mono font-bold tabular-nums", z.score, r.win ? "bg-gold text-navy" : "bg-white/10 text-white")}>{r.score}</span>
      )}
    </div>
  );

  return (
    <div className={cn(inline ? "mx-auto" : "pointer-events-none absolute left-1/2 z-10 -translate-x-1/2", !inline && (pos === "bottom" ? "bottom-[4%]" : "top-[4%]"), z.w)}>
      <div className="animate-fade-in overflow-hidden rounded-[6px] shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
        <div className={cn("flex items-center gap-2 bg-gradient-to-r from-gold to-[hsl(36_60%_42%)] px-2.5 py-1 font-semibold uppercase tracking-wide text-navy", z.head)}>
          {bar.logo && <Logo className="h-[1.6em] w-[1.6em]" />}
          {bar.title && <Icon name="Trophy" size={13} />}
          <span className="min-w-0 flex-1 truncate">{bar.head}</span>
          {bar.extra && <span className="shrink-0 rounded-sm bg-navy/85 px-1.5 text-gold">{bar.extra}</span>}
        </div>
        <div className="divide-y divide-white/10 bg-navy/95">
          {line(bar.blue, "blue")}
          {line(bar.red, "red")}
        </div>
        {(bar.dots || (bar.timer && left != null)) && (
          <div className={cn("flex items-center gap-1.5 bg-black/80 px-2.5 py-1", z.head)}>
            {bar.dots?.map((w, i) => (
              <span key={i} className={cn("h-2 max-w-6 flex-1 rounded-sm", w === "blue" ? "bg-corner-blue" : w === "red" ? "bg-corner-red" : "bg-white/15")} />
            ))}
            {bar.timer && left != null && (
              <span className={cn("ml-auto font-mono font-semibold tabular-nums", left <= 10 ? "text-amber-400" : "text-white")}>
                {bar.timer.label} {left === 0 ? "к столу!" : fmtSec(left)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
