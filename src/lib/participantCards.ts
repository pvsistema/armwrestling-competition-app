import type { Gender } from "./arm";

/** Карточка участника — для спортсменов без паспорта ФАР. Действует с даты выдачи до 31 декабря того же года. */
export interface PCard {
  id: string;
  name: string;
  gender: Gender;
  birthYear: number;
  birthDate?: string;
  rank?: string;
  region: string;
  city?: string;
  district?: string;
  from: string;
  to: string;
  photo?: string;
  updated: number;
}

export type CardRef = { id: string; from: string; to: string };

const DB = "armsport-cards";
const STORE = "c";

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const o = indexedDB.open(DB, 1);
    o.onupgradeneeded = () => o.result.createObjectStore(STORE, { keyPath: "id" });
    o.onsuccess = () => res(o.result);
    o.onerror = () => rej(o.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

let cache: Map<string, PCard> | null = null;
let loading: Promise<Map<string, PCard>> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const onCardsChange = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export function loadCards(): Promise<Map<string, PCard>> {
  if (cache) return Promise.resolve(cache);
  loading ||= tx("readonly", (s) => s.getAll()).then(
    (all) => (cache = new Map((all as PCard[]).map((c) => [c.id, c]))),
    () => (cache = new Map()),
  );
  return loading;
}

export const cardsNow = () => cache;

if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === "armsport-cards-ping") {
      cache = null;
      loading = null;
      loadCards().then(emit);
    }
  });

async function put(c: PCard) {
  const m = await loadCards();
  const next = { ...c, updated: Date.now() };
  await tx("readwrite", (s) => s.put(next));
  m.set(next.id, next);
  localStorage.setItem("armsport-cards-ping", String(Date.now()));
  emit();
  return next;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const yearEnd = (from: string) => `${from.slice(0, 4)}-12-31`;

export const fmtDate = (d: string) => (d ? d.split("-").reverse().join(".") : "");
export const cardRef = (c: PCard): CardRef => ({ id: c.id, from: c.from, to: c.to });
/** Действует ли карточка на дату (по умолчанию — сегодня). */
export const cardValid = (c: { to: string } | undefined, on = today()) => !!c && c.to >= on;

async function nextNumber(year: string): Promise<string> {
  const m = await loadCards();
  const yy = year.slice(2);
  let max = 0;
  for (const id of m.keys()) {
    const r = id.match(/^К(\d{2})-(\d+)$/);
    if (r && r[1] === yy) max = Math.max(max, parseInt(r[2], 10));
  }
  return `К${yy}-${String(max + 1).padStart(4, "0")}`;
}

export type CardData = Omit<PCard, "id" | "from" | "to" | "updated" | "photo">;

export async function issueCard(data: CardData): Promise<PCard> {
  const from = today();
  const id = await nextNumber(from);
  return put({ ...data, id, from, to: yearEnd(from), updated: 0 });
}

/** Продление: та же карточка, действует с сегодняшнего дня до конца текущего года. */
export async function renewCard(id: string): Promise<PCard | null> {
  const c = (await loadCards()).get(id);
  if (!c) return null;
  const from = today();
  return put({ ...c, from, to: yearEnd(from) });
}

export async function updateCard(id: string, patch: Partial<PCard>) {
  const c = (await loadCards()).get(id);
  if (!c) return null;
  return put({ ...c, ...patch, id });
}

export async function removeCard(id: string) {
  const m = await loadCards();
  await tx("readwrite", (s) => s.delete(id));
  m.delete(id);
  localStorage.setItem("armsport-cards-ping", String(Date.now()));
  emit();
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export function searchCards(m: Map<string, PCard>, q: string, limit = 6): PCard[] {
  const s = norm(q);
  if (s.length < 2) return [];
  const words = s.split(" ");
  const out: PCard[] = [];
  for (const c of m.values()) {
    const hay = norm(`${c.name} ${c.id}`);
    if (words.every((w) => hay.split(" ").some((x) => x.startsWith(w)) || hay.includes(w))) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}

/** Уменьшает фото до размера карточки (JPEG ~30–50 КБ). */
export function photoFromFile(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 360;
      const H = 400;
      const k = Math.max(W / img.width, H / img.height);
      const w = img.width * k;
      const h = img.height * k;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      c.getContext("2d")!.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Не удалось прочитать изображение"));
    };
    img.src = url;
  });
}

const PENDING = "armsport-card-register";
/** Передаёт карточку в форму регистрации участника. */
export function requestCardRegister(id: string) {
  sessionStorage.setItem(PENDING, id);
  window.dispatchEvent(new Event(PENDING));
}
export function takeCardRegister(): string | null {
  const v = sessionStorage.getItem(PENDING);
  if (v) sessionStorage.removeItem(PENDING);
  return v;
}
export const CARD_REGISTER_EVENT = PENDING;
