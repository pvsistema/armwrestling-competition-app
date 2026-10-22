import { useCallback, useEffect, useState } from "react";
import type { Hand } from "./arm";

export type Side = "blue" | "red";
export const SIDE_LABEL: Record<Side, string> = { blue: "синий угол", red: "красный угол" };
export const other = (s: Side): Side => (s === "blue" ? "red" : "blue");

export interface Fighter {
  name: string;
  region: string;
  farId?: string;
  photo?: string;
  weight?: number | null;
  /** Титулы / рекорд — строка под именем на табло. */
  note?: string;
}

/** Событие боя. Всё состояние боя (раунды, фолы, ремень) выводится из журнала — «Отменить» просто убирает последнюю запись. */
export type FightEvent =
  | { t: "round"; w: Side; at: number }
  | { t: "foul"; s: Side; at: number }
  | { t: "slip"; at: number }
  | { t: "forfeit"; w: Side; reason: string; at: number };

export interface Fight {
  id: string;
  blue: Fighter;
  red: Fighter;
  hand: Hand;
  category: string;
  /** 5 — до 3 побед, 7 — до 4 побед. */
  bestOf: 5 | 7 | 3;
  title: boolean;
  main: boolean;
  log: FightEvent[];
}

export interface Timer {
  until: number;
  kind: "round" | "foul";
  fightId: string;
}

export interface FightNight {
  name: string;
  date: string;
  place: string;
  chiefJudge: string;
  secretary: string;
  restRound: number;
  restFoul: number;
  fights: Fight[];
  current: string | null;
  timer: Timer | null;
}

export interface RoundRes {
  n: number;
  w: Side;
  how: "pin" | "fouls";
  strap: boolean;
  fouls: Record<Side, number>;
  slips: number;
}

export interface FightState {
  rounds: RoundRes[];
  score: Record<Side, number>;
  need: number;
  fouls: Record<Side, number>;
  strap: boolean;
  slips: number;
  winner: Side | null;
  forfeit: { w: Side; reason: string } | null;
  /** Номер текущего (следующего) раунда. */
  round: number;
  started: boolean;
}

export function fightState(f: Fight): FightState {
  const need = Math.ceil(f.bestOf / 2);
  const rounds: RoundRes[] = [];
  const score: Record<Side, number> = { blue: 0, red: 0 };
  let fouls: Record<Side, number> = { blue: 0, red: 0 };
  let strap = false;
  let slips = 0;
  let forfeit: FightState["forfeit"] = null;
  const close = (w: Side, how: RoundRes["how"]) => {
    rounds.push({ n: rounds.length + 1, w, how, strap, fouls, slips });
    score[w]++;
    fouls = { blue: 0, red: 0 };
    strap = false;
    slips = 0;
  };
  for (const e of f.log) {
    if (forfeit || score.blue >= need || score.red >= need) break;
    if (e.t === "round") close(e.w, "pin");
    else if (e.t === "foul") {
      fouls = { ...fouls, [e.s]: fouls[e.s] + 1 };
      if (fouls[e.s] >= 2) close(other(e.s), "fouls");
    } else if (e.t === "slip") {
      slips++;
      strap = true;
    } else if (e.t === "forfeit") forfeit = { w: e.w, reason: e.reason };
  }
  const winner = forfeit?.w ?? (score.blue >= need ? "blue" : score.red >= need ? "red" : null);
  return { rounds, score, need, fouls, strap, slips, winner, forfeit, round: rounds.length + 1, started: f.log.length > 0 };
}

export const HAND_SHORT: Record<Hand, string> = { right: "Правая рука", left: "Левая рука" };
export const formatLabel = (b: Fight["bestOf"]) => `до ${Math.ceil(b / 2)} побед из ${b}`;

const KEY = "armsport-fights";
const PING = "armsport-fights-ping";

export const EMPTY_NIGHT: FightNight = {
  name: "Вечер армфайтов",
  date: "",
  place: "",
  chiefJudge: "",
  secretary: "",
  restRound: 60,
  restFoul: 30,
  fights: [],
  current: null,
  timer: null,
};

function read(): FightNight {
  try {
    const v = localStorage.getItem(KEY);
    return v ? { ...EMPTY_NIGHT, ...JSON.parse(v) } : EMPTY_NIGHT;
  } catch {
    return EMPTY_NIGHT;
  }
}

let state: FightNight = read();
const subs = new Set<(n: FightNight) => void>();

function commit(next: FightNight) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* переполнение — фото слишком большие */
  }
  localStorage.setItem(PING, String(Date.now()));
  subs.forEach((f) => f(state));
}

if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === PING) {
      state = read();
      subs.forEach((f) => f(state));
    }
  });

export const fid = () => Math.random().toString(36).slice(2, 10);

