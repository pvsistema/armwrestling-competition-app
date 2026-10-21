export type Hand = "right" | "left";
export type Gender = "M" | "F";

export interface Athlete {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number;
  weight: number | null;
  club: string;
  city: string;
  hands: Hand[];
}

export interface AgeGroup {
  id: string;
  name: string;
  gender: Gender;
  ageMin: number;
  ageMax: number;
  limits: number[];
}

export type MatchGroup = "A" | "B" | "F" | "SF";

export interface Match {
  id: string;
  key: string;
  round: number;
  group: MatchGroup;
  a: string;
  b: string;
  winner: string | null;
  order: number;
  table: number;
}

export interface Bye {
  round: number;
  id: string;
  group: "A" | "B";
}

export interface Bracket {
  key: string;
  classKey: string;
  hand: Hand;
  athletes: string[];
  round: number;
  done: boolean;
  byes: Bye[];
  table: number;
}

export interface Tournament {
  name: string;
  date: string;
  place: string;
  tables: number;
  chiefJudge: string;
  secretary: string;
}

export interface WeightClass {
  key: string;
  groupId: string;
  gender: Gender;
  groupName: string;
  limit: number | null;
  prev: number;
  label: string;
}

export const HAND_LABEL: Record<Hand, string> = { right: "правая", left: "левая" };
export const GENDER_LABEL: Record<Gender, string> = { M: "Мужчины", F: "Женщины" };
export const GROUP_LABEL: Record<MatchGroup, string> = {
  A: "основная",
  B: "утешительная",
  F: "финал",
  SF: "суперфинал",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function fmtKg(w: number | null | undefined) {
  if (w == null) return "—";
  return w.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function surname(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function tournamentYear(t: Tournament) {
  const y = parseInt(t.date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

export function weightClasses(groups: AgeGroup[]): WeightClass[] {
  const res: WeightClass[] = [];
  for (const g of groups) {
    const limits = [...g.limits].sort((a, b) => a - b);
    limits.forEach((l, i) => {
      res.push({
        key: `${g.id}:${l}`,
        groupId: g.id,
        gender: g.gender,
        groupName: g.name,
        limit: l,
        prev: i === 0 ? 0 : limits[i - 1],
        label: `до ${l} кг`,
      });
    });
    const last = limits[limits.length - 1] ?? 0;
    res.push({
      key: `${g.id}:plus`,
      groupId: g.id,
      gender: g.gender,
      groupName: g.name,
      limit: null,
      prev: last,
      label: `${last}+ кг`,
    });
  }
  return res;
}

export function classOf(a: Athlete, groups: AgeGroup[], year: number): WeightClass | null {
  if (a.weight == null) return null;
  const age = year - a.birthYear;
  const g = groups.find((g) => g.gender === a.gender && age >= g.ageMin && age <= g.ageMax);
  if (!g) return null;
  const classes = weightClasses([g]);
  return classes.find((c) => c.limit == null || a.weight! <= c.limit) ?? null;
}

export function bracketKey(classKey: string, hand: Hand) {
  return `${classKey}|${hand}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Standing {
  id: string;
  wins: number;
  losses: number;
  elimRound: number | null;
}

export function standings(bracket: Bracket, matches: Match[]): Record<string, Standing> {
  const st: Record<string, Standing> = {};
  bracket.athletes.forEach((id) => (st[id] = { id, wins: 0, losses: 0, elimRound: null }));
  matches
    .filter((m) => m.key === bracket.key && m.winner)
    .sort((x, y) => x.order - y.order)
    .forEach((m) => {
      const loser = m.winner === m.a ? m.b : m.a;
      if (st[m.winner!]) st[m.winner!].wins++;
      if (st[loser]) {
        st[loser].losses++;
        if (st[loser].losses >= 2) st[loser].elimRound = m.round;
      }
    });
  return st;
}

interface PairCtx {
  met: Set<string>;
  clubs: Record<string, string>;
  separateClubs: boolean;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function pairUp(ids: string[], ctx: PairCtx): [string, string][] {
  const pool = shuffle(ids);
  const pairs: [string, string][] = [];
  while (pool.length >= 2) {
    const first = pool.shift()!;
    let idx = pool.findIndex(
      (o) =>
        !ctx.met.has(pairKey(first, o)) &&
        (!ctx.separateClubs || !ctx.clubs[first] || ctx.clubs[first] !== ctx.clubs[o]),
    );
    if (idx < 0) idx = pool.findIndex((o) => !ctx.met.has(pairKey(first, o)));
    if (idx < 0) idx = 0;
    const [second] = pool.splice(idx, 1);
    pairs.push([first, second]);
  }
  return pairs;
}

/** Строит следующий тур сетки с выбыванием после двух поражений. */
export function buildNextRound(
  bracket: Bracket,
  matches: Match[],
  athletes: Record<string, Athlete>,
  startOrder: number,
): { bracket: Bracket; newMatches: Match[] } {
  const st = standings(bracket, matches);
  const active = bracket.athletes.filter((id) => st[id].losses < 2);
  const round = bracket.round + 1;
  if (active.length <= 1) return { bracket: { ...bracket, done: true }, newMatches: [] };

  const A = active.filter((id) => st[id].losses === 0);
  const B = active.filter((id) => st[id].losses === 1);
  const own = matches.filter((m) => m.key === bracket.key);
  const met = new Set(own.map((m) => pairKey(m.a, m.b)));
  const clubs: Record<string, string> = {};
  bracket.athletes.forEach((id) => (clubs[id] = (athletes[id]?.club || "").trim().toLowerCase()));

  let order = startOrder;
  const mk = (a: string, b: string, group: MatchGroup): Match => ({
    id: uid(),
    key: bracket.key,
    round,
    group,
    a,
    b,
    winner: null,
    order: order++,
    table: bracket.table,
  });

  const byes = [...bracket.byes];
  const newMatches: Match[] = [];

  if (active.length === 2) {
    const hadFinal = own.some((m) => m.group === "F");
    if (A.length === 1 && B.length === 1) newMatches.push(mk(A[0], B[0], "F"));
    else newMatches.push(mk(active[0], active[1], hadFinal ? "SF" : A.length === 2 ? "A" : "B"));
  } else {
    for (const [list, group] of [
      [A, "A"],
      [B, "B"],
    ] as const) {
      let pool = [...list];
      if (pool.length % 2 === 1) {
        const byeCount = (id: string) => byes.filter((b) => b.id === id).length;
        const min = Math.min(...pool.map(byeCount));
        const cands = shuffle(pool.filter((id) => byeCount(id) === min));
        const bye = cands[0];
        byes.push({ round, id: bye, group });
        pool = pool.filter((id) => id !== bye);
      }
      pairUp(pool, { met, clubs, separateClubs: round === 1 }).forEach(([a, b]) =>
        newMatches.push(mk(a, b, group)),
      );
    }
  }

  return { bracket: { ...bracket, round, byes }, newMatches };
}

export interface PlaceRow {
  id: string;
  place: number;
  wins: number;
  losses: number;
}

export function places(
  bracket: Bracket,
  matches: Match[],
  athletes: Record<string, Athlete>,
): PlaceRow[] {
  const st = standings(bracket, matches);
  const rows = Object.values(st);
  rows.sort((x, y) => {
    const ex = x.elimRound ?? Infinity;
    const ey = y.elimRound ?? Infinity;
    if (ex !== ey) return ey - ex;
    if (x.losses !== y.losses) return x.losses - y.losses;
    if (x.wins !== y.wins) return y.wins - x.wins;
    return (athletes[x.id]?.weight ?? 0) - (athletes[y.id]?.weight ?? 0);
  });
  return rows.map((r, i) => ({ id: r.id, place: i + 1, wins: r.wins, losses: r.losses }));
}