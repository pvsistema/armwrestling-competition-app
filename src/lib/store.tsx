import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import {
  AgeGroup,
  Athlete,
  Bracket,
  Hand,
  Match,
  Tournament,
  bracketKey,
  buildNextRound,
  classOf,
  tournamentYear,
  weightClasses,
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

function drawAllInto(s: State): State {
  const year = tournamentYear(s.tournament);
  const byKey: Record<string, string[]> = {};
  for (const a of s.athletes) {
    const c = classOf(a, s.groups, year);
    if (!c) continue;
    for (const h of a.hands) {
      const k = bracketKey(c.key, h);
      (byKey[k] ||= []).push(a.id);
    }
  }
  const existing = new Set(s.brackets.map((b) => b.key));
  let next = { ...s };
  const classes = weightClasses(s.groups);
  const keys = classes.flatMap((c) => (["right", "left"] as Hand[]).map((h) => bracketKey(c.key, h)));
  let tableIdx = s.brackets.length;
  for (const k of keys) {
    if (!byKey[k] || existing.has(k)) continue;
    next = drawOne(next, k, byKey[k], (tableIdx++ % Math.max(1, s.tournament.tables)) + 1);
  }
  return next;
}

function drawOne(s: State, key: string, ids: string[], table: number): State {
  const [classKey, hand] = key.split("|") as [string, Hand];
  const amap = Object.fromEntries(s.athletes.map((a) => [a.id, a]));
  const base: Bracket = { key, classKey, hand, athletes: ids, round: 0, done: false, byes: [], table };
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
  setWinner: (matchId: string, winnerId: string) => void;
  undo: () => void;
  canUndo: boolean;
  resetEmpty: () => void;
  exportData: () => State;
  importData: (data: State) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(initial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);

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
      const year = tournamentYear(p.tournament);
      const [classKey, hand] = key.split("|") as [string, Hand];
      const ids = p.athletes
        .filter((a) => a.hands.includes(hand) && classOf(a, p.groups, year)?.key === classKey)
        .map((a) => a.id);
      if (!ids.length) return p;
      const existing = p.brackets.find((b) => b.key === key);
      const table = existing?.table ?? (p.brackets.length % Math.max(1, p.tournament.tables)) + 1;
      return drawOne(p, key, ids, table);
    });
  }, []);

  const drawAll = useCallback(() => setS((p) => drawAllInto(p)), []);

  const clearDraw = useCallback((key?: string) => {
    setS((p) =>
      key
        ? { ...p, brackets: p.brackets.filter((b) => b.key !== key), matches: p.matches.filter((m) => m.key !== key) }
        : { ...p, brackets: [], matches: [], order: 1 },
    );
  }, []);

  const setWinner = useCallback((matchId: string, winnerId: string) => {
    setS((p) => {
      const m = p.matches.find((x) => x.id === matchId);
      if (!m || m.winner) return p;
      let matches = p.matches.map((x) => (x.id === matchId ? { ...x, winner: winnerId, decidedAt: Date.now() } : x));
      let brackets = p.brackets;
      let order = p.order;
      const b = p.brackets.find((x) => x.key === m.key);
      if (b) {
        const roundOpen = matches.some((x) => x.key === b.key && x.round === b.round && !x.winner);
        if (!roundOpen) {
          const amap = Object.fromEntries(p.athletes.map((a) => [a.id, a]));
          const res = buildNextRound(b, matches, amap, order);
          brackets = p.brackets.map((x) => (x.key === b.key ? res.bracket : x));
          matches = [...matches, ...res.newMatches];
          order += res.newMatches.length;
        }
      }
      return { ...p, matches, brackets, order };
    });
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
      const matches = p.matches
        .filter((m) => !(m.key === L.key && m.round > L.round))
        .map((m) => (m.id === L.id ? { ...m, winner: null, decidedAt: undefined } : m));
      const brackets = p.brackets.map((b) =>
        b.key === L.key ? { ...b, round: L.round, done: false, byes: b.byes.filter((y) => y.round <= L.round) } : b,
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
