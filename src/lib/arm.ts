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
  reweigh?: number | null;
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
  mode?: ScoringMode;
  points?: number[];
}

export type ScoringMode = "hands" | "biathlon";
export const DEFAULT_POINTS = [25, 17, 9, 5, 3, 2];
export const MODE_LABEL: Record<ScoringMode, string> = {
  hands: "Каждая рука отдельно (WAF)",
  biathlon: "Двоеборье (ФАР)",
};
export const tMode = (t: Tournament): ScoringMode => t.mode ?? "hands";
export const tPoints = (t: Tournament): number[] => (t.points?.length ? t.points : DEFAULT_POINTS);
export const pointsFor = (place: number, pts: number[]) => pts[place - 1] ?? 0;

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
  note?: string;
  needReweigh?: boolean;
}

function firstLossRounds(bracket: Bracket, matches: Match[]): Record<string, number> {
  const r: Record<string, number> = {};
  matches
    .filter((m) => m.key === bracket.key && m.winner)
    .forEach((m) => {
      const loser = m.winner === m.a ? m.b : m.a;
      if (r[loser] == null || m.round < r[loser]) r[loser] = m.round;
    });
  return r;
}

const W = (a?: Athlete) => a?.weight ?? Infinity;
const RW = (a?: Athlete) => (a?.reweigh == null ? null : a.reweigh);

type TieResult = { cmp: number; how: "weight" | "reweigh" | "unbeaten" | "none" | "other"; needReweigh: boolean };

/** Разрешение равенства по ArmScorer: вес → перевзвешивание (п. 2.4) → дольше без поражений. */
function breakTie(a: Athlete | undefined, b: Athlete | undefined, flA: number, flB: number): TieResult {
  if (W(a) !== W(b)) return { cmp: W(a) - W(b), how: "weight", needReweigh: false };
  const ra = RW(a);
  const rb = RW(b);
  if (ra != null && rb != null && ra !== rb) return { cmp: ra - rb, how: "reweigh", needReweigh: false };
  const need = ra == null || rb == null;
  if (flA !== flB) return { cmp: flB - flA, how: "unbeaten", needReweigh: need };
  return { cmp: 0, how: "none", needReweigh: need };
}

export function places(
  bracket: Bracket,
  matches: Match[],
  athletes: Record<string, Athlete>,
): PlaceRow[] {
  const st = standings(bracket, matches);
  const fl = firstLossRounds(bracket, matches);
  const flOf = (id: string) => fl[id] ?? Infinity;
  const rows = Object.values(st);
  const pre = (x: Standing, y: Standing) => {
    const ex = x.elimRound ?? Infinity;
    const ey = y.elimRound ?? Infinity;
    if (ex !== ey) return ey - ex;
    if (x.elimRound == null && x.losses !== y.losses) return x.losses - y.losses;
    if (x.elimRound == null && x.wins !== y.wins) return y.wins - x.wins;
    return 0;
  };
  rows.sort((x, y) => pre(x, y) || breakTie(athletes[x.id], athletes[y.id], flOf(x.id), flOf(y.id)).cmp);

  const out: PlaceRow[] = rows.map((r) => ({ id: r.id, place: 0, wins: r.wins, losses: r.losses }));
  for (let i = 0; i < rows.length; i++) {
    out[i].place = i + 1;
    if (i === 0) continue;
    const x = rows[i - 1];
    const y = rows[i];
    if (pre(x, y) !== 0 || x.elimRound == null) continue;
    const t = breakTie(athletes[x.id], athletes[y.id], flOf(x.id), flOf(y.id));
    const nx = athletes[x.id]?.name ?? "";
    const ny = athletes[y.id]?.name ?? "";
    if (t.how === "weight") continue;
    if (t.needReweigh) {
      out[i - 1].needReweigh = out[i].needReweigh = true;
      out[i].note = `Вес равный: требуется перевзвешивание (п. 2.4 Правил) — ${nx} и ${ny}.`;
    }
    if (t.how === "reweigh") out[i].note = `По результатам перевзвешивания ${nx} выше, чем ${ny}.`;
    else if (t.how === "unbeaten" && !t.needReweigh)
      out[i].note = `Вес после перевзвешивания равный: ${nx} выше, т.к. дольше шёл без поражений.`;
    else if (t.how === "none") {
      out[i].place = out[i - 1].place;
      if (!t.needReweigh) out[i].note = `Полное равенство: ${nx} и ${ny} делят ${out[i].place} место.`;
    }
  }
  return out;
}

