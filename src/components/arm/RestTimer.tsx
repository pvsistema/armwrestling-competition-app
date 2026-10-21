import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Icon from "@/components/ui/icon";
import { beep, restPresets, shortLabel, fmtSec, lastCustomRest, restLabel, saveCustomRest, useTimers } from "@/lib/timers";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

/** Кнопки запуска таймера отдыха на пульте судьи. */
export function TimerControls({ table }: { table: number }) {
  const { start, stop, get } = useTimers();
  const { tournament } = useStore();
  const presets = restPresets(tournament);
  const t = get(table);
  return (
    <div className="win flex-row flex-wrap items-center gap-2 px-3 py-1.5">
      <Icon name="Timer" size={18} className="text-primary" />
      <span className="mr-1 text-sm font-medium">Отдых, стол {table}:</span>
      {presets.map((p) => (
        <button
          key={p.kind}
          className={cn("pill !py-1.5", t?.kind === p.kind && !t.done && "pill-on")}
          onClick={() => start(table, p.kind, p.seconds)}
          title={p.hint}
        >
          {p.label}
        </button>
      ))}
      <CustomRest table={table} active={t?.kind === "custom" && !t.done} onStart={(sec) => start(table, "custom", sec)} />
      {t && (
        <>
          <span className={cn("ml-2 font-mono text-2xl font-semibold tabular-nums", t.done ? "text-corner-red" : t.left <= 10 ? "text-corner-red" : "text-foreground")}>
            {t.done ? "Время!" : fmtSec(t.left)}
          </span>
          <button className="pill !py-1.5" onClick={() => stop(table)} title="Остановить таймер">
            <Icon name="Square" size={14} /> Стоп
          </button>
        </>
      )}
      <span className="ml-auto hidden text-xs text-panel-muted xl:inline">Таймер сразу виден на табло. Клавиши: T — {presets[0].label}, Y — {presets[1].label}, U — свой, F1 — памятка.</span>
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
          {t.done ? "Время отдыха вышло" : `Отдых ${restLabel(t.seconds)}`}
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
          {t.done ? "Время отдыха вышло" : `Отдых ${restLabel(t.seconds)}`}
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

const QUICK = [15, 45, 60, 90, 180, 300];

function CustomRest({ table, active, onStart }: { table: number; active: boolean; onStart: (sec: number) => void }) {
  const [open, setOpen] = useState(false);
  const init = lastCustomRest();
  const [min, setMin] = useState(String(Math.floor(init / 60)));
  const [sec, setSec] = useState(String(init % 60));

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(`custom-rest-${table}`, on);
    return () => window.removeEventListener(`custom-rest-${table}`, on);
  }, [table]);

  const total = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  const go = (s: number) => {
    if (s < 5) return;
    saveCustomRest(s);
    onStart(s);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("pill !py-1.5", active && "pill-on")} title="Задать любое время отдыха">
          <Icon name="SlidersHorizontal" size={14} /> Свой
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="mb-2 text-sm font-medium">Свой отдых, стол {table}</div>
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          {QUICK.map((q) => (
            <button key={q} className="pill !justify-center !px-2 !py-1.5 text-sm" onClick={() => go(q)}>
              {shortLabel(q)}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go(total);
          }}
        >
          <label className="flex flex-col text-xs text-panel-muted">
            мин
            <input
              autoFocus
              inputMode="numeric"
              className="mt-1 w-14 rounded-md border border-line bg-panel px-2 py-1.5 text-center font-mono text-lg text-foreground"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <span className="pb-2 font-mono text-lg">:</span>
          <label className="flex flex-col text-xs text-panel-muted">
            сек
            <input
              inputMode="numeric"
              className="mt-1 w-14 rounded-md border border-line bg-panel px-2 py-1.5 text-center font-mono text-lg text-foreground"
              value={sec}
              onChange={(e) => setSec(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
          </label>
          <button type="submit" className="btn-blue ml-auto !py-2" disabled={total < 5}>
            <Icon name="Play" size={15} /> Старт
          </button>
        </form>
        <p className="mt-2 text-[11px] text-panel-muted">Время запомнится — в следующий раз будет подставлено само.</p>
      </PopoverContent>
    </Popover>
  );
}
