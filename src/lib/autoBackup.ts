import { useCallback, useEffect, useRef, useState } from "react";
import type { State } from "./store";
import { FOLDERS, folderReady, onFolderChange, saveQuiet, warmFolder } from "./saveFolder";
import { tournamentBlob } from "./tournamentFile";

const LS = "armsport-autobackup";
export const BACKUP_EVERY_MIN = 15;
const KEEP = 48;
const PREFIX = "Автокопия_";

type Cfg = { on: boolean };
const readCfg = (): Cfg => {
  try {
    return { on: true, ...JSON.parse(localStorage.getItem(LS) || "{}") };
  } catch {
    return { on: true };
  }
};

export type BackupStatus = {
  on: boolean;
  folder: "none" | "ask" | "ok";
  lastAt: number | null;
  lastPath: string | null;
  error: string | null;
};

const stamp = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;

/** Каждые 15 минут сохраняет копию турнира в «Копии турнира», если что-то изменилось. Хранит последние 48 копий (12 часов). */
export function useAutoBackup(state: State) {
  const [cfg, setCfg] = useState<Cfg>(readCfg);
  const [st, setSt] = useState<Omit<BackupStatus, "on">>({ folder: "none", lastAt: null, lastPath: null, error: null });
  const stateRef = useRef(state);
  const savedJson = useRef<string | null>(null);
  stateRef.current = state;

  const refresh = useCallback(() => folderReady().then((f) => setSt((p) => ({ ...p, folder: f }))), []);
  useEffect(() => {
    refresh();
    return onFolderChange(refresh);
  }, [refresh]);

  const run = useCallback(async (force = false) => {
    const s = stateRef.current;
    if (!s.athletes.length && !s.brackets.length) return;
    const json = JSON.stringify({ ...s, tournament: { ...s.tournament } });
    if (!force && json === savedJson.current) return;
    try {
      const name = `${PREFIX}${stamp(new Date())}.armsport.json`;
      const path = await saveQuiet(tournamentBlob(s), name, FOLDERS.backup, { prefix: PREFIX, count: KEEP });
      if (path) {
        savedJson.current = json;
        setSt((p) => ({ ...p, lastAt: Date.now(), lastPath: path, error: null, folder: "ok" }));
      } else refresh();
    } catch (e) {
      setSt((p) => ({ ...p, error: (e as Error).message }));
    }
  }, [refresh]);

  useEffect(() => {
    if (!cfg.on) return;
    const t = setInterval(() => run(), BACKUP_EVERY_MIN * 60 * 1000);
    return () => clearInterval(t);
  }, [cfg.on, run]);

  useEffect(() => {
    if (!cfg.on) return;
    const save = () => document.visibilityState === "hidden" && run();
    document.addEventListener("visibilitychange", save);
    return () => document.removeEventListener("visibilitychange", save);
  }, [cfg.on, run]);

  const toggle = (on: boolean) => {
    localStorage.setItem(LS, JSON.stringify({ on }));
    setCfg({ on });
  };

  const allow = async () => {
    await warmFolder();
    await refresh();
    await run(true);
  };

  return { status: { ...st, on: cfg.on } as BackupStatus, toggle, allow, saveNow: () => run(true) };
}
