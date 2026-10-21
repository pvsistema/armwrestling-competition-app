import { Match } from "./arm";

export function pendingQueue(matches: Match[], table: number | "all") {
  return matches
    .filter((m) => !m.winner && (table === "all" || m.table === table))
    .sort((a, b) => a.round - b.round || a.order - b.order);
}
