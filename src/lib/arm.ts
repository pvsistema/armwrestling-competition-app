export type Hand = "right" | "left";
export type Gender = "M" | "F";
/** Класс пара-армрестлинга (ПОДА): PID — сидя за столом, PIU — стоя. */
export type ParaClass = "PID" | "PIU";
export const PARA_LABEL: Record<ParaClass, string> = { PID: "PID — сидя", PIU: "PIU — стоя" };
export const PARA_HINT: Record<ParaClass, string> = {
  PID: "Спортсмены с ПОДА, соревнующиеся сидя (например, в инвалидной коляске)",
  PIU: "Спортсмены с ПОДА, соревнующиеся стоя",
};

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
  /** Номер паспорта ФАР. */
  farId?: string;
  upClass?: boolean;
  absolute?: boolean;
  /** Совершеннолетний юниор по желанию заявлен также во взрослую категорию. */
  adult?: boolean;
  /** Пара-армрестлинг (ПОДА): класс по положению за столом. */
  para?: ParaClass;
  admit?: { med?: boolean; ins?: boolean; mandate?: boolean };
  out?: { reason: OutReason; at: number };
}

export type OutReason = "injury" | "withdrawn" | "disq";
export const OUT_LABEL: Record<OutReason, string> = { injury: "травма", withdrawn: "снят", disq: "дисквалифицирован" };

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
  absolute?: boolean;
  /** Взрослая группа (мужчины/женщины), куда допускаются совершеннолетние юниоры. */
  adult?: boolean;
  /** Группа пара-армрестлинга (ПОДА): PID — сидя, PIU — стоя. */
  para?: ParaClass;
}

export type MatchGroup = "A" | "B" | "F" | "SF" | "O" | "T" | "R" | "X";
export type System = "double" | "olympic" | "roundrobin";
export const SYSTEM_LABEL: Record<System, string> = {
  double: "До двух поражений",
  olympic: "Олимпийская (до первого поражения)",
  roundrobin: "Круговая (каждый с каждым)",
};
export type WinHow = "pin" | "foul" | "noshow" | "wo";
export const HOW_LABEL: Record<WinHow, string> = { pin: "", foul: "2 фола", noshow: "неявка", wo: "соперник снят" };
export interface Pen {
  r: number;
  f: number;
}

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
  how?: WinHow;
  pen?: Record<string, Pen>;
  calledAt?: number;
  scope?: string;
  label?: string;
}

export interface Bye {
  round: number;
  id: string;
  group: MatchGroup;
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
  system?: System;
  third?: boolean;
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
  /** Колонка «№ паспорта ФАР» в протоколах и стартовых листах. */
  showFar?: boolean;
  /** Фото из паспорта ФАР на пульте судьи. */
  showFarPhoto?: boolean;
  /** Фото из паспорта ФАР на табло для зрителей. */
  showFarPhotoBoard?: boolean;
  /** Флаг субъекта РФ на табло. */
  showFlagBoard?: boolean;
  /** Флаги субъектов РФ в командном зачёте протоколов. */
  showFlagProtocol?: boolean;
  restShort?: number;
  restLong?: number;
  system?: System;
  rrMax?: number;
  olympicThird?: boolean;
  tolerance?: number;
  requireAdmit?: boolean;
  /** С какой руки начинается турнир (п. 1.1 — по Положению). */
  firstHand?: Hand;
  /** Устарело: true — вторая рука после окончания первой на всех столах. */
  handStages?: boolean;
  /** table — стол закончил первую руку и сразу начинает вторую; all — ждём все столы; free — без ограничений. */
  handFlow?: HandFlow;
  /** Секретарь вручную разрешил начать вторую руку раньше. */
  secondHandOpen?: boolean;
  /** Устарело: юниоры заявляются во взрослые только вручную. */
  juniorsToAdults?: boolean;
}

export type HandFlow = "table" | "all" | "free";
export const HAND_FLOW_LABEL: Record<HandFlow, string> = {
  table: "Стол закончил первую руку — сразу начинает вторую",
  all: "Вторая рука — после окончания первой на всех столах",
  free: "Без ограничений (руки вперемешку по готовности)",
};
export const handFlowOf = (t: Pick<Tournament, "handFlow" | "handStages">): HandFlow =>
  t.handFlow ?? (t.handStages === false ? "free" : "table");

