import { Gender } from "./arm";

export interface FarPassport {
  id: string;
  name: string;
  gender: Gender | "";
  rank: string;
  birthDate: string;
  region: string;
  district: string;
}

export interface Raw {
  updated: string;
  siteUpdated?: string;
  regions: [string, string][];
  p: [string, string, string, string, string, number][];
}

export interface FarBase {
  updated: string;
  siteUpdated?: string;
  local: boolean;
  list: FarPassport[];
  byId: Map<string, FarPassport>;
}

const DB = "armsport-far";
const STORE = "base";

function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | undefined> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return res(undefined);
    const o = indexedDB.open(DB, 1);
    o.onupgradeneeded = () => o.result.createObjectStore(STORE);
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const tx = o.result.transaction(STORE, mode);
      const r = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        o.result.close();
        res(r.result as T);
      };
      tx.onerror = () => rej(tx.error);
    };
  });
}

const readLocal = () => idb<Raw>("readonly", (s) => s.get("raw")).catch(() => undefined);
const writeLocal = (raw: Raw) => idb("readwrite", (s) => s.put(raw, "raw"));

function build(d: Raw, local: boolean): FarBase {
  const list = d.p.map(([id, name, gender, rank, birthDate, ri]) => ({
    id,
    name,
    gender: gender as Gender | "",
    rank,
    birthDate,
    region: d.regions[ri]?.[0] ?? "",
    district: d.regions[ri]?.[1] ?? "",
  }));
  return { updated: d.updated, siteUpdated: d.siteUpdated, local, list, byId: new Map(list.map((x) => [x.id, x])) };
}

async function loadBundled(): Promise<Raw> {
  const r = await fetch(`${import.meta.env.BASE_URL}far-passports.json`);
  if (!r.ok) throw new Error("Не удалось загрузить базу паспортов ФАР");
  return r.json();
}

let cache: Promise<FarBase> | null = null;
const listeners = new Set<(b: FarBase) => void>();

/** Справочник паспортов ФАР: обновлённая копия на этом компьютере или встроенная в программу. */
export function loadFar(): Promise<FarBase> {
  cache ??= (async () => {
    const local = await readLocal();
    if (local?.p?.length) return build(local, true);
    return build(await loadBundled(), false);
  })().catch((e) => {
    cache = null;
    throw e;
  });
  return cache;
}

/** Подписка на замену базы после обновления. */
export function onFarChange(fn: (b: FarBase) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function saveFar(raw: Raw): Promise<FarBase> {
  await writeLocal(raw);
  const b = build(raw, true);
  cache = Promise.resolve(b);
  listeners.forEach((f) => f(b));
  return b;
}

export const normName = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

/** Поиск по фамилии / ФИО / номеру паспорта. */
export function searchFar(base: FarBase, q: string, limit = 8): FarPassport[] {
  const s = normName(q);
  if (s.length < 2) return [];
  if (/^\d{3,}$/.test(s)) return base.list.filter((x) => x.id.includes(s)).slice(0, limit);
  const words = s.split(" ");
  const out: FarPassport[] = [];
  for (const x of base.list) {
    const n = normName(x.name);
    const parts = n.split(" ");
    if (words.every((w, i) => (parts[i] ?? "").startsWith(w) || (i > 0 && n.includes(w)))) {
      out.push(x);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Ищет паспорт участника: по ФИО и (если есть) году рождения. Возвращает единственное совпадение. */
export function matchFar(base: FarBase, name: string, birthYear?: number): FarPassport | null {
  const s = normName(name);
  if (!s) return null;
  const cand = base.list.filter((x) => {
    const n = normName(x.name);
    return n === s || n.startsWith(s + " ");
  });
  const byYear = birthYear ? cand.filter((x) => !x.birthDate || x.birthDate.startsWith(String(birthYear))) : cand;
  const exactYear = birthYear ? byYear.filter((x) => x.birthDate.startsWith(String(birthYear))) : [];
  if (exactYear.length === 1) return exactYear[0];
  return byYear.length === 1 ? byYear[0] : null;
}

export const fmtFarBirth = (d: string) => (d ? d.split("-").reverse().join(".") : "");

const SITE = "https://baza.armwrestling-ru.ru";
export const farPhotoUrl = (id: string) => `${SITE}/far/far_photos/${id.slice(0, 6)}.jpg`;
export const farFlagUrl = (region: string) => `${SITE}/far/rus_flags/${encodeURIComponent(region)}.jpg`;
export const farSiteUrl = (id: string) => `${SITE}/index.php?page=edit_competitor&group=far&number=${id}`;

const PENDING = "armsport-far-register";
/** Передаёт спортсмена из базы ФАР в форму регистрации участника. */
export function requestFarRegister(p: FarPassport) {
  sessionStorage.setItem(PENDING, p.id);
  window.dispatchEvent(new Event(PENDING));
}
export function takeFarRegister(): string | null {
  const v = sessionStorage.getItem(PENDING);
  if (v) sessionStorage.removeItem(PENDING);
  return v;
}
export const FAR_REGISTER_EVENT = PENDING;
