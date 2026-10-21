import { Match } from "./arm";

export function pendingQueue(matches: Match[], table: number | "all") {
  return matches
    .filter((m) => !m.winner && (table === "all" || m.table === table))
    .sort((a, b) => handRank(a) - handRank(b) || a.round - b.round || a.order - b.order);
}

/** Сначала проводится борьба на левой руке, затем на правой. */
function handRank(m: Match) {
  return m.key.endsWith("|left") ? 0 : 1;
}
