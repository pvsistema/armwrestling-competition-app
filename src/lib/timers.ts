import { useCallback, useEffect, useState } from "react";

const KEY = "armsport-timers";

export interface TableTimer {
  kind: "rest30" | "rest120" | "custom";
  seconds: number;
  endsAt: number;
  label: string;
}
type All = Record<string, TableTimer>;

export const TIMER_PRESETS: { kind: TableTimer["kind"]; seconds: number; label: string; hint: string }[] = [
  { kind: "rest30", seconds: 30, label: "30 сек", hint: "Отдых после ситуации в поединке" },
  { kind: "rest120", seconds: 120, label: "2 мин", hint: "Отдых между схватками и выход к столу" },
];

function read(): All {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}") as All;
    const now = Date.now();
    for (const k of Object.keys(all)) if (all[k].endsAt < now - 15000) delete all[k];
    return all;
  } catch {
    return {};
  }
}

function write(all: All) {
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

/** Таймеры отдыха по столам — общие для пульта судьи и окна табло. */
export function useTimers() {
  const [all, setAll] = useState<All>(read);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY) setAll(read());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const active = Object.values(all).some((t) => t.endsAt > now - 15000);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);

  const start = useCallback((table: number, kind: TableTimer["kind"], customSec?: number) => {
    const p = TIMER_PRESETS.find((x) => x.kind === kind);
    const seconds = customSec != null ? Math.max(5, Math.min(3600, Math.round(customSec))) : p!.seconds;
    const next = { ...read(), [table]: { kind, seconds, endsAt: Date.now() + seconds * 1000, label: p?.hint ?? "Свой отдых" } };
    write(next);
    setAll(next);
    setNow(Date.now());
  }, []);

  const stop = useCallback((table: number) => {
    const next = read();
    delete next[table];
    write(next);
    setAll(next);
  }, []);

  const get = useCallback(
    (table: number) => {
      const t = all[table];
      if (!t) return null;
      const left = Math.ceil((t.endsAt - now) / 1000);
      if (left < -10) return null;
      return { ...t, left: Math.max(0, left), done: left <= 0, progress: Math.min(1, Math.max(0, 1 - (t.endsAt - now) / (t.seconds * 1000))) };
    },
    [all, now],
  );

  return { start, stop, get };
}

/** Длительности отдыха из настроек турнира (по умолчанию 30 сек и 2 мин). */
export function restPresets(t: { restShort?: number; restLong?: number }) {
  const short = t.restShort && t.restShort >= 5 ? t.restShort : 30;
  const long = t.restLong && t.restLong >= 5 ? t.restLong : 120;
  return TIMER_PRESETS.map((p) => {
    const seconds = p.kind === "rest30" ? short : long;
    return { ...p, seconds, label: shortLabel(seconds) };
  });
}

export function shortLabel(sec: number) {
  if (sec < 60) return `${sec} сек`;
  return sec % 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : `${sec / 60} мин`;
}

const CKEY = "armsport-custom-rest";
export const lastCustomRest = () => {
  const n = parseInt(localStorage.getItem(CKEY) || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
};
export const saveCustomRest = (s: number) => localStorage.setItem(CKEY, String(s));

/** «60 секунд», «2 минуты», «1 мин 30 сек». */
export function restLabel(sec: number) {
  if (sec < 60) return `${sec} ${plural(sec, "секунда", "секунды", "секунд")}`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!s) return `${m} ${plural(m, "минута", "минуты", "минут")}`;
  return `${m} мин ${s} сек`;
}
function plural(n: number, one: string, few: string, many: string) {
  const a = n % 100;
  const b = n % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

let ctx: AudioContext | null = null;
export function beep(times = 3) {
  try {
    ctx ||= new AudioContext();
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o.start(t0);
      o.stop(t0 + 0.3);
    }
  } catch {
    /* звук недоступен */
  }
}
