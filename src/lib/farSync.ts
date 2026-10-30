import func2url from "../../backend/func2url.json";
import { Raw, loadFar, saveFar } from "./farPassports";

const URL_ = (func2url as Record<string, string>)["far-sync"];

const AB: [string, string][] = [
  ["Центральный", "ЦФО"],
  ["Северо-Западный", "СЗФО"],
  ["Южный", "ЮФО"],
  ["Северо-Кавказский", "СКФО"],
  ["Приволжский", "ПФО"],
  ["Уральский", "УФО"],
  ["Сибирский", "СФО"],
  ["Дальневосточный", "ДФО"],
];

function district(d: string): string {
  if (d.includes("Москва")) return "Город Москва";
  if (d.includes("Санкт-Петербург")) return "Город Санкт-Петербург";
  if (d.includes("Севастополь")) return "ЮФО";
  return AB.find(([k]) => d.startsWith(k))?.[1] ?? "";
}

function guessGender(name: string): string {
  const p = name.split(" ")[2] ?? "";
  if (/(вна|чна|кызы)$/.test(p)) return "F";
  if (/(ич|оглы|улы)$/.test(p)) return "M";
  return "";
}

async function api<T>(params: Record<string, string>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${URL_}?${new URLSearchParams(params)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as T;
    } catch (e) {
      last = e;
      await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
    }
  }
  throw new Error(`Сайт ФАР не отвечает (${(last as Error)?.message ?? "ошибка сети"})`);
}

/**
 * Раздаёт элементы пачками по size на n параллельных вызовов. Что сервер не успел (left) —
 * возвращается в очередь, но не больше rounds раз на элемент.
 */
async function drain(items: string[], size: number, n: number, fn: (xs: string[]) => Promise<string[]>, tick: () => void) {
  const queue = [...items];
  const tries = new Map<string, number>();
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const part = queue.splice(0, size);
        const left = await fn(part);
        for (const x of left) {
          const k = (tries.get(x) ?? 0) + 1;
          tries.set(x, k);
          if (k < 3) queue.push(x);
        }
        tick();
      }
    }),
  );
}

export interface SyncProgress {
  stage: string;
  done: number;
  total: number;
}

export interface SyncResult {
  total: number;
  added: number;
  removed: number;
  siteUpdated: string;
}

type Card = { name: string; gender: string; rank: string; birthDate: string } | null;

/**
 * Скачивает свежую базу паспортов ФАР с сайта федерации.
 * full = false — карточки (разряд, дата рождения) загружаются только для новых спортсменов.
 */
export async function syncFar(full: boolean, onProgress: (p: SyncProgress) => void): Promise<SyncResult> {
  if (!URL_) throw new Error("Обновление базы ФАР недоступно");
  const old = await loadFar().catch(() => null);

  onProgress({ stage: "Список регионов", done: 0, total: 1 });
  const head = await api<{ updated: string; regions: [string, string][] }>({ action: "regions" });
  if (!head.regions.length) throw new Error("На сайте ФАР не найден список регионов");

  const lists = new Map<string, [string, string][]>();
  await drain(
    head.regions.map(([club]) => club),
    12,
    3,
    async (clubs) => {
      const r = await api<{ lists: Record<string, [string, string][]>; left: string[] }>({ action: "regions_batch", clubs: clubs.join(",") });
      Object.entries(r.lists).forEach(([k, v]) => lists.set(k, v));
      return r.left;
    },
    () => onProgress({ stage: "Регионы", done: lists.size, total: head.regions.length }),
  );
  const miss = head.regions.filter(([club]) => !lists.has(club)).length;
  if (miss) throw new Error(`Сайт ФАР не отдал ${miss} регион(ов) — попробуйте обновить ещё раз`);

  const people = head.regions.flatMap(([club, d]) => lists.get(club)!.map(([id, name]) => ({ id, name, club, d })));
  if (people.length < 1000) throw new Error(`На сайте найдено подозрительно мало спортсменов (${people.length}) — обновление отменено`);

  const need = people.filter((p) => full || !old?.byId.has(p.id)).map((p) => p.id);
  const cards = new Map<string, Card>();
  await drain(
    need,
    200,
    3,
    async (ids) => {
      const r = await api<{ cards: Record<string, Card>; left: string[] }>({ action: "cards", ids: ids.join(",") });
      Object.entries(r.cards).forEach(([k, v]) => cards.set(k, v));
      return r.left;
    },
    () => onProgress({ stage: "Карточки спортсменов", done: cards.size, total: need.length }),
  );

  const regions: [string, string][] = [];
  const rIdx = new Map<string, number>();
  const p: Raw["p"] = people.map((x) => {
    const c = cards.get(x.id);
    const o = old?.byId.get(x.id);
    const name = c?.name || x.name;
    const dist = district(x.d);
    const key = `${x.club}|${dist}`;
    if (!rIdx.has(key)) {
      rIdx.set(key, regions.length);
      regions.push([x.club, dist]);
    }
    return [
      x.id,
      name,
      c?.gender || o?.gender || guessGender(name),
      c ? c.rank : (o?.rank ?? ""),
      c ? c.birthDate : (o?.birthDate ?? ""),
      rIdx.get(key)!,
    ];
  });
  p.sort((a, b) => a[1].localeCompare(b[1], "ru"));

  const ids = new Set(p.map((x) => x[0]));
  const added = old ? p.filter((x) => !old.byId.has(x[0])).length : p.length;
  const removed = old ? old.list.filter((x) => !ids.has(x.id)).length : 0;

  await saveFar({ updated: new Date().toISOString().slice(0, 10), siteUpdated: head.updated, regions, p });
  return { total: p.length, added, removed, siteUpdated: head.updated };
}