/** Вечер армфайтов: состояние общее для пульта и окна табло. */
export function useFights() {
  const [n, setN] = useState<FightNight>(state);
  useEffect(() => {
    subs.add(setN);
    setN(state);
    return () => void subs.delete(setN);
  }, []);
  const update = useCallback((fn: (p: FightNight) => FightNight) => commit(fn(state)), []);
  const patchFight = useCallback(
    (id: string, fn: (f: Fight) => Fight) => commit({ ...state, fights: state.fights.map((f) => (f.id === id ? fn(f) : f)) }),
    [],
  );
  return { night: n, update, patchFight };
}

/** Записать событие в бой; после раунда/фола сам запускается таймер отдыха. */
export function pushEvent(id: string, e: FightEvent) {
  const f = state.fights.find((x) => x.id === id);
  if (!f) return;
  const before = fightState(f);
  if (before.winner) return;
  const nf = { ...f, log: [...f.log, e] };
  const after = fightState(nf);
  let timer = state.timer;
  if (!after.winner) {
    if (after.rounds.length > before.rounds.length) timer = { until: Date.now() + state.restRound * 1000, kind: "round", fightId: id };
    else if (e.t === "foul") timer = { until: Date.now() + state.restFoul * 1000, kind: "foul", fightId: id };
  } else timer = null;
  commit({ ...state, fights: state.fights.map((x) => (x.id === id ? nf : x)), timer, current: id });
}

export function undoEvent(id: string) {
  const f = state.fights.find((x) => x.id === id);
  if (!f || !f.log.length) return;
  commit({ ...state, fights: state.fights.map((x) => (x.id === id ? { ...f, log: f.log.slice(0, -1) } : x)), timer: null });
}

export function startTimer(kind: Timer["kind"], fightId: string, sec?: number) {
  commit({ ...state, timer: { until: Date.now() + (sec ?? (kind === "round" ? state.restRound : state.restFoul)) * 1000, kind, fightId } });
}
export const stopTimer = () => commit({ ...state, timer: null });

const COUNTRIES: Record<string, string> = {
  россия: "ru", грузия: "ge", канада: "ca", сша: "us", казахстан: "kz", беларусь: "by", белоруссия: "by", украина: "ua", армения: "am",
  азербайджан: "az", турция: "tr", болгария: "bg", польша: "pl", литва: "lt", латвия: "lv", эстония: "ee", узбекистан: "uz",
  киргизия: "kg", кыргызстан: "kg", таджикистан: "tj", швеция: "se", финляндия: "fi", норвегия: "no", италия: "it", германия: "de",
  франция: "fr", великобритания: "gb", англия: "gb", бразилия: "br", индия: "in", япония: "jp", иран: "ir", сербия: "rs",
  венгрия: "hu", румыния: "ro", молдова: "md", монголия: "mn", израиль: "il", испания: "es", чехия: "cz", словакия: "sk",
  греция: "gr", австрия: "at", швейцария: "ch", нидерланды: "nl", бельгия: "be", дания: "dk", ирландия: "ie", португалия: "pt",
  австралия: "au", "новая зеландия": "nz", "южная африка": "za", юар: "za", египет: "eg", китай: "cn", корея: "kr",
  "южная корея": "kr", филиппины: "ph", мексика: "mx", аргентина: "ar", чили: "cl", колумбия: "co", перу: "pe", туркменистан: "tm",
  хорватия: "hr", словения: "si", черногория: "me", македония: "mk", босния: "ba", албания: "al", кипр: "cy", исландия: "is",
};
/** Флаг страны (для иностранных спортсменов) — по названию страны на русском. Нужен интернет. */
export function countryFlag(region: string): string | null {
  const k = region.toLowerCase().replace(/ё/g, "е").trim();
  const code = COUNTRIES[k];
  return code ? `https://flagcdn.com/w160/${code}.png` : null;
}

export const DEMO_FIGHTS: Omit<Fight, "id" | "log">[] = [
  {
    blue: { name: "Леван Сагинашвили", region: "Грузия", note: "Чемпион мира" },
    red: { name: "Девон Ларратт", region: "Канада", note: "Претендент" },
    hand: "right",
    category: "Супертяжёлый вес",
    bestOf: 7,
    title: true,
    main: true,
  },
  {
    blue: { name: "Виталий Лалетин", region: "Россия" },
    red: { name: "Артём Морозов", region: "Россия" },
    hand: "right",
    category: "Супертяжёлый вес",
    bestOf: 5,
    title: false,
    main: false,
  },
  {
    blue: { name: "Ирина Макеева", region: "Россия" },
    red: { name: "Сара Бэкман", region: "США" },
    hand: "left",
    category: "Женщины, до 70 кг",
    bestOf: 5,
    title: false,
    main: false,
  },
];

/** Фамилия для табло: «Фамилия Имя Отчество» (как в ФАР) → первое слово, «Имя Фамилия» → последнее. */
export function fighterSurname(f: Pick<Fighter, "name" | "farId">) {
  const p = f.name.trim().split(/\s+/);
  if (p.length < 2) return f.name;
  return p.length >= 3 || f.farId ? p[0] : p[p.length - 1];
}
