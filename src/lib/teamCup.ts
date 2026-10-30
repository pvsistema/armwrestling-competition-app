import { useCallback, useEffect, useState } from "react";
import { Bracket, Hand, Match, MatchGroup, buildNextRound, standings, uid } from "./arm";

/** Командная (кубковая) борьба: встречи команд, в каждой весовой — пара спортсменов, обе руки, при 1:1 — третий поединок рукой по жребию. */

export type CupSystem = "roundrobin" | "olympic" | "double" | "groups";
export const CUP_SYSTEM_LABEL: Record<CupSystem, string> = {
  roundrobin: "Круговая (каждая команда с каждой)",
  olympic: "Олимпийская (проиграл встречу — выбыл)",
  double: "До двух поражений",
  groups: "Группы + плей-офф",
};

export type CupSide = "a" | "b";
export const otherSide = (s: CupSide): CupSide => (s === "a" ? "b" : "a");

export interface CupSlot {
  id: string;
  /** Верхняя граница веса, кг; null — «свыше» (последняя категория). */
  limit: number | null;
}

export interface CupMember {
  id: string;
  name: string;
  weight: number | null;
  farId?: string;
}

export interface CupTeam {
  id: string;
  name: string;
  region: string;
  members: CupMember[];
  /** Основной состав: весовая → спортсмен. */
  roster: Record<string, string>;
}

export interface CupPairRes {
  left?: CupSide | null;
  right?: CupSide | null;
  /** Рука третьего поединка по жребию (монетка). */
  coin?: Hand | null;
  third?: CupSide | null;
}

export interface CupMeeting {
  /** Изменённый перед встречей состав: весовая → спортсмен (null — не выставлен). */
  lineup?: { a?: Record<string, string | null>; b?: Record<string, string | null> };
  res: Record<string, CupPairRes>;
  /** Встреча досрочно решена и закрыта без оставшихся пар. */
  closed?: boolean;
  /** Победитель по решению ГСК (жребий) при полном равенстве. */
  manual?: CupSide | null;
}

export interface CupSettings {
  name: string;
  date: string;
  place: string;
  chiefJudge: string;
  secretary: string;
  system: CupSystem;
  slots: CupSlot[];
  firstHand: Hand;
  pts: { win: number; draw: number; loss: number };
  third: boolean;
  groups: number;
  advance: number;
  heavierOk: boolean;
}

export interface CupState {
  settings: CupSettings;
  teams: CupTeam[];
  brackets: Bracket[];
  matches: Match[];
  meetings: Record<string, CupMeeting>;
  current: string | null;
  order: number;
}

export const DRAW = "=";

export const DEFAULT_SLOTS: CupSlot[] = [50, 60, 70, 80, 90, null].map((limit, i) => ({ id: `s${i + 1}`, limit }));

export const EMPTY_CUP: CupState = {
  settings: {
    name: "Командный кубок",
    date: "",
    place: "",
    chiefJudge: "",
    secretary: "",
    system: "double",
    slots: DEFAULT_SLOTS,
    firstHand: "left",
    pts: { win: 2, draw: 1, loss: 0 },
    third: true,
    groups: 2,
    advance: 2,
    heavierOk: false,
  },
  teams: [],
  brackets: [],
  matches: [],
  meetings: {},
  current: null,
  order: 1,
};

export const otherHand = (h: Hand): Hand => (h === "left" ? "right" : "left");

export function slotLabel(slots: CupSlot[], s: CupSlot) {
  if (s.limit != null) return `${s.limit} кг`;
  const prev = slots.filter((x) => x.limit != null).map((x) => x.limit!) as number[];
  return prev.length ? `${Math.max(...prev)}+ кг` : "абс.";
}

/** Нижняя граница весовой (не включительно). */
function slotMin(slots: CupSlot[], s: CupSlot): number {
  const lims = slots.map((x) => x.limit).filter((x): x is number => x != null).sort((a, b) => a - b);
  if (s.limit == null) return lims.length ? lims[lims.length - 1] : 0;
  const lower = lims.filter((x) => x < s.limit!);
  return lower.length ? lower[lower.length - 1] : 0;
}

/** Подходит ли вес спортсмена для весовой. Пусто — подходит. */
export function weightIssue(slots: CupSlot[], s: CupSlot, w: number | null, heavierOk: boolean): string | null {
  if (w == null) return "нет веса";
  if (s.limit != null && w > s.limit) return `тяжелее ${s.limit} кг`;
  if (!heavierOk && w <= slotMin(slots, s)) return `легче категории (до ${slotMin(slots, s)} кг)`;
  return null;
}

