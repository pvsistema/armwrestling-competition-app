import { Hand, Match, Tournament, firstHandOf } from "./arm";

type QT = Pick<Tournament, "firstHand" | "handStages" | "secondHandOpen">;

const handOf = (m: Match): Hand => (m.key.endsWith("|left") ? "left" : "right");
const isAbs = (m: Match) => m.key.includes(":abs|");

/** Этап турнира: какая рука сейчас идёт по всем столам. */
export function handStage(matches: Match[], t?: QT) {
  const first = firstHandOf(t ?? {});
  const firstLeft = matches.filter((m) => !m.winner && m.group !== "X" && !isAbs(m) && handOf(m) === first).length;
  const firstTotal = matches.filter((m) => m.group !== "X" && !isAbs(m) && handOf(m) === first).length;
  const gated = (t?.handStages ?? true) && !t?.secondHandOpen && firstLeft > 0;
  return { first, second: (first === "left" ? "right" : "left") as Hand, firstLeft, firstTotal, gated };
}

/**
 * Очередь схваток стола. Сначала первая рука во всех категориях, затем вторая,
 * затем абсолютное первенство и решающие поединки.
 * Пока на любом столе идёт первая рука, вторая не выдаётся (если включены этапы).
 */
export function pendingQueue(matches: Match[], table: number | "all", t?: QT) {
  const st = handStage(matches, t);
  const rank = (m: Match) => (m.group === "X" ? 4 : 0) + (isAbs(m) ? 2 : 0) + (handOf(m) === st.first ? 0 : 1);
  return matches
    .filter((m) => !m.winner && (table === "all" || m.table === table))
    .filter((m) => !st.gated || m.group === "X" || isAbs(m) || handOf(m) === st.first)
    .sort((a, b) => rank(a) - rank(b) || a.round - b.round || a.order - b.order);
}

/** Сколько схваток второй руки ждут на столе, пока идёт первая. */
export function waitingSecond(matches: Match[], table: number | "all", t?: QT) {
  const st = handStage(matches, t);
  if (!st.gated) return 0;
  return matches.filter((m) => !m.winner && (table === "all" || m.table === table) && handOf(m) === st.second && !isAbs(m) && m.group !== "X").length;
}

export const CALL_LIMIT = 60;

/** Сколько секунд осталось на выход к столу после вызова (п. 11.2). */
export function callLeft(m: { calledAt?: number }, now: number) {
  if (!m.calledAt) return null;
  return Math.max(0, CALL_LIMIT - Math.floor((now - m.calledAt) / 1000));
}
