import { useCallback, useEffect, useMemo, useState } from "react";
import { Match } from "./arm";
import { pendingQueue } from "./queue";
import { beep } from "./timers";

const KEY = "armsport-stall";
export const STALL_LIMIT_MS = 3 * 60 * 1000;

type Mark = { id: string; since: number; beeped?: boolean };
type All = Record<string, Mark>;

const read = (): All => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as All;
  } catch {
    return {};
  }
};
const write = (a: All) => localStorage.setItem(KEY, JSON.stringify(a));

export interface Stall {
  table: number;
  match: Match;
  since: number;
  ms: number;
}

/** Следит, сколько текущая пара стоит у каждого стола без результата. */
export function useStallWatch(matches: Match[], tables: number, tour?: Parameters<typeof pendingQueue>[2]) {
  const [now, setNow] = useState(Date.now());
  const [marks, setMarks] = useState<All>(read);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  const current = useMemo(() => {
    const res: Record<number, Match> = {};
    for (let t = 1; t <= Math.max(1, tables); t++) {
      const m = pendingQueue(matches, t, tour)[0];
      if (m) res[t] = m;
    }
    return res;
  }, [matches, tables, tour]);

  useEffect(() => {
    const prev = read();
    const next: All = {};
    let changed = false;
    for (const [t, m] of Object.entries(current)) {
      if (prev[t]?.id === m.id) next[t] = prev[t];
      else {
        next[t] = { id: m.id, since: Date.now() };
        changed = true;
      }
    }
    if (changed || Object.keys(prev).length !== Object.keys(next).length) {
      write(next);
      setMarks(next);
    }
  }, [current]);

  const stalls: Stall[] = useMemo(
    () =>
      Object.entries(current)
        .map(([t, m]) => {
          const mk = marks[t];
          const since = mk?.id === m.id ? mk.since : now;
          return { table: +t, match: m, since, ms: now - since };
        })
        .filter((s) => s.ms >= STALL_LIMIT_MS),
    [current, marks, now],
  );

  useEffect(() => {
    const fresh = stalls.filter((s) => !marks[s.table]?.beeped);
    if (!fresh.length) return;
    beep(2);
    const next = { ...marks };
    fresh.forEach((s) => (next[s.table] = { ...next[s.table], beeped: true }));
    write(next);
    setMarks(next);
  }, [stalls, marks]);

  const snooze = useCallback(
    (table: number) => {
      const next = { ...read() };
      if (next[table]) next[table] = { ...next[table], since: Date.now(), beeped: false };
      write(next);
      setMarks(next);
      setNow(Date.now());
    },
    [],
  );

  return { stalls, snooze };
}

export const fmtMin = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
