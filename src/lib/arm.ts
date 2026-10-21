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
  birthDate?: string;
  rank?: string;
  district?: string;
}

export const RANKS = ["б/р", "3 юн. р.", "2 юн. р.", "1 юн. р.", "3 р.", "2 р.", "1 р.", "КМС", "МС", "МСМК", "ЗМС"];
export const DISTRICTS = ["ЦФО", "СЗФО", "ЮФО", "СКФО", "ПФО", "УФО", "СФО", "ДФО", "Город Москва", "Город Санкт-Петербург"];
export const DISTRICT_FULL: Record<string, string> = {
  ЦФО: "Центральный федеральный округ",
  СЗФО: "Северо-Западный федеральный округ",
  ЮФО: "Южный федеральный округ",
  СКФО: "Северо-Кавказский федеральный округ",
  ПФО: "Приволжский федеральный округ",
  УФО: "Уральский федеральный округ",
  СФО: "Сибирский федеральный округ",
  ДФО: "Дальневосточный федеральный округ",
  "Город Москва": "Город федерального значения Москва",
  "Город Санкт-Петербург": "Город федерального значения Санкт-Петербург",
};

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
  dateEnd?: string;
  ekp?: string;
  chiefJudgeCat?: string;
  secretaryCat?: string;
  deputyJudge?: string;
  deputySecretary?: string;
  requirements?: string;
  teamBestOnly?: boolean;
  judges?: Judge[];
  showLogo?: boolean;
}

export interface Judge {
  id: string;
  name: string;
  role: string;
  category: string;
  city: string;
}

export const JUDGE_ROLES = [
  "Главный судья",
  "Заместитель главного судьи",
  "Главный секретарь",
  "Заместитель главного секретаря",
  "Спортивный судья",
  "Судья-секретарь",
  "Судья при участниках",
  "Судья-информатор",
];
export const JUDGE_CATEGORIES = ["ВК", "1 категория", "2 категория", "3 категория", "юный судья", "б/к"];

export type ScoringMode = "hands" | "biathlon";
export const DEFAULT_POINTS = [25, 17, 9, 5, 3, 2];
export const MODE_LABEL: Record<ScoringMode, string> = {
  biathlon: "Двоеборье (ФАР)",
  hands: "Каждая рука отдельно (WAF)",
};
export const tMode = (t: Tournament): ScoringMode => t.mode ?? "biathlon";
export const HAND_ORDER: Hand[] = ["left", "right"];
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

