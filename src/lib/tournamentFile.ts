import type { State } from "./store";

const FORMAT = "armsport-tournament";
const VERSION = 1;

export function saveTournamentFile(state: State) {
  const payload = { format: FORMAT, version: VERSION, savedAt: new Date().toISOString(), data: state };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}_${String(date.getHours()).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}`;
  const base = (state.tournament.name || "turnir").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 60) || "turnir";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${base}_${stamp}.armsport.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readTournamentFile(file: File): Promise<State> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Файл повреждён или это не файл турнира");
  }
  const p = parsed as { format?: string; data?: State };
  const data = p?.format === FORMAT ? p.data : (parsed as State);
  if (
    !data ||
    typeof data !== "object" ||
    !data.tournament ||
    !Array.isArray(data.athletes) ||
    !Array.isArray(data.groups) ||
    !Array.isArray(data.brackets) ||
    !Array.isArray(data.matches)
  ) {
    throw new Error("Это не файл турнира Армспорт");
  }
  return { ...data, order: typeof data.order === "number" ? data.order : data.matches.length + 1 };
}
