import { useCallback, useEffect, useRef, useState } from "react";
import type { State } from "./store";
import { FOLDERS, folderReady, onFolderChange, saveQuiet, warmFolder } from "./saveFolder";
import { tournamentBlob } from "./tournamentFile";

const LS = "armsport-autobackup";
export const BACKUP_EVERY_MIN = 3;
export const BACKUP_OPTIONS = [1, 3, 5, 10, 15, 30];
/** Сколько копий хранить: последние 12 часов, но не меньше 48 и не больше 240. */
export const keepFor = (every: number) => Math.min(240, Math.max(48, Math.round((12 * 60) / every)));
const PREFIX = "Автокопия_";

type Cfg = { on: boolean; every: number };
const readCfg = (): Cfg => {
  try {
    const c = { on: true, every: BACKUP_EVERY_MIN, ...JSON.parse(localStorage.getItem(LS) || "{}") } as Cfg;
    if (!BACKUP_OPTIONS.includes(c.every)) c.every = BACKUP_EVERY_MIN;
    return c;
  } catch {
    return { on: true, every: BACKUP_EVERY_MIN };
  }
};

export type BackupStatus = {
  on: boolean;
  every: number;
  folder: "none" | "ask" | "ok";
  lastAt: number | null;
  lastPath: string | null;
  error: string | null;
};

const stamp = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;

/** Каждые N минут (по умолчанию 3) сохраняет копию турнира в «Копии турнира», если что-то изменилось. Хранит копии за последние 12 часов. */
export function useAutoBackup(state: State) {
  const [cfg, setCfg] = useState<Cfg>(readCfg);
  const [st, setSt] = useState<Omit<BackupStatus, "on" | "every">>({ folder: "none", lastAt: null, lastPath: null, error: null });
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
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
      const path = await saveQuiet(tournamentBlob(s), name, FOLDERS.backup, { prefix: PREFIX, count: keepFor(cfgRef.current.every) });
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
    const t = setInterval(() => run(), cfg.every * 60 * 1000);
    return () => clearInterval(t);
  }, [cfg.on, cfg.every, run]);

  useEffect(() => {
    if (!cfg.on) return;
    const save = () => document.visibilityState === "hidden" && run();
    document.addEventListener("visibilitychange", save);
    return () => document.removeEventListener("visibilitychange", save);
  }, [cfg.on, run]);

  const save = (c: Cfg) => {
    localStorage.setItem(LS, JSON.stringify(c));
    setCfg(c);
  };
  const toggle = (on: boolean) => save({ ...cfg, on });
  const setEvery = (every: number) => save({ ...cfg, every, on: true });

  const allow = async () => {
    await warmFolder();
    await refresh();
    await run(true);
  };

  return { status: { ...st, on: cfg.on, every: cfg.every } as BackupStatus, toggle, setEvery, allow, saveNow: () => run(true) };
}