/** Разрешение равенства: вес → перевзвешивание (п. 2.4) → дольше без поражений. */
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
  for (const hand of HAND_ORDER) {
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
  const second = (r: BiathlonRow) => Math.max(r.right ?? Infinity, r.left ?? Infinity);
  const cmpBase = (x: BiathlonRow, y: BiathlonRow) => y.total - x.total || best(x) - best(y) || second(x) - second(y);
  const tie = (x: BiathlonRow, y: BiathlonRow) => breakTie(athletes[x.id], athletes[y.id], 0, 0);
  rows.sort((x, y) => cmpBase(x, y) || tie(x, y).cmp);
  for (let i = 0; i < rows.length; i++) {
    rows[i].place = i + 1;
    if (i === 0) continue;
    const x = rows[i - 1];
    const y = rows[i];
    if (x.total !== y.total) continue;
    const nx = athletes[x.id]?.name ?? "";
    const ny = athletes[y.id]?.name ?? "";
    if (x.total === 0 && cmpBase(x, y) !== 0) continue;
    if (best(x) !== best(y)) {
      y.note = `Сумма очков равная: ${nx} выше по лучшему месту на одной из рук.`;
      continue;
    }
    if (second(x) !== second(y)) {
      y.note = `Сумма и лучшее место равны: ${nx} выше по месту на другой руке.`;
      continue;
    }
    const t = tie(x, y);
    if (t.how === "weight") continue;
    if (t.needReweigh) {
      x.needReweigh = y.needReweigh = true;
      y.note = `Сумма и вес равны: требуется перевзвешивание (п. 2.4 Правил) — ${nx} и ${ny}.`;
    }
    if (t.how === "reweigh") y.note = `По результатам перевзвешивания ${nx} выше, чем ${ny}.`;
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

export type TeamBy = "team" | "district";

export interface TeamRow {
  team: string;
  place: number;
  placeLabel: string;
  right: number;
  left: number;
  biathlon: number;
  total: number;
  medals: [number, number, number];
  members: number;
}

/** Командный зачёт. Как в протоколах ФАР: от команды в каждой весовой категории засчитывается лучший результат. */
export function teamStandings(
  brackets: Bracket[],
  matches: Match[],
  athletes: Record<string, Athlete>,
  pts: number[],
  opts: { by: TeamBy; mode: ScoringMode; bestOnly: boolean },
): TeamRow[] {
  const teamOf = (id: string) => {
    const a = athletes[id];
    return ((opts.by === "district" ? a?.district : a?.club) || "").trim();
  };
  type Acc = TeamRow & { ids: Set<string>; best: Record<string, number> };
  const map: Record<string, Acc> = {};
  const get = (team: string): Acc =>
    (map[team.toLowerCase()] ||= {
      team,
      place: 0,
      placeLabel: "",
      right: 0,
      left: 0,
      biathlon: 0,
      total: 0,
      medals: [0, 0, 0],
      members: 0,
      ids: new Set(),
      best: {},
    });
  const add = (id: string, place: number, slot: string, field: "right" | "left" | "biathlon") => {
    const team = teamOf(id);
    if (!team) return;
    const row = get(team);
    row.ids.add(id);
    const p = pointsFor(place, pts);
    if (opts.bestOnly) {
      const prev = row.best[slot];
      if (prev != null && prev >= p) return;
      row[field] += p - (prev ?? 0);
      row.total += p - (prev ?? 0);
      row.best[slot] = p;
    } else {
      row[field] += p;
      row.total += p;
    }
    if (place <= 3) row.medals[place - 1]++;
  };
  if (opts.mode === "biathlon") {
    const classKeys = Array.from(new Set(brackets.map((b) => b.classKey)));
    for (const ck of classKeys)
      for (const r of biathlon(ck, brackets, matches, athletes, pts)) add(r.id, r.place, ck, "biathlon");
  } else {
    for (const b of brackets) for (const r of places(b, matches, athletes)) add(r.id, r.place, b.key, b.hand);
  }
  const rows: TeamRow[] = Object.values(map).map(({ ids, best: _b, ...r }) => ({ ...r, members: ids.size }));
  rows.sort((x, y) => y.total - x.total || x.team.localeCompare(y.team, "ru"));
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].total === rows[i].total) j++;
    for (let k = i; k <= j; k++) {
      rows[k].place = i + 1;
      rows[k].placeLabel = i === j ? String(i + 1) : `${i + 1}-${j + 1}`;
    }
    i = j + 1;
  }
  return rows;
}

export const AGE_PRESETS: { title: string; groups: Omit<AgeGroup, "id">[] }[] = [
  {
    title: "Юноши и девушки 14–15 лет",
    groups: [
      { name: "Юноши 14–15", gender: "M", ageMin: 14, ageMax: 15, limits: [45, 50, 55, 60, 65, 70] },
      { name: "Девушки 14–15", gender: "F", ageMin: 14, ageMax: 15, limits: [40, 45, 50, 55, 60, 70] },
    ],
  },
  {
    title: "Юниоры и юниорки 16–18 лет",
    groups: [
      { name: "Юниоры 16–18", gender: "M", ageMin: 16, ageMax: 18, limits: [50, 55, 60, 65, 70, 75, 80, 90] },
      { name: "Юниорки 16–18", gender: "F", ageMin: 16, ageMax: 18, limits: [45, 50, 55, 60, 65, 70] },
    ],
  },
  {
    title: "Юниоры и юниорки 19–21 год",
    groups: [
      { name: "Юниоры 19–21", gender: "M", ageMin: 19, ageMax: 21, limits: [55, 60, 65, 70, 75, 80, 85, 90, 100] },
      { name: "Юниорки 19–21", gender: "F", ageMin: 19, ageMax: 21, limits: [50, 55, 60, 65, 70, 80] },
    ],
  },
  {
    title: "Мужчины и женщины",
    groups: [
      { name: "Мужчины", gender: "M", ageMin: 18, ageMax: 99, limits: [55, 60, 65, 70, 75, 80, 85, 90, 100, 110] },
      { name: "Женщины", gender: "F", ageMin: 18, ageMax: 99, limits: [50, 55, 60, 65, 70, 80, 90] },
    ],
  },
  {
    title: "Ветераны 40+ лет",
    groups: [
      { name: "Ветераны", gender: "M", ageMin: 40, ageMax: 99, limits: [70, 80, 90, 100] },
      { name: "Ветераны (жен.)", gender: "F", ageMin: 40, ageMax: 99, limits: [60, 70] },
    ],
  },
];

export function fmtKg2(w: number | null | undefined) {
  if (w == null) return "—";
  return w.toFixed(2);
}

export function fmtBirth(a: Athlete) {
  if (a.birthDate) {
    const [y, m, d] = a.birthDate.split("-");
    if (y && m && d) return `${d}.${m}.${y}`;
  }
  return String(a.birthYear);
}
