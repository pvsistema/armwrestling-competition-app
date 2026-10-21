import { Hand, Match, Tournament, firstHandOf, handFlowOf } from "./arm";

type QT = Pick<Tournament, "firstHand" | "handStages" | "handFlow" | "secondHandOpen">;

const handOf = (m: Match): Hand => (m.key.endsWith("|left") ? "left" : "right");
const isAbs = (m: Match) => m.key.includes(":abs|");
const main = (m: Match) => m.group !== "X" && !isAbs(m);

/** Этап турнира: какая рука сейчас идёт. */
export function handStage(matches: Match[], t?: QT) {
  const tt = t ?? {};
  const first = firstHandOf(tt);
  const flow = handFlowOf(tt);
  const firstAll = matches.filter((m) => main(m) && handOf(m) === first);
  const firstLeft = firstAll.filter((m) => !m.winner).length;
  const firstTotal = firstAll.length;
  const gated = flow === "all" && !tt.secondHandOpen && firstLeft > 0;
  const busyTables = new Set(firstAll.filter((m) => !m.winner).map((m) => m.table));
  const secondStarted = matches.some((m) => main(m) && handOf(m) !== first && (m.winner || m.calledAt || m.pen));
  return {
    first,
    second: (first === "left" ? "right" : "left") as Hand,
    flow,
    firstLeft,
    firstTotal,
    gated,
    busyTables,
    secondStarted,
  };
}

/** Схватку второй руки пока нельзя выдавать. */
function blocked(m: Match, st: ReturnType<typeof handStage>, t?: QT) {
  if (!main(m) || handOf(m) === st.first) return false;
  if (st.flow === "all") return st.gated;
  if (st.flow === "table") return !t?.secondHandOpen && st.busyTables.has(m.table);
  return false;
}

/**
 * Очередь схваток стола: сначала первая рука, затем вторая, затем абсолютное первенство и решающие поединки.
 * table — стол начинает вторую руку, как только закончил первую; all — ждёт все столы.
 */
export function pendingQueue(matches: Match[], table: number | "all", t?: QT) {
  const st = handStage(matches, t);
  const rank = (m: Match) => (m.group === "X" ? 4 : 0) + (isAbs(m) ? 2 : 0) + (handOf(m) === st.first ? 0 : 1);
  return matches
    .filter((m) => !m.winner && (table === "all" || m.table === table))
    .filter((m) => !blocked(m, st, t))
    .sort((a, b) => rank(a) - rank(b) || a.round - b.round || a.order - b.order);
}

/** Сколько схваток второй руки на столе ждут окончания первой. */
export function waitingSecond(matches: Match[], table: number | "all", t?: QT) {
  const st = handStage(matches, t);
  return matches.filter((m) => !m.winner && (table === "all" || m.table === table) && blocked(m, st, t)).length;
}

/** Первая рука на столе: сколько осталось. */
export function tableFirstLeft(matches: Match[], table: number, t?: QT) {
  const first = firstHandOf(t ?? {});
  const own = matches.filter((m) => m.table === table && main(m) && handOf(m) === first);
  return { left: own.filter((m) => !m.winner).length, total: own.length };
}

/**
 * Перерыв на столе: первая рука здесь закончена, а вторая ещё не началась
 * (никого не вызвали, не отмечено ни одной схватки и фола).
 */
export function tableBreak(matches: Match[], table: number, t?: QT) {
  const first = firstHandOf(t ?? {});
  const own = matches.filter((m) => m.table === table && main(m));
  const f = own.filter((m) => handOf(m) === first);
  const s = own.filter((m) => handOf(m) !== first);
  if (!f.length || f.some((m) => !m.winner) || !s.length) return false;
  return !s.some((m) => m.winner || m.calledAt || m.pen);
}

/** Общий перерыв: первая рука закончена на всех столах, вторая нигде не началась. */
export function globalBreak(matches: Match[], t?: QT) {
  const st = handStage(matches, t);
  const hasSecond = matches.some((m) => main(m) && handOf(m) !== st.first);
  return st.firstTotal > 0 && st.firstLeft === 0 && hasSecond && !st.secondStarted;
}

export const CALL_LIMIT = 60;

/** Сколько секунд осталось на выход к столу после вызова (п. 11.2). */
export function callLeft(m: { calledAt?: number }, now: number) {
  if (!m.calledAt) return null;
  return Math.max(0, CALL_LIMIT - Math.floor((now - m.calledAt) / 1000));
}