export const teamName = (st: CupState, id: string | null | undefined) =>
  id === DRAW ? "ничья" : st.teams.find((t) => t.id === id)?.name ?? "—";

export function memberOf(st: CupState, teamId: string, memberId: string | null | undefined) {
  if (!memberId) return null;
  return st.teams.find((t) => t.id === teamId)?.members.find((m) => m.id === memberId) ?? null;
}

/** Фактический состав стороны во встрече. */
export function lineupOf(st: CupState, m: Match, side: CupSide): Record<string, string | null> {
  const team = st.teams.find((t) => t.id === (side === "a" ? m.a : m.b));
  const own = st.meetings[m.id]?.lineup?.[side] ?? {};
  const out: Record<string, string | null> = {};
  for (const s of st.settings.slots) {
    const v = own[s.id] !== undefined ? own[s.id] : team?.roster[s.id] ?? null;
    out[s.id] = v && team?.members.some((x) => x.id === v) ? v : null;
  }
  return out;
}

export interface PairState {
  a: string | null;
  b: string | null;
  /** Пара не проводится — с обеих сторон никого. */
  void: boolean;
  wins: Record<CupSide, number>;
  winner: CupSide | null;
  walkover: boolean;
  /** Что ждём: рука первого/второго поединка, жребий, третий поединок. */
  step: "first" | "second" | "coin" | "third" | null;
  started: boolean;
}

export function pairState(r: CupPairRes | undefined, a: string | null, b: string | null, first: Hand): PairState {
  const wins = { a: 0, b: 0 };
  const base = { a, b, wins, started: false, walkover: false, void: false };
  if (!a && !b) return { ...base, void: true, winner: null, step: null };
  if (!a || !b) return { ...base, winner: a ? "a" : "b", walkover: true, step: null };
  const second = otherHand(first);
  const f = r?.[first] ?? null;
  const s = r?.[second] ?? null;
  if (f) wins[f]++;
  if (s) wins[s]++;
  const started = !!(f || s);
  if (!f) return { ...base, wins, started, winner: null, step: "first" };
  if (!s) return { ...base, wins, started, winner: null, step: "second" };
  if (f === s) return { ...base, wins, started, winner: f, step: null };
  if (!r?.coin) return { ...base, wins, started, winner: null, step: "coin" };
  if (!r.third) return { ...base, wins, started, winner: null, step: "third" };
  wins[r.third]++;
  return { ...base, wins, started, winner: r.third, step: null };
}

export interface MeetingState {
  pairs: Record<string, PairState>;
  score: Record<CupSide, number>;
  bouts: Record<CupSide, number>;
  weight: Record<CupSide, number | null>;
  remaining: number;
  /** Сторона, которая уже не может проиграть по парам. */
  clinched: CupSide | null;
  started: boolean;
  done: boolean;
  /** Итог: сторона, ничья или нет итога (нужно решение ГСК). */
  winner: CupSide | "draw" | null;
  how: "pairs" | "weight" | "manual" | "draw" | null;
  needManual: boolean;
}

export function meetingState(st: CupState, m: Match, allowDraw: boolean): MeetingState {
  const mt = st.meetings[m.id] ?? { res: {} };
  const la = lineupOf(st, m, "a");
  const lb = lineupOf(st, m, "b");
  const pairs: Record<string, PairState> = {};
  const score = { a: 0, b: 0 };
  const bouts = { a: 0, b: 0 };
  let remaining = 0;
  let started = false;
  for (const s of st.settings.slots) {
    const p = pairState(mt.res[s.id], la[s.id], lb[s.id], st.settings.firstHand);
    pairs[s.id] = p;
    if (p.started) started = true;
    if (p.void) continue;
    bouts.a += p.wins.a;
    bouts.b += p.wins.b;
    if (p.winner) score[p.winner]++;
    else remaining++;
  }
  const sum = (side: CupSide, l: Record<string, string | null>) => {
    let t = 0;
    for (const s of st.settings.slots) {
      if (pairs[s.id].void || !l[s.id]) continue;
      const w = memberOf(st, side === "a" ? m.a : m.b, l[s.id])?.weight;
      if (w == null) return null;
      t += w;
    }
    return Math.round(t * 10) / 10;
  };
  const weight = { a: sum("a", la), b: sum("b", lb) };
  const clinched: CupSide | null = score.a > score.b + remaining ? "a" : score.b > score.a + remaining ? "b" : null;
  const complete = remaining === 0 && Object.values(pairs).some((p) => !p.void);
  const done = complete || (!!mt.closed && !!clinched);
  let winner: MeetingState["winner"] = null;
  let how: MeetingState["how"] = null;
  let needManual = false;
  if (done) {
    if (score.a !== score.b) {
      winner = score.a > score.b ? "a" : "b";
      how = "pairs";
    } else if (weight.a != null && weight.b != null && weight.a !== weight.b) {
      winner = weight.a < weight.b ? "a" : "b";
      how = "weight";
    } else if (mt.manual) {
      winner = mt.manual;
      how = "manual";
    } else if (allowDraw) {
      winner = "draw";
      how = "draw";
    } else needManual = true;
  }
  return { pairs, score, bouts, weight, remaining, clinched, started: started || !!mt.closed, done, winner, how, needManual };
}