export const firstHandOf = (t: Pick<Tournament, "firstHand">): Hand => t.firstHand ?? "left";
export const secondHandOf = (t: Pick<Tournament, "firstHand">): Hand => (firstHandOf(t) === "left" ? "right" : "left");
export const handsInOrder = (t: Pick<Tournament, "firstHand">): Hand[] => [firstHandOf(t), secondHandOf(t)];

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
  abs?: boolean;
}

export const HAND_LABEL: Record<Hand, string> = { right: "правая", left: "левая" };
export const GENDER_LABEL: Record<Gender, string> = { M: "Мужчины", F: "Женщины" };
export const GROUP_LABEL: Record<MatchGroup, string> = {
  A: "основная",
  B: "утешительная",
  F: "финал",
  SF: "суперфинал",
  O: "олимпийская",
  T: "за 3-е место",
  R: "круговая",
  X: "решающий поединок",
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
    if (g.absolute)
      res.push({ key: `${g.id}:abs`, groupId: g.id, gender: g.gender, groupName: g.name, limit: null, prev: 0, label: "абсолютная", abs: true });
  }
  return res;
}

export const ADULT_AGE = 18;

/** Взрослая группа: отмечена вручную или открытая группа от 18 лет (мужчины/женщины). */
export const isAdultGroup = (g: AgeGroup) => !g.para && (g.adult ?? (g.ageMin <= ADULT_AGE && g.ageMin >= 17 && g.ageMax >= 30));

const isYouthGroup = (g: AgeGroup) => !isAdultGroup(g) && g.ageMax <= 23;

/** Основная возрастная группа: юношеская/юниорская важнее взрослой, иначе — первая подходящая. */
export function groupOf(a: Pick<Athlete, "gender" | "birthYear" | "para">, groups: AgeGroup[], year: number): AgeGroup | null {
  const age = year - a.birthYear;
  const fit = groups.filter((g) => g.gender === a.gender && (g.para ?? null) === (a.para ?? null) && age >= g.ageMin && age <= g.ageMax);
  return fit.find(isYouthGroup) ?? fit[0] ?? null;
}

function classInGroup(a: Athlete, g: AgeGroup, tol: number, up: boolean): WeightClass | null {
  if (a.weight == null) return null;
  const classes = weightClasses([g]).filter((c) => !c.abs);
  let i = classes.findIndex((c) => c.limit == null || a.weight! <= c.limit + tol + 1e-9);
  if (i < 0) return null;
  if (up && i < classes.length - 1) i++;
  return classes[i];
}

/** Весовая категория по весу с учётом провеса (п. 8.8) и заявки на категорию выше (п. 8.9). */
export function classOf(a: Athlete, groups: AgeGroup[], year: number, tol = 0): WeightClass | null {
  const g = groupOf(a, groups, year);
  return g ? classInGroup(a, g, tol, !!a.upClass) : null;
}

/** Взрослая группа, куда может быть дополнительно заявлен совершеннолетний юниор. */
export function adultGroupFor(a: Pick<Athlete, "gender" | "birthYear" | "para">, groups: AgeGroup[], year: number): AgeGroup | null {
  const age = year - a.birthYear;
  if (age < ADULT_AGE || a.para) return null;
  const main = groupOf(a, groups, year);
  if (!main || !isYouthGroup(main)) return null;
  return groups.find((g) => g.id !== main.id && g.gender === a.gender && isAdultGroup(g) && age >= Math.min(g.ageMin, ADULT_AGE)) ?? null;
}

export const adultOn = (a: Athlete, _t?: Tournament) => !!a.adult;

/** Взрослая весовая категория совершеннолетнего юниора (если он в неё заявлен). */
export function adultClassOf(a: Athlete, groups: AgeGroup[], t: Tournament): WeightClass | null {
  if (!adultOn(a, t)) return null;
  const g = adultGroupFor(a, groups, tournamentYear(t));
  return g ? classInGroup(a, g, t.tolerance ?? 0, false) : null;
}

export const isAdmitted = (a: Athlete, t: Tournament) =>
  !t.requireAdmit || !!(a.admit?.med && a.admit?.ins && a.admit?.mandate);

