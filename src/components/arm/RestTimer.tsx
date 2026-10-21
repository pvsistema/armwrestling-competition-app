import { useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { TIMER_PRESETS, beep, fmtSec, useTimers } from "@/lib/timers";
import { cn } from "@/lib/utils";

/** Кнопки запуска таймера отдыха на пульте судьи. */
export function TimerControls({ table }: { table: number }) {
  const { start, stop, get } = useTimers();
  const t = get(table);
  return (
    <div className="win flex-row flex-wrap items-center gap-2 px-4 py-2.5">
      <Icon name="Timer" size={18} className="text-primary" />
      <span className="mr-1 text-sm font-medium">Отдых, стол {table}:</span>
      {TIMER_PRESETS.map((p) => (
        <button
          key={p.kind}
          className={cn("pill !py-2", t?.kind === p.kind && !t.done && "pill-on")}
          onClick={() => start(table, p.kind)}
          title={p.hint}
        >
          {p.label}
        </button>
      ))}
      {t && (
        <>
          <span className={cn("ml-2 font-mono text-2xl font-semibold tabular-nums", t.done ? "text-corner-red" : t.left <= 10 ? "text-corner-red" : "text-foreground")}>
            {t.done ? "Время!" : fmtSec(t.left)}
          </span>
          <button className="pill !py-2" onClick={() => stop(table)} title="Остановить таймер">
            <Icon name="Square" size={14} /> Стоп
          </button>
        </>
      )}
      <span className="ml-auto hidden text-xs text-panel-muted xl:inline">Таймер сразу виден на табло. Клавиши: T — 30 сек, Y — 2 мин.</span>
    </div>
  );
}

/** Крупный таймер на табло. size: "lg" — на весь стол, "md" — в клетке стола. */
export function TimerBoard({ table, size = "lg", sound = false }: { table: number; size?: "lg" | "md" | "hero" | "heroSm"; sound?: boolean }) {
  const { get } = useTimers();
  const t = get(table);
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (!sound || !t) return;
    if (t.done && beeped.current !== t.endsAt) {
      beeped.current = t.endsAt;
      beep(3);
    }
  }, [sound, t]);
  if (!t) return null;
  const warn = t.done || t.left <= 10;
  if (size === "hero" || size === "heroSm") {
    const big = size === "hero";
    return (
      <div
        className={cn(
          "flex flex-1 animate-scale-in flex-col items-center justify-center gap-3 rounded-lg border-4 p-4 text-center",
          warn ? "border-corner-red bg-corner-red/10" : "border-primary bg-primary/5",
          t.done && "animate-pulse",
        )}
      >
        <div className={cn("flex items-center gap-2 font-mono uppercase", warn ? "text-corner-red" : "text-primary", big ? "text-xl md:text-3xl" : "text-sm md:text-lg")}>
          <Icon name="Timer" size={big ? 36 : 22} />
          {t.done ? "Время отдыха вышло" : `Отдых ${t.seconds === 30 ? "30 секунд" : "2 минуты"}`}
        </div>
        <div
          className={cn(
            "font-mono font-bold tabular-nums leading-none tracking-tight",
            warn ? "text-corner-red" : "text-foreground",
            big ? "text-[clamp(120px,22vw,340px)]" : "text-[clamp(64px,9vw,170px)]",
          )}
        >
          {fmtSec(t.left)}
        </div>
        <div className={cn("w-full max-w-3xl overflow-hidden rounded-full bg-line", big ? "h-4" : "h-2.5")}>
          <div className={cn("h-full rounded-full transition-[width] duration-200", warn ? "bg-corner-red" : "bg-primary")} style={{ width: `${(1 - t.progress) * 100}%` }} />
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border-2 px-5",
        warn ? "border-corner-red bg-corner-red/10" : "border-primary/40 bg-panel",
        size === "lg" ? "py-3" : "py-1.5",
        t.done && "animate-pulse",
      )}
    >
      <Icon name="Timer" size={size === "lg" ? 40 : 22} className={warn ? "text-corner-red" : "text-primary"} />
      <div className="min-w-0 flex-1">
        <div className={cn("font-medium text-panel-muted", size === "lg" ? "text-lg md:text-2xl" : "text-xs md:text-sm")}>
          {t.done ? "Время отдыха вышло" : `Отдых ${t.seconds === 30 ? "30 секунд" : "2 минуты"}`}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
          <div className={cn("h-full rounded-full transition-[width] duration-200", warn ? "bg-corner-red" : "bg-primary")} style={{ width: `${(1 - t.progress) * 100}%` }} />
        </div>
      </div>
      <div
        className={cn(
          "font-mono font-semibold tabular-nums leading-none",
          warn ? "text-corner-red" : "text-foreground",
          size === "lg" ? "text-[clamp(56px,7vw,120px)]" : "text-[clamp(28px,2.6vw,48px)]",
        )}
      >
        {fmtSec(t.left)}
      </div>
    </div>
  );
}
