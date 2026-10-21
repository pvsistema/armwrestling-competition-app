/**
 * Папка турнира на компьютере (Chrome, Edge, Яндекс Браузер).
 * Секретарь один раз выбирает папку — дальше протоколы раскладываются по подпапкам:
 * «Левая рука», «Правая рука», «Общий», «Полный протокол», «Листы судей», «Копии турнира».
 * Если браузер не умеет работать с папками или доступ не дан — файл уходит в «Загрузки».
 */

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
};

const DB = "armsport-fs";
const STORE = "handles";
const KEY = "tournament-folder";
const EVT = "armsport-folder-change";

export const FOLDERS = {
  left: "Левая рука",
  right: "Правая рука",
  biathlon: "Общий",
  full: "Полный протокол",
  sheets: "Листы судей",
  backup: "Копии турнира",
} as const;

export function folderSupported() {
  try {
    return typeof window !== "undefined" && "showDirectoryPicker" in window && window.self === window.top;
  } catch {
    return false;
  }
}

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

let cached: DirHandle | null | undefined;

export async function getFolder(): Promise<DirHandle | null> {
  if (cached !== undefined) return cached;
  if (!folderSupported()) return (cached = null);
  try {
    cached = ((await idb("readonly", (s) => s.get(KEY))) as DirHandle | undefined) ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function pickFolder(): Promise<DirHandle | null> {
  if (!folderSupported()) return null;
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
  const h = await picker({ id: "armsport", mode: "readwrite", startIn: "documents" });
  await idb("readwrite", (s) => s.put(h, KEY));
  cached = h;
  window.dispatchEvent(new Event(EVT));
  return h;
}

export async function forgetFolder() {
  try {
    await idb("readwrite", (s) => s.delete(KEY));
  } catch {
    /* ignore */
  }
  cached = null;
  window.dispatchEvent(new Event(EVT));
}

export const onFolderChange = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
};

async function allowed(h: DirHandle) {
  if (!h.queryPermission) return true;
  if ((await h.queryPermission({ mode: "readwrite" })) === "granted") return true;
  if (!h.requestPermission) return false;
  try {
    return (await h.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/** Заранее спросить доступ к папке — пока действие пользователя ещё «свежее». */
export async function warmFolder() {
  const h = await getFolder();
  if (h) await allowed(h);
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface Saved {
  where: "folder" | "downloads";
  path: string;
}

let lastSaved: Saved | null = null;
export const lastSave = () => lastSaved;

/** Сохраняет файл в папку турнира (подпапка sub) или в «Загрузки». */
export async function saveFile(blob: Blob, name: string, sub?: string): Promise<Saved> {
  const h = await getFolder();
  if (h && (await allowed(h))) {
    try {
      const dir = sub ? await h.getDirectoryHandle(sub, { create: true }) : h;
      const fh = await dir.getFileHandle(name, { create: true });
      const w = await (fh as FileSystemFileHandle & { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
      await w.write(blob);
      await w.close();
      lastSaved = { where: "folder", path: [h.name, sub, name].filter(Boolean).join(" / ") };
      return lastSaved;
    } catch {
      /* упадём в «Загрузки» */
    }
  }
  downloadBlob(blob, name);
  lastSaved = { where: "downloads", path: name };
  return lastSaved;
}

export const savedText = (s: Saved) => (s.where === "folder" ? `Папка: ${s.path}` : `Загрузки: ${s.path}`);

/** Есть ли доступ к папке без вопроса пользователю (для фонового сохранения). */
export async function folderReady(): Promise<"none" | "ask" | "ok"> {
  const h = await getFolder();
  if (!h) return "none";
  if (!h.queryPermission) return "ok";
  return (await h.queryPermission({ mode: "readwrite" })) === "granted" ? "ok" : "ask";
}

/** Тихое сохранение: только в папку, без «Загрузок» и без вопросов. */
export async function saveQuiet(blob: Blob, name: string, sub: string, keep?: { prefix: string; count: number }) {
  const h = await getFolder();
  if (!h || (await folderReady()) !== "ok") return null;
  const dir = await h.getDirectoryHandle(sub, { create: true });
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await (fh as FileSystemFileHandle & { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
  await w.write(blob);
  await w.close();
  if (keep) {
    const names: string[] = [];
    for await (const [n] of (dir as unknown as { entries: () => AsyncIterable<[string, unknown]> }).entries())
      if (n.startsWith(keep.prefix)) names.push(n);
    names.sort();
    for (const n of names.slice(0, Math.max(0, names.length - keep.count))) await dir.removeEntry(n).catch(() => undefined);
  }
  return [h.name, sub, name].join(" / ");
}