const isRR = (b: Bracket | undefined) => b?.system === "roundrobin";

export const bracketOf = (st: CupState, m: Match) => st.brackets.find((b) => b.key === m.key);

/** Записывает итог встреч в сетку и строит следующие туры. */
export function settleCup(st: CupState): CupState {
  let matches = st.matches.map((m) => {
    const ms = meetingState(st, m, isRR(bracketOf(st, m)));
    const w = ms.winner === "draw" ? DRAW : ms.winner ? (ms.winner === "a" ? m.a : m.b) : null;
    return w === m.winner ? m : { ...m, winner: w };
  });
  let order = st.order;
  let brackets = st.brackets;
  for (let guard = 0; guard < 100; guard++) {
    let changed = false;
    brackets = brackets.map((b) => {
      if (b.done) return b;
      if (matches.some((x) => x.key === b.key && !x.winner)) return b;
      const res = buildNextRound(b, matches, {}, order);
      if (res.newMatches.length || res.bracket.done !== b.done || res.bracket.round !== b.round) changed = true;
      matches = [...matches, ...res.newMatches];
      order += res.newMatches.length;
      return res.bracket;
    });
    if (!changed) break;
  }
  return { ...st, matches, brackets, order };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GROUP_NAMES = "АБВГДЕЖЗ";
export const groupName = (key: string) => (key.startsWith("g:") ? `Группа ${GROUP_NAMES[+key.slice(2)] ?? key.slice(2)}` : key === "po" ? "Плей-офф" : "");

function newBracket(key: string, ids: string[], system: Bracket["system"], third: boolean): Bracket {
  return { key, classKey: key, hand: "right", athletes: ids, round: 0, done: false, byes: [], table: 1, system, third };
}

/** Жеребьёвка: сетка встреч команд по выбранной системе. */
export function drawCup(st: CupState): CupState {
  const ids = shuffle(st.teams.filter((t) => t.name.trim()).map((t) => t.id));
  const s = st.settings;
  let brackets: Bracket[];
  if (s.system === "groups") {
    const g = Math.max(2, Math.min(s.groups, Math.floor(ids.length / 2)));
    const lists: string[][] = Array.from({ length: g }, () => []);
    ids.forEach((id, i) => {
      const row = Math.floor(i / g);
      lists[row % 2 ? g - 1 - (i % g) : i % g].push(id);
    });
    brackets = lists.map((l, i) => newBracket(`g:${i}`, l, "roundrobin", false));
  } else brackets = [newBracket("main", ids, s.system, s.third)];
  return settleCup({ ...st, brackets, matches: [], meetings: {}, current: null, order: 1 });
}

export interface CupRow {
  id: string;
  place: number;
  played: number;
  w: number;
  d: number;
  l: number;
  points: number;
  pf: number;
  pa: number;
  bf: number;
  ba: number;
  note?: string;
}

function tally(st: CupState, list: Match[], id: string) {
  const r = { played: 0, w: 0, d: 0, l: 0, pf: 0, pa: 0, bf: 0, ba: 0 };
  for (const m of list) {
    if (!m.winner || (m.a !== id && m.b !== id)) continue;
    const side: CupSide = m.a === id ? "a" : "b";
    const ms = meetingState(st, m, true);
    r.played++;
    if (m.winner === DRAW) r.d++;
    else if (m.winner === id) r.w++;
    else r.l++;
    r.pf += ms.score[side];
    r.pa += ms.score[otherSide(side)];
    r.bf += ms.bouts[side];
    r.ba += ms.bouts[otherSide(side)];
  }
  return r;
}

/** Таблица круговой: очки 2/1/0 → личная встреча → разница выигранных пар → выигранные пары → разница поединков. */
export function rrTable(st: CupState, b: Bracket): CupRow[] {
  const own = st.matches.filter((m) => m.key === b.key);
  const { win, draw, loss } = st.settings.pts;
  const rows: CupRow[] = b.athletes.map((id) => {
    const t = tally(st, own, id);
    return { id, place: 0, ...t, points: t.w * win + t.d * draw + t.l * loss };
  });
  const h2h = (x: string, y: string) => {
    const m = own.find((m) => m.winner && ((m.a === x && m.b === y) || (m.a === y && m.b === x)));
    return !m || m.winner === DRAW ? 0 : m.winner === x ? -1 : 1;
  };
  const tied = (r: CupRow) => rows.filter((o) => o.points === r.points).length;
  const cmp = (x: CupRow, y: CupRow) =>
    y.points - x.points ||
    (tied(x) === 2 ? h2h(x.id, y.id) : 0) ||
    y.pf - y.pa - (x.pf - x.pa) ||
    y.pf - x.pf ||
    y.bf - y.ba - (x.bf - x.ba);
  rows.sort(cmp);
  rows.forEach((r, i) => {
    r.place = i > 0 && cmp(rows[i - 1], r) === 0 ? rows[i - 1].place : i + 1;
    if (i === 0 || rows[i - 1].points !== r.points) return;
    const p = rows[i - 1];
    if (tied(r) === 2 && h2h(p.id, r.id)) r.note = `Очков поровну с «${teamName(st, p.id)}» — уступила в личной встрече.`;
    else if (p.pf - p.pa !== r.pf - r.pa) r.note = `Очков поровну с «${teamName(st, p.id)}» — меньше разница выигранных пар.`;
    else if (p.pf !== r.pf) r.note = `Очков и разницы пар поровну с «${teamName(st, p.id)}» — меньше выигранных пар.`;
    else if (r.place === p.place) r.note = `Полное равенство с «${teamName(st, p.id)}» — место делят (решение ГСК).`;
  });
  return rows;
}

/** Места в сетке на выбывание: кто выбыл позже — выше; выбывшие в одном туре делят место. */
function koTable(st: CupState, b: Bracket): CupRow[] {
  const own = st.matches.filter((m) => m.key === b.key);
  const sd = standings(b, own.filter((m) => m.winner && m.winner !== DRAW));
  const third = own.find((m) => m.group === "T" && m.winner);
  const bonus = (id: string) => (third?.winner === id ? 1 : 0);
  const rows: CupRow[] = b.athletes.map((id) => ({ id, place: 0, points: 0, ...tally(st, own, id) }));
  const key = (r: CupRow) => [sd[r.id]?.elimRound ?? Infinity, bonus(r.id), -(sd[r.id]?.losses ?? 0), sd[r.id]?.wins ?? 0];
  const cmp = (x: CupRow, y: CupRow) => {
    const a = key(x);
    const c = key(y);
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) return c[i] > a[i] ? 1 : -1;
    return 0;
  };
  rows.sort(cmp);
  rows.forEach((r, i) => (r.place = i > 0 && cmp(rows[i - 1], r) === 0 ? rows[i - 1].place : i + 1));
  return rows;
}

