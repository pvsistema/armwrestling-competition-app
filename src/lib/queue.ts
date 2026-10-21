import { Match } from "./arm";

export function pendingQueue(matches: Match[], table: number | "all") {
  return matches
    .filter((m) => !m.winner && (table === "all" || m.table === table))
    .sort((a, b) => handRank(a) - handRank(b) || a.round - b.round || a.order - b.order);
}

/** Сначала проводится борьба на левой руке, затем на правой. */
function handRank(m: Match) {
  const abs = m.key.includes(":abs|") ? 2 : 0;
  const x = m.group === "X" ? 4 : 0;
  return x + abs + (m.key.endsWith("|left") ? 0 : 1);
}

export const CALL_LIMIT = 60;

/** Сколько секунд осталось на выход к столу после вызова (п. 11.2). */
export function callLeft(m: { calledAt?: number }, now: number) {
  if (!m.calledAt) return null;
  return Math.max(0, CALL_LIMIT - Math.floor((now - m.calledAt) / 1000));
}