/** Все категории, в которых спортсмен участвует: своя весовая + абсолютная (если заявлен). */
export function entryClasses(a: Athlete, groups: AgeGroup[], t: Tournament): WeightClass[] {
  if (a.out || !isAdmitted(a, t)) return [];
  const c = classOf(a, groups, tournamentYear(t), t.tolerance ?? 0);
  if (!c) return [];
  const res = [c];
  const g = groups.find((x) => x.id === c.groupId);
  if (a.absolute && g?.absolute) res.push(weightClasses([g]).find((x) => x.abs)!);
  const ad = adultClassOf(a, groups, t);
  if (ad && !res.some((x) => x.key === ad.key)) res.push(ad);
  return res;
}

export function systemFor(t: Tournament, n: number): System {
  if (t.rrMax && n <= t.rrMax) return "roundrobin";
  return t.system ?? "double";
}

export const isAbsKey = (classKey: string) => classKey.endsWith(":abs");

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

const elimLimit = (b: Bracket) => (b.system === "olympic" ? 1 : b.system === "roundrobin" ? Infinity : 2);

export function standings(bracket: Bracket, matches: Match[]): Record<string, Standing> {
  const lim = elimLimit(bracket);
  const st: Record<string, Standing> = {};
  bracket.athletes.forEach((id) => (st[id] = { id, wins: 0, losses: 0, elimRound: null }));
  matches
    .filter((m) => m.key === bracket.key && m.winner && m.group !== "X")
    .sort((x, y) => x.round - y.round || x.order - y.order)
    .forEach((m) => {
      const loser = m.winner === m.a ? m.b : m.a;
      if (st[m.winner!]) st[m.winner!].wins++;
      if (st[loser]) {
        st[loser].losses++;
        if (st[loser].losses >= lim && st[loser].elimRound == null) st[loser].elimRound = m.round;
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

/** Следующий тур сетки — по системе, выбранной для категории. */
export function buildNextRound(
  bracket: Bracket,
  matches: Match[],
  athletes: Record<string, Athlete>,
  startOrder: number,
): { bracket: Bracket; newMatches: Match[] } {
  const sys = bracket.system ?? "double";
  if (sys === "olympic") return buildOlympic(bracket, matches, athletes, startOrder);
  if (sys === "roundrobin") return buildRoundRobin(bracket, startOrder);
  return buildDouble(bracket, matches, athletes, startOrder);
}

const clubsOf = (bracket: Bracket, athletes: Record<string, Athlete>) => {
  const clubs: Record<string, string> = {};
  bracket.athletes.forEach((id) => (clubs[id] = (athletes[id]?.club || "").trim().toLowerCase()));
  return clubs;
};

const maker = (bracket: Bracket, round: number, start: number) => {
  let order = start;
  return (a: string, b: string, group: MatchGroup, r = round): Match => ({
    id: uid(),
    key: bracket.key,
    round: r,
    group,
    a,
    b,
    winner: null,
    order: order++,
    table: bracket.table,
  });
};

/** Олимпийская система (п. 1.2-II): S = 2ⁿ − N участников проходят во 2-й тур без борьбы. */
function buildOlympic(
  bracket: Bracket,
  matches: Match[],
  athletes: Record<string, Athlete>,
  startOrder: number,
): { bracket: Bracket; newMatches: Match[] } {
  const st = standings(bracket, matches);
  const round = bracket.round + 1;
  const mk = maker(bracket, round, startOrder);
  const newMatches: Match[] = [];
  if (bracket.round === 0) {
    const ids = shuffle(bracket.athletes);
    const N = ids.length;
    if (N <= 1) return { bracket: { ...bracket, done: true }, newMatches };
    let p = 1;
    while (p < N) p *= 2;
    const S = p - N;
    const byes: Bye[] = ids.slice(0, S).map((id) => ({ round: 1, id, group: "O" }));
    const pairs = pairUp(ids.slice(S), { met: new Set(), clubs: clubsOf(bracket, athletes), separateClubs: true });
    pairs.forEach(([a, b]) => newMatches.push(mk(a, b, N === 2 ? "F" : "O")));
    return { bracket: { ...bracket, round: 1, byes }, newMatches };
  }
  const active = bracket.athletes.filter((id) => st[id].losses === 0);
  if (active.length <= 1) return { bracket: { ...bracket, done: true }, newMatches };
  const own = matches.filter((m) => m.key === bracket.key && m.group !== "X");
  const prev = own.filter((m) => m.round === bracket.round && m.group === "O").sort((x, y) => x.order - y.order);
  const list = [
    ...bracket.byes.filter((b) => b.round === bracket.round).map((b) => b.id),
    ...prev.map((m) => m.winner!),
  ].filter((id) => active.includes(id));
  active.forEach((id) => !list.includes(id) && list.push(id));
  if (list.length === 2) {
    newMatches.push(mk(list[0], list[1], "F"));
    if ((bracket.third ?? true) && prev.length === 2) {
      const losers = prev.map((m) => (m.winner === m.a ? m.b : m.a));
      newMatches.push(mk(losers[0], losers[1], "T"));
    }
    return { bracket: { ...bracket, round }, newMatches };
  }
  const byes = [...bracket.byes];
  if (list.length % 2 === 1) byes.push({ round, id: list.pop()!, group: "O" });
  for (let i = 0; i + 1 < list.length; i += 2) newMatches.push(mk(list[i], list[i + 1], "O"));
  return { bracket: { ...bracket, round, byes }, newMatches };
}

/** Круговая система (п. 1.2-III): все туры составляются сразу, каждый встречается с каждым. */
function buildRoundRobin(bracket: Bracket, startOrder: number): { bracket: Bracket; newMatches: Match[] } {
  if (bracket.round > 0 || bracket.athletes.length <= 1) return { bracket: { ...bracket, done: true }, newMatches: [] };
  const ids: (string | null)[] = shuffle(bracket.athletes);
  if (ids.length % 2 === 1) ids.push(null);
  const n = ids.length;
  const mk = maker(bracket, 1, startOrder);
  const newMatches: Match[] = [];
  const byes: Bye[] = [];
  const arr = [...ids];
  for (let r = 1; r < n; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) newMatches.push(mk(r % 2 ? a : b, r % 2 ? b : a, "R", r));
      else if (a || b) byes.push({ round: r, id: (a || b)!, group: "R" });
    }
    arr.splice(1, 0, arr.pop()!);
  }
  return { bracket: { ...bracket, round: n - 1, byes }, newMatches };
}

/** Строит следующий тур сетки с выбыванием после двух поражений. */
function buildDouble(
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
  /** Полное равенство с этим спортсменом — нужен решающий поединок (п. 2.6). */
  decider?: string;
}

/** Победитель решающего поединка (п. 2.6) между двумя спортсменами в весовой категории. */
export function deciderWinner(matches: Match[], classKey: string, x: string, y: string): string | null {
  const m = matches.find(
    (m) => m.group === "X" && m.key.startsWith(`${classKey}|`) && ((m.a === x && m.b === y) || (m.a === y && m.b === x)),
  );
  return m?.winner ?? null;
}
export function hasDecider(matches: Match[], classKey: string, x: string, y: string) {
  return matches.some(
    (m) => m.group === "X" && m.key.startsWith(`${classKey}|`) && ((m.a === x && m.b === y) || (m.a === y && m.b === x)),
  );
}

function placesRoundRobin(bracket: Bracket, matches: Match[], athletes: Record<string, Athlete>): PlaceRow[] {
  const st = standings(bracket, matches);
  const own = matches.filter((m) => m.key === bracket.key && m.winner && m.group !== "X");
  const h2h = (x: string, y: string) => {
    const m = own.find((m) => (m.a === x && m.b === y) || (m.a === y && m.b === x));
    return m ? (m.winner === x ? -1 : 1) : 0;
  };
  const ids = Object.keys(st);
  const cnt = (id: string) => ids.filter((o) => st[o].wins === st[id].wins).length;
  const cmp = (x: string, y: string) =>
    st[y].wins - st[x].wins ||
    (cnt(x) === 2 ? h2h(x, y) : 0) ||
    breakTie(athletes[x], athletes[y], 0, 0).cmp ||
    (deciderWinner(matches, bracket.classKey, x, y) === x ? -1 : deciderWinner(matches, bracket.classKey, x, y) === y ? 1 : 0);
  ids.sort(cmp);
  const out: PlaceRow[] = ids.map((id) => ({ id, place: 0, wins: st[id].wins, losses: st[id].losses }));
  for (let i = 0; i < out.length; i++) {
    out[i].place = i + 1;
    if (i === 0) continue;
    const x = ids[i - 1];
    const y = ids[i];
    if (st[x].wins !== st[y].wins) continue;
    const nx = athletes[x]?.name ?? "";
    const ny = athletes[y]?.name ?? "";
    if (cnt(x) === 2 && h2h(x, y)) {
      out[i].note = `Побед поровну: ${nx} выше по личной встрече.`;
      continue;
    }
    const t = breakTie(athletes[x], athletes[y], 0, 0);
    if (t.how === "weight") continue;
    if (t.how === "reweigh") {
      out[i].note = `По результатам перевзвешивания ${nx} выше, чем ${ny}.`;
      continue;
    }
    if (t.needReweigh) {
      out[i - 1].needReweigh = out[i].needReweigh = true;
      out[i].note = `Побед и вес поровну: требуется перевзвешивание (п. 2.4 Правил) — ${nx} и ${ny}.`;
      continue;
    }
    const d = deciderWinner(matches, bracket.classKey, x, y);
    if (d) out[i].note = `По решающему поединку (п. 2.6) ${nx} выше, чем ${ny}.`;
    else {
      out[i].place = out[i - 1].place;
      out[i].decider = x;
      out[i].note = `Полное равенство: ${nx} и ${ny}. Назначьте решающий поединок (п. 2.6 Правил).`;
    }
  }
  return out;
}

function firstLossRounds(bracket: Bracket, matches: Match[]): Record<string, number> {
  const r: Record<string, number> = {};
  matches
    .filter((m) => m.key === bracket.key && m.winner && m.group !== "X")
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
  if (bracket.system === "roundrobin") return placesRoundRobin(bracket, matches, athletes);
  const st = standings(bracket, matches);
  const fl = firstLossRounds(bracket, matches);
  const flOf = (id: string) => fl[id] ?? Infinity;
  const rows = Object.values(st);
  const third = matches.find((m) => m.key === bracket.key && m.group === "T" && m.winner);
  const tBonus = (id: string) => (third?.winner === id ? 1 : 0);
  const dec = (x: string, y: string) => {
    const d = deciderWinner(matches, bracket.classKey, x, y);
    return d === x ? -1 : d === y ? 1 : 0;
  };
  const pre = (x: Standing, y: Standing) => {
    const ex = x.elimRound ?? Infinity;
    const ey = y.elimRound ?? Infinity;
    if (ex !== ey) return ey - ex;
    if (tBonus(x.id) !== tBonus(y.id)) return tBonus(y.id) - tBonus(x.id);
    if (x.elimRound == null && x.losses !== y.losses) return x.losses - y.losses;
    if (x.elimRound == null && x.wins !== y.wins) return y.wins - x.wins;
    return 0;
  };
  rows.sort((x, y) => pre(x, y) || breakTie(athletes[x.id], athletes[y.id], flOf(x.id), flOf(y.id)).cmp || dec(x.id, y.id));

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
    else if (t.how === "none" && !t.needReweigh) {
      if (dec(x.id, y.id)) out[i].note = `По решающему поединку (п. 2.6) ${nx} выше, чем ${ny}.`;
      else {
        out[i].place = out[i - 1].place;
        out[i].decider = x.id;
        out[i].note = `Полное равенство: ${nx} и ${ny}. Назначьте решающий поединок (п. 2.6 Правил).`;
      }
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
  decider?: string;
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
  const dec = (x: BiathlonRow, y: BiathlonRow) => {
    const d = deciderWinner(matches, classKey, x.id, y.id);
    return d === x.id ? -1 : d === y.id ? 1 : 0;
  };
  rows.sort((x, y) => cmpBase(x, y) || tie(x, y).cmp || dec(x, y));
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
    else if (t.how === "none" && !t.needReweigh) {
      if (dec(x, y)) y.note = `По решающему поединку (п. 2.6) ${nx} выше, чем ${ny}.`;
      else {
        y.place = x.place;
        y.decider = x.id;
        y.note = `Полное равенство: ${nx} и ${ny}. Назначьте решающий поединок (п. 2.6 Правил).`;
      }
    }
  }
  for (const r of rows) {
    const hands = [r.left, r.right];
    const podium = hands.every((p) => p === 2 || p === 3) && hands.includes(3);
    if (r.place === 4 && podium) {
      r.place = 3;
      const n = athletes[r.id]?.name ?? "";
      r.note = `${n}: места на руках ${r.left} и ${r.right}, в сумме 4-е — присуждается 3-е место, в протоколе два 3-х места (п. 2.7 Правил).`;
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
  /** Количество мест 1, 2, 3… засчитанных команде — для равенства очков (п. 1.1). */
  placeCounts: number[];
  tieNote?: string;
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
  type Acc = TeamRow & { ids: Set<string>; best: Record<string, number>; bestPlace: Record<string, number>; list: number[] };
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
      placeCounts: [],
      ids: new Set(),
      best: {},
      bestPlace: {},
      list: [],
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
      if (prev != null && prev === p && row.bestPlace[slot] <= place) return;
      row[field] += p - (prev ?? 0);
      row.total += p - (prev ?? 0);
      row.best[slot] = p;
      row.bestPlace[slot] = place;
    } else {
      row[field] += p;
      row.total += p;
      row.list.push(place);
    }
    if (place <= 3) row.medals[place - 1]++;
  };
  brackets = brackets.filter((b) => !isAbsKey(b.classKey));
  if (opts.mode === "biathlon") {
    const classKeys = Array.from(new Set(brackets.map((b) => b.classKey)));
    for (const ck of classKeys)
      for (const r of biathlon(ck, brackets, matches, athletes, pts)) add(r.id, r.place, ck, "biathlon");
  } else {
    for (const b of brackets) for (const r of places(b, matches, athletes)) add(r.id, r.place, b.key, b.hand);
  }
  const depth = Math.max(pts.length, 6);
  const rows: TeamRow[] = Object.values(map).map(({ ids, best: _b, bestPlace, list, ...r }) => {
    const all = opts.bestOnly ? Object.values(bestPlace) : list;
    const placeCounts = Array.from({ length: depth }, (_, k) => all.filter((p) => p === k + 1).length);
    return { ...r, members: ids.size, placeCounts };
  });
  const byPlaces = (x: TeamRow, y: TeamRow) => {
    for (let k = 0; k < depth; k++) if (x.placeCounts[k] !== y.placeCounts[k]) return y.placeCounts[k] - x.placeCounts[k];
    return 0;
  };
  rows.sort((x, y) => y.total - x.total || byPlaces(x, y) || x.team.localeCompare(y.team, "ru"));
  for (let k = 1; k < rows.length; k++) {
    const x = rows[k - 1];
    const y = rows[k];
    if (x.total !== y.total || !byPlaces(x, y)) continue;
    const lvl = x.placeCounts.findIndex((c, idx) => c !== y.placeCounts[idx]);
    y.tieNote = `Очков поровну с «${x.team}»: у них больше ${lvl + 1}-х мест (${x.placeCounts[lvl]} против ${y.placeCounts[lvl]}).`;
  }
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1].total === rows[i].total && !byPlaces(rows[i], rows[j + 1])) j++;
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
      { name: "Мужчины", gender: "M", ageMin: 18, ageMax: 99, limits: [55, 60, 65, 70, 75, 80, 85, 90, 100, 110], adult: true },
      { name: "Женщины", gender: "F", ageMin: 18, ageMax: 99, limits: [50, 55, 60, 65, 70, 80, 90], adult: true },
    ],
  },
  {
    title: "Ветераны 40+ лет",
    groups: [
      { name: "Ветераны", gender: "M", ageMin: 40, ageMax: 99, limits: [70, 80, 90, 100] },
      { name: "Ветераны (жен.)", gender: "F", ageMin: 40, ageMax: 99, limits: [60, 70] },
    ],
  },
  {
    title: "Пара-армрестлинг ПОДА: PID (сидя)",
    groups: [
      { name: "Мужчины PID (сидя)", gender: "M", ageMin: 16, ageMax: 99, limits: [60, 70, 80, 90], para: "PID" },
      { name: "Женщины PID (сидя)", gender: "F", ageMin: 16, ageMax: 99, limits: [50, 60, 70], para: "PID" },
    ],
  },
  {
    title: "Пара-армрестлинг ПОДА: PIU (стоя)",
    groups: [
      { name: "Мужчины PIU (стоя)", gender: "M", ageMin: 16, ageMax: 99, limits: [65, 75, 85, 95], para: "PIU" },
      { name: "Женщины PIU (стоя)", gender: "F", ageMin: 16, ageMax: 99, limits: [55, 65, 75], para: "PIU" },
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
