import FLAGS from "./flags.json";

const MAP = FLAGS as Record<string, string>;
const NAMES = Object.keys(MAP);
const norm = (x: string) => x.toLowerCase().replace(/ё/g, "е").replace(/^(г\.|город)\s*/, "").replace(/\s+/g, " ").trim();
const NORM = NAMES.map((n) => [n, norm(n)] as const);
const cache = new Map<string, string>();

/** Находит субъект РФ по названию команды/региона в любой записи («г. Москва», «Татарстан», «ХМАО»). */
export function regionOf(team?: string): string {
  const c = team?.trim();
  if (!c) return "";
  if (cache.has(c)) return cache.get(c)!;
  const n = norm(c);
  const hit =
    NORM.find(([, r]) => r === n)?.[0] ??
    NORM.find(([, r]) => r.includes(n) && n.length >= 4)?.[0] ??
    NORM.find(([, r]) => n.includes(r))?.[0] ??
    NORM.find(([, r]) => n.length > 5 && r.split(" ").some((w) => w.length > 5 && n.split(" ").some((x) => x.slice(0, 6) === w.slice(0, 6))))?.[0] ??
    "";
  cache.set(c, hit);
  return hit;
}

/** Флаг субъекта РФ, встроенный в программу (работает без интернета). */
export function flagUrl(team?: string): string | null {
  const r = regionOf(team);
  return r ? `${import.meta.env.BASE_URL}flags/${MAP[r]}` : null;
}

const dataCache = new Map<string, Promise<{ data: Uint8Array; dataUrl: string } | null>>();

/** Загружает флаг как данные для вставки в PDF / Word / Excel. */
export function flagData(team?: string) {
  const url = flagUrl(team);
  if (!url) return Promise.resolve(null);
  if (!dataCache.has(url))
    dataCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then((buf) => {
          const data = new Uint8Array(buf);
          let bin = "";
          data.forEach((b) => (bin += String.fromCharCode(b)));
          return { data, dataUrl: `data:image/jpeg;base64,${btoa(bin)}` };
        })
        .catch(() => null),
    );
  return dataCache.get(url)!;
}