export function bracketTable(st: CupState, b: Bracket): CupRow[] {
  return b.system === "roundrobin" ? rrTable(st, b) : koTable(st, b);
}

const groupKeys = (st: CupState) => st.brackets.filter((b) => b.key.startsWith("g:")).map((b) => b.key);

export function groupsFinished(st: CupState) {
  const gk = groupKeys(st);
  return gk.length > 0 && st.matches.filter((m) => gk.includes(m.key)).every((m) => m.winner);
}

export const hasPlayoff = (st: CupState) => st.brackets.some((b) => b.key === "po");

/** Плей-офф после групп: крест A1–B2, B1–A2 (при 4 группах — A1–B2, C1–D2, B1–A2, D1–C2). */
export function buildPlayoff(st: CupState): CupState {
  const tables = st.brackets.filter((b) => b.key.startsWith("g:")).map((b) => rrTable(st, b));
  const k = Math.max(1, Math.min(st.settings.advance, ...tables.map((t) => t.length)));
  const at = (g: number, p: number) => tables[g]?.[p]?.id;
  const pairs: [string, string][] = [];
  const g = tables.length;
  if (k === 1) for (let i = 0; i + 1 < g; i += 2) pairs.push([at(i, 0)!, at(i + 1, 0)!]);
  else {
    for (let i = 0; i + 1 < g; i += 2) pairs.push([at(i, 0)!, at(i + 1, 1)!]);
    for (let i = 0; i + 1 < g; i += 2) pairs.push([at(i + 1, 0)!, at(i, 1)!]);
  }
  const valid = pairs.filter(([a, b]) => a && b);
  const ids = valid.flat();
  let order = st.order;
  const round = 1;
  const group: MatchGroup = valid.length === 1 ? "F" : "O";
  const newMatches: Match[] = valid.map(([a, b]) => ({ id: uid(), key: "po", round, group, a, b, winner: null, order: order++, table: 1 }));
  const b: Bracket = { ...newBracket("po", ids, "olympic", st.settings.third), round: 1 };
  return settleCup({ ...st, brackets: [...st.brackets.filter((x) => x.key !== "po"), b], matches: [...st.matches.filter((m) => m.key !== "po"), ...newMatches], order });
}