export interface BiathlonRow {
  id: string;
  place: number;
  right: number | null;
  left: number | null;
  rightPts: number;
  leftPts: number;
  total: number;
  note?: string;
  needReweigh?: boolean;
}

/** Двоеборье (ФАР): сумма очков за места на правой и левой руке. */
export function biathlon(
  classKey: string,
  brackets: Bracket[],
  matches: Match[],
  athletes: Record<string, Athlete>,
  pts: number[],
): BiathlonRow[] {
  const map: Record<string, BiathlonRow> = {};
  for (const hand of ["right", "left"] as Hand[]) {
    const b = brackets.find((x) => x.classKey === classKey && x.hand === hand);
    if (!b) continue;
    for (const r of places(b, matches, athletes)) {
      const row = (map[r.id] ||= { id: r.id, place: 0, right: null, left: null, rightPts: 0, leftPts: 0, total: 0 });
      const p = pointsFor(r.place, pts);
      if (hand === "right") {
        row.right = r.place;
        row.rightPts = p;
      } else {
        row.left = r.place;
        row.leftPts = p;
      }
      row.total += p;
    }
  }
  const rows = Object.values(map);
  const best = (r: BiathlonRow) => Math.min(r.right ?? Infinity, r.left ?? Infinity);
  const cmpBase = (x: BiathlonRow, y: BiathlonRow) => y.total - x.total;
  const tie = (x: BiathlonRow, y: BiathlonRow) => breakTie(athletes[x.id], athletes[y.id], -best(x), -best(y));
  rows.sort((x, y) => cmpBase(x, y) || tie(x, y).cmp);
  for (let i = 0; i < rows.length; i++) {
    rows[i].place = i + 1;
    if (i === 0 || cmpBase(rows[i - 1], rows[i]) !== 0) continue;
    const x = rows[i - 1];
    const y = rows[i];
    const t = tie(x, y);
    const nx = athletes[x.id]?.name ?? "";
    const ny = athletes[y.id]?.name ?? "";
    if (t.how === "weight") continue;
    if (t.needReweigh) {
      x.needReweigh = y.needReweigh = true;
      y.note = `Сумма и вес равны: требуется перевзвешивание (п. 2.4 Правил) — ${nx} и ${ny}.`;
    }
    if (t.how === "reweigh") y.note = `По результатам перевзвешивания ${nx} выше, чем ${ny}.`;
    else if (t.how === "unbeaten" && !t.needReweigh) y.note = `Равенство: ${nx} выше по лучшему месту на одной из рук.`;
    else if (t.how === "none") {
      y.place = x.place;
      if (!t.needReweigh)
        y.note =
          x.place === 3
            ? `В результате двоеборья два 3-х места: ${nx} и ${ny} (п. 2.7 Правил).`
            : `Полное равенство: ${nx} и ${ny} делят ${x.place} место.`;
    }
  }
  return rows;
}

export interface TeamHand {
  points: number;
  medals: [number, number, number];
}
export interface TeamRow {
  team: string;
  place: number;
  right: TeamHand;
  left: TeamHand;
  total: number;
  medals: [number, number, number];
  members: number;
}

/** Командный зачёт: очки за места участников команды на каждой руке. */
export function teamStandings(
  brackets: Bracket[],
  matches: Match[],
  athletes: Record<string, Athlete>,
  pts: number[],
): TeamRow[] {
  const map: Record<string, TeamRow & { ids: Set<string> }> = {};
  const empty = (): TeamHand => ({ points: 0, medals: [0, 0, 0] });
  for (const b of brackets) {
    for (const r of places(b, matches, athletes)) {
      const team = (athletes[r.id]?.club || "").trim();
      if (!team) continue;
      const k = team.toLowerCase();
      const row = (map[k] ||= { team, place: 0, right: empty(), left: empty(), total: 0, medals: [0, 0, 0], members: 0, ids: new Set() });
      row.ids.add(r.id);
      const h = row[b.hand];
      const p = pointsFor(r.place, pts);
      h.points += p;
      row.total += p;
      if (r.place <= 3) {
        h.medals[r.place - 1]++;
        row.medals[r.place - 1]++;
      }
    }
  }
  const rows = Object.values(map).map(({ ids, ...r }) => ({ ...r, members: ids.size }));
  const cmp = (x: TeamRow, y: TeamRow) =>
    y.total - x.total || y.medals[0] - x.medals[0] || y.medals[1] - x.medals[1] || y.medals[2] - x.medals[2];
  rows.sort(cmp);
  rows.forEach((r, i) => (r.place = i > 0 && cmp(rows[i - 1], r) === 0 ? rows[i - 1].place : i + 1));
  return rows;
}
