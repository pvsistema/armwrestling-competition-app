import { createContext, useCallback, useContext, useEffect, useMemo, useRef,
  useState, ReactNode } from "react";
import {
  AgeGroup,
  Athlete,
  Bracket,
  Hand,
  Match,
  OutReason,
  Tournament,
  WinHow,
  bracketKey,
  buildNextRound,
  entryClasses,
  systemFor,
  uid,
  weightClasses,
  HAND_ORDER,
} from "./arm";
import { DEFAULT_GROUPS, DEFAULT_TOURNAMENT, LEGACY_DEMO_NAMES, LEGACY_DEMO_TOURNAMENT } from "./demo";

export interface State {
  tournament: Tournament;
  groups: AgeGroup[];
  athletes: Athlete[];
  brackets: Bracket[];
  matches: (Match & { decidedAt?: number })[];
  order: number;
}

const KEY = "armsport-v1";

type SM = Match & { decidedAt?: number };

/** Участники по сеткам: своя весовая категория (с провесом и заявкой выше) + абсолютная. */
// eslint-disable-next-line react-refresh/only-export-components
export function poolsOf(s: Pick<State, "athletes" | "groups" | "tournament">): Record<string, string[]> {
  const byKey: Record<string, string[]> = {};
  for (const a of s.athletes)
    for (const c of entryClasses(a, s.groups, s.tournament))
      for (const h of a.hands) (byKey[bracketKey(c.key, h)] ||= []).push(a.id);
  return byKey;
}

/** Автоматически засчитывает поражения снятым спортсменам и строит следующие туры. */
function settle(p: State): State {
  const out = new Set(p.athletes.filter((a) => a.out).map((a) => a.id));
  const amap = Object.fromEntries(p.athletes.map((a) => [a.id, a]));
  let { matches, brackets, order } = p;
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    matches = matches.map((m) => {
      if (m.winner || (!out.has(m.a) && !out.has(m.b))) return m;
      changed = true;
      const w = out.has(m.a) ? m.b : m.a;
      return { ...m, winner: w, how: "wo" as WinHow, decidedAt: Date.now() };
    });
    brackets = brackets.map((b) => {
      if (b.done) return b;
      const open = matches.some((x) => x.key === b.key && !x.winner && x.group !== "X");
      if (open) return b;
      const res = buildNextRound(b, matches, amap, order);
      if (res.newMatches.length || res.bracket.done !== b.done || res.bracket.round !== b.round) changed = true;
      matches = [...matches, ...res.newMatches];
      order += res.newMatches.length;
      return res.bracket;
    });
    if (!changed) break;
  }
  return { ...p, matches, brackets, order };
}

/** Стол для категории: обе руки одной весовой — на одном столе; новая категория — на наименее загруженный. */
function tableFor(s: State, key: string): number {
  const n = Math.max(1, s.tournament.tables);
  const classKey = key.split("|")[0];
  const same = s.brackets.find((b) => b.key === key) ?? s.brackets.find((b) => b.classKey === classKey);
  if (same && same.table <= n) return same.table;
  const load = Array.from({ length: n }, () => 0);
  for (const b of s.brackets) if (b.table <= n) load[b.table - 1] += b.athletes.length;
  let best = 0;
  for (let i = 1; i < n; i++) if (load[i] < load[best]) best = i;
  return best + 1;
}

function drawAllInto(s: State): State {
  const byKey = poolsOf(s);
  const existing = new Set(s.brackets.map((b) => b.key));
  let next = { ...s };
  const classes = weightClasses(s.groups)
    .filter((c) => HAND_ORDER.some((h) => byKey[bracketKey(c.key, h)]))
    .sort((a, b) => {
      const sz = (k: string) => Math.max(...HAND_ORDER.map((h) => byKey[bracketKey(k, h)]?.length ?? 0));
      return sz(b.key) - sz(a.key);
    });
  for (const c of classes)
    for (const h of HAND_ORDER) {
      const k = bracketKey(c.key, h);
      if (!byKey[k] || existing.has(k)) continue;
      next = drawOne(next, k, byKey[k], tableFor(next, k));
    }
  return next;
}

function drawOne(s: State, key: string, ids: string[], table: number): State {
  const [classKey, hand] = key.split("|") as [string, Hand];
  const amap = Object.fromEntries(s.athletes.map((a) => [a.id, a]));
  const base: Bracket = {
    key,
    classKey,
    hand,
    athletes: ids,
    round: 0,
    done: false,
    byes: [],
    table,
    system: systemFor(s.tournament, ids.length),
    third: s.tournament.olympicThird ?? true,
  };
  const others = s.matches.filter((m) => m.key !== key);
  const { bracket, newMatches } = buildNextRound(base, [], amap, s.order);
  return {
    ...s,
    brackets: [...s.brackets.filter((b) => b.key !== key), bracket],
    matches: [...others, ...newMatches],
    order: s.order + newMatches.length,
  };
}