/** Итоговые места команд. */
export function finalTable(st: CupState): CupRow[] {
  if (st.settings.system !== "groups" || !st.brackets.some((b) => b.key.startsWith("g:"))) {
    const b = st.brackets[0];
    return b ? bracketTable(st, b) : [];
  }
  const po = st.brackets.find((b) => b.key === "po");
  const top = po ? koTable(st, po) : [];
  const inPo = new Set(top.map((r) => r.id));
  const groupRows = st.brackets
    .filter((b) => b.key.startsWith("g:"))
    .flatMap((b) => rrTable(st, b).map((r) => ({ ...r, gp: r.place })))
    .filter((r) => !inPo.has(r.id))
    .sort((x, y) => x.gp - y.gp || y.points - x.points || y.pf - y.pa - (x.pf - x.pa) || y.pf - x.pf);
  const start = top.length;
  const rest: CupRow[] = groupRows.map((r, i) => ({ ...r, place: start + i + 1, note: `${r.gp}-е место в группе` }));
  return [...top, ...rest];
}

export const ROUND_NAME = (m: Match, st: CupState) => {
  const b = bracketOf(st, m);
  if (m.group === "F") return "Финал";
  if (m.group === "SF") return "Суперфинал";
  if (m.group === "T") return "За 3-е место";
  if (b?.system === "roundrobin") return `${groupName(m.key) ? groupName(m.key) + ", " : ""}тур ${m.round}`;
  if (m.group === "A") return `Тур ${m.round}, группа «А»`;
  if (m.group === "B") return `Тур ${m.round}, группа «Б»`;
  return `${m.key === "po" ? "Плей-офф, " : ""}тур ${m.round}`;
};

/* ---------- хранение: общее для пульта и окна табло ---------- */

const KEY = "armsport-cup";

function read(): CupState {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return EMPTY_CUP;
    const p = JSON.parse(v) as Partial<CupState>;
    const settings = { ...EMPTY_CUP.settings, ...p.settings };
    if (!localStorage.getItem(`${KEY}:doubleDefault`)) {
      localStorage.setItem(`${KEY}:doubleDefault`, "1");
      if (!p.brackets?.length && settings.system === "roundrobin") settings.system = "double";
    }
    return { ...EMPTY_CUP, ...p, settings };
  } catch {
    return EMPTY_CUP;
  }
}

let cupState: CupState | null = null;
const subs = new Set<(n: CupState) => void>();
const get = () => (cupState ??= read());

function commit(next: CupState) {
  cupState = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* переполнение */
  }
  subs.forEach((f) => f(next));
}

let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    cupState = read();
    subs.forEach((f) => f(cupState!));
  });
}

export function useCup() {
  const [st, setSt] = useState<CupState>(EMPTY_CUP);
  useEffect(() => {
    listen();
    subs.add(setSt);
    setSt(get());
    return () => void subs.delete(setSt);
  }, []);
  const update = useCallback((fn: (p: CupState) => CupState) => commit(fn(get())), []);
  /** Изменение результата встречи — с пересчётом сетки. */
  const patchMeeting = useCallback(
    (id: string, fn: (m: CupMeeting) => CupMeeting) => {
      const p = get();
      commit(settleCup({ ...p, meetings: { ...p.meetings, [id]: fn(p.meetings[id] ?? { res: {} }) } }));
    },
    [],
  );
  return { cup: st, update, patchMeeting };
}

export const newMember = (): CupMember => ({ id: uid(), name: "", weight: null });
export const newTeam = (): CupTeam => ({ id: uid(), name: "", region: "", members: [], roster: {} });

export const fmtW = (w: number | null | undefined) => (w == null ? "—" : String(w).replace(".", ","));