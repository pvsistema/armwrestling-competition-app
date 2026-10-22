import { Bracket, Hand, Tournament, firstHandOf, handFlowOf, isAbsKey } from "./arm";

export interface SlotItem {
  key: string;
  classKey: string;
  hand: Hand;
  table: number;
  athletes: string[];
  matches: number;
  start: number;
  end: number;
}

export interface Phase {
  id: number;
  title: string;
  items: SlotItem[];
}

export const schedStart = (t: Tournament) => t.scheduleStart || "10:00";
export const schedMatch = (t: Tournament) => (t.matchMin && t.matchMin > 0 ? t.matchMin : 1.5);
export const schedBreak = (t: Tournament) => (t.handBreakMin != null && t.handBreakMin >= 0 ? t.handBreakMin : 15);

const log2c = (n: number) => Math.max(1, Math.ceil(Math.log2(Math.max(2, n))));

/** Оценка числа схваток и туров в сетке. */
export function estimate(b: Pick<Bracket, "athletes" | "system" | "third">) {
  const n = b.athletes.length;
  if (n < 2) return { matches: 0, rounds: 0 };
  const sys = b.system ?? "double";
  if (sys === "roundrobin") return { matches: (n * (n - 1)) / 2, rounds: n % 2 ? n : n - 1 };
  if (sys === "olympic") return { matches: n - 1 + (b.third && n >= 4 ? 1 : 0), rounds: log2c(n) };
  return { matches: 2 * n - 2, rounds: 2 * log2c(n) };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
};

export const fmtTime = (min: number) => {
  const m = Math.round(min);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * Расписание по столам. Порядок как на пульте: первая рука, вторая рука, затем абсолютное первенство.
 * Категории одного стола идут вперемешку по турам, поэтому все стартуют вместе с началом блока.
 */
export function buildSchedule(brackets: Bracket[], t: Tournament, classOrder: string[]) {
  const per = schedMatch(t);
  const brk = schedBreak(t);
  const first = firstHandOf(t);
  const flow = handFlowOf(t);
  const tables = Math.max(1, t.tables, ...brackets.map((b) => b.table));
  const phaseOf = (b: Bracket) => (isAbsKey(b.classKey) ? 2 : 0) + (b.hand === first ? 0 : 1);
  const titles = ["Первая рука", "Вторая рука", "Абсолютное первенство · первая рука", "Абсолютное первенство · вторая рука"];

  const cursor = Array.from({ length: tables }, () => toMin(schedStart(t)));
  const phases: Phase[] = [];

  for (let ph = 0; ph < 4; ph++) {
    const list = brackets.filter((b) => phaseOf(b) === ph && b.athletes.length > 1);
    if (!list.length) continue;
    if (ph > 0 && phases.length) {
      const pause = ph === 1 || ph === 2 ? brk : 0;
      if (flow === "all") {
        const m = Math.max(...cursor);
        cursor.fill(m + pause);
      } else for (let i = 0; i < tables; i++) cursor[i] += pause;
    }
    const items: SlotItem[] = [];
    for (let tb = 1; tb <= tables; tb++) {
      const own = list
        .filter((b) => b.table === tb)
        .sort((a, b) => classOrder.indexOf(a.classKey) - classOrder.indexOf(b.classKey));
      if (!own.length) continue;
      const start = cursor[tb - 1];
      const est = own.map((b) => estimate(b));
      const maxR = Math.max(...est.map((e) => e.rounds));
      let clock = start;
      const end: number[] = own.map(() => start);
      for (let r = 1; r <= maxR; r++)
        own.forEach((_, i) => {
          if (r > est[i].rounds) return;
          clock += (est[i].matches / est[i].rounds) * per;
          end[i] = clock;
        });
      own.forEach((b, i) =>
        items.push({ key: b.key, classKey: b.classKey, hand: b.hand, table: tb, athletes: b.athletes, matches: est[i].matches, start, end: end[i] }),
      );
      cursor[tb - 1] = clock;
    }
    phases.push({ id: ph, title: titles[ph], items });
  }
  return { phases, finish: Math.max(...cursor), tables };
}