function initial(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      let st = JSON.parse(raw) as State;
      const L = LEGACY_DEMO_TOURNAMENT;
      const t = st.tournament;
      if (t.name === L.name || t.date === L.date || t.place === L.place)
        st = {
          ...st,
          tournament: {
            ...t,
            name: t.name === L.name ? "" : t.name,
            date: t.date === L.date ? "" : t.date,
            place: t.place === L.place ? "" : t.place,
          },
        };
      const onlyDemo = st.athletes.length > 0 && st.athletes.every((a) => LEGACY_DEMO_NAMES.has(a.name));
      if (onlyDemo) return { ...st, athletes: [], brackets: [], matches: [], order: 1 };
      return st;
    }
  } catch {
    /* ignore */
  }
  return emptyState();
}

function emptyState(): State {
  return {
    tournament: DEFAULT_TOURNAMENT,
    groups: DEFAULT_GROUPS,
    athletes: [],
    brackets: [],
    matches: [],
    order: 1,
  };
}

interface Ctx extends State {
  amap: Record<string, Athlete>;
  addAthlete: (a: Omit<Athlete, "id">) => void;
  addAthletes: (list: Omit<Athlete, "id">[]) => void;
  updateAthlete: (id: string, patch: Partial<Athlete>) => void;
  removeAthlete: (id: string) => void;
  setGroups: (g: AgeGroup[]) => void;
  setTournament: (t: Partial<Tournament>) => void;
  draw: (key: string) => void;
  drawAll: () => void;
  clearDraw: (key?: string) => void;
  setWinner: (matchId: string, winnerId: string, how?: WinHow) => void;
  setBracketTable: (classKey: string, table: number) => void;
  addPen: (matchId: string, athleteId: string, kind: "r" | "f", delta?: 1 | -1) => void;
  callMatch: (matchId: string, on?: boolean) => void;
  withdraw: (athleteId: string, reason: OutReason | null) => void;
  addDecider: (classKey: string, x: string, y: string) => string | null;
  undo: () => void;
  canUndo: boolean;
  resetEmpty: () => void;
  exportData: () => State;
  importData: (data: State) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);

  const firstSave = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      if (firstSave.current) firstSave.current = false;
      else localStorage.setItem(`${KEY}:changedAt`, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [s]);

  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        setS(JSON.parse(e.newValue) as State);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const amap = useMemo(() => Object.fromEntries(s.athletes.map((a) => [a.id, a])), [s.athletes]);

  const addAthlete = useCallback(
    (a: Omit<Athlete, "id">) =>
      setS((p) => ({ ...p, athletes: [...p.athletes, { ...a, id: Math.random().toString(36).slice(2, 10) }] })),
    [],
  );
  const addAthletes = useCallback(
    (list: Omit<Athlete, "id">[]) =>
      setS((p) => ({
        ...p,
        athletes: [...p.athletes, ...list.map((a) => ({ ...a, id: Math.random().toString(36).slice(2, 10) }))],
      })),
    [],
  );
  const updateAthlete = useCallback(
    (id: string, patch: Partial<Athlete>) =>
      setS((p) => ({ ...p, athletes: p.athletes.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    [],
  );
  const removeAthlete = useCallback(
    (id: string) => setS((p) => ({ ...p, athletes: p.athletes.filter((a) => a.id !== id) })),
    [],
  );
  const setGroups = useCallback((groups: AgeGroup[]) => setS((p) => ({ ...p, groups })), []);
  const setTournament = useCallback(
    (t: Partial<Tournament>) => setS((p) => ({ ...p, tournament: { ...p.tournament, ...t } })),
    [],
  );

  const draw = useCallback((key: string) => {
    setS((p) => {
      const ids = poolsOf(p)[key] ?? [];
      if (!ids.length) return p;
      const table = tableFor(p, key);
      return settle(drawOne(p, key, ids, table));
    });
  }, []);

  const drawAll = useCallback(() => setS((p) => settle(drawAllInto(p))), []);

  const clearDraw = useCallback((key?: string) => {
    setS((p) =>
      key
        ? { ...p, brackets: p.brackets.filter((b) => b.key !== key), matches: p.matches.filter((m) => m.key !== key) }
        : { ...p, brackets: [], matches: [], order: 1, tournament: { ...p.tournament, secondHandOpen: false } },
    );
  }, []);

  const setWinner = useCallback((matchId: string, winnerId: string, how: WinHow = "pin") => {
    setS((p) => {
      const m = p.matches.find((x) => x.id === matchId);
      if (!m || m.winner) return p;
      const matches = p.matches.map((x) =>
        x.id === matchId ? { ...x, winner: winnerId, decidedAt: Date.now(), how, calledAt: undefined } : x,
      );
      return settle({ ...p, matches });
    });
  }, []);

  const setBracketTable = useCallback((classKey: string, table: number) => {
    setS((p) => ({
      ...p,
      brackets: p.brackets.map((b) => (b.classKey === classKey ? { ...b, table } : b)),
      matches: p.matches.map((m) => (m.key.startsWith(`${classKey}|`) && !m.winner ? { ...m, table } : m)),
    }));
  }, []);

  const addPen = useCallback((matchId: string, athleteId: string, kind: "r" | "f", delta: 1 | -1 = 1) => {
    setS((p) => {
      const m = p.matches.find((x) => x.id === matchId);
      if (!m || m.winner) return p;
      const cur = m.pen?.[athleteId] ?? { r: 0, f: 0 };
      const next = { ...cur, [kind]: Math.max(0, cur[kind] + delta) };
      const pen = { ...(m.pen ?? {}), [athleteId]: next };
      const fouls = next.f + Math.floor(next.r / 2);
      if (fouls >= 2) {
        const w = athleteId === m.a ? m.b : m.a;
        const matches = p.matches.map((x) =>
          x.id === matchId ? { ...x, pen, winner: w, how: "foul" as WinHow, decidedAt: Date.now(), calledAt: undefined } : x,
        );
        return settle({ ...p, matches });
      }
      return { ...p, matches: p.matches.map((x) => (x.id === matchId ? { ...x, pen } : x)) };
    });
  }, []);

  const callMatch = useCallback((matchId: string, on = true) => {
    setS((p) => ({
      ...p,
      matches: p.matches.map((x) => (x.id === matchId ? { ...x, calledAt: on ? Date.now() : undefined } : x)),
    }));
  }, []);

  const withdraw = useCallback((athleteId: string, reason: OutReason | null) => {
    setS((p) => {
      const athletes = p.athletes.map((a) =>
        a.id === athleteId ? { ...a, out: reason ? { reason, at: Date.now() } : undefined } : a,
      );
      return settle({ ...p, athletes });
    });
  }, []);

  const addDecider = useCallback((classKey: string, x: string, y: string) => {
    let hand: Hand | null = null;
    setS((p) => {
      const exists = p.matches.some(
        (m) => m.group === "X" && m.key.startsWith(`${classKey}|`) && ((m.a === x && m.b === y) || (m.a === y && m.b === x)),
      );
      if (exists) return p;
      const own = p.brackets.filter((b) => b.classKey === classKey);
      if (!own.length) return p;
      const b = own[Math.floor(Math.random() * own.length)];
      hand = b.hand;
      const m: SM = {
        id: uid(),
        key: b.key,
        round: 99,
        group: "X",
        a: x,
        b: y,
        winner: null,
        order: p.order,
        table: b.table,
      };
      return { ...p, matches: [...p.matches, m], order: p.order + 1 };
    });
    return hand;
  }, []);

  const lastDecided = useMemo(() => {
    let best: (typeof s.matches)[number] | null = null;
    for (const m of s.matches) if (m.winner && (!best || (m.decidedAt ?? 0) > (best.decidedAt ?? 0))) best = m;
    return best;
  }, [s]);

  const undo = useCallback(() => {
    setS((p) => {
      let last: (typeof p.matches)[number] | null = null;
      for (const m of p.matches) if (m.winner && (!last || (m.decidedAt ?? 0) > (last.decidedAt ?? 0))) last = m;
      if (!last) return p;
      const L = last;
      const lb = p.brackets.find((b) => b.key === L.key);
      const rr = lb?.system === "roundrobin";
      const x = L.group === "X";
      let pen = L.pen;
      if (L.how === "foul" && pen) {
        const off = L.winner === L.a ? L.b : L.a;
        const c = pen[off] ?? { r: 0, f: 0 };
        pen = { ...pen, [off]: c.f > 0 ? { ...c, f: c.f - 1 } : { ...c, r: Math.max(0, c.r - 1) } };
      }
      const matches = p.matches
        .filter((m) => x || rr || !(m.key === L.key && m.round > L.round && m.group !== "X"))
        .map((m) => (m.id === L.id ? { ...m, winner: null, decidedAt: undefined, how: undefined, pen } : m));
      const brackets = x
        ? p.brackets
        : p.brackets.map((b) =>
            b.key === L.key
              ? { ...b, round: rr ? b.round : L.round, done: false, byes: rr ? b.byes : b.byes.filter((y) => y.round <= L.round) }
              : b,
          );
      return { ...p, matches, brackets };
    });
  }, []);

  const resetEmpty = useCallback(
    () =>
      setS((p) => ({
        tournament: { ...DEFAULT_TOURNAMENT, tables: p.tournament.tables },
        groups: p.groups,
        athletes: [],
        brackets: [],
        matches: [],
        order: 1,
      })),
    [],
  );

  const exportData = useCallback(() => s, [s]);
  const importData = useCallback((data: State) => setS(data), []);

  const value: Ctx = {
    ...s,
    amap,
    addAthlete,
    addAthletes,
    updateAthlete,
    removeAthlete,
    setGroups,
    setTournament,
    draw,
    drawAll,
    clearDraw,
    setWinner,
    setBracketTable,
    addPen,
    callMatch,
    withdraw,
    addDecider,
    undo,
    canUndo: !!lastDecided,
    resetEmpty,
    exportData,
    importData,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useClassMap() {
  const { groups } = useStore();
  return useMemo(() => Object.fromEntries(weightClasses(groups).map((c) => [c.key, c])), [groups]);
}
