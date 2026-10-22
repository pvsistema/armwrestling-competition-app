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

interface Raw {
  updated: string;
  regions: [string, string][];
  p: [string, string, string, string, string, number][];
}

export interface FarBase {
  updated: string;
  list: FarPassport[];
  byId: Map<string, FarPassport>;
}

let cache: Promise<FarBase> | null = null;

/** Справочник паспортов ФАР (baza.armwrestling-ru.ru), загружается один раз. */
export function loadFar(): Promise<FarBase> {
  cache ??= fetch(`${import.meta.env.BASE_URL}far-passports.json`)
    .then((r) => {
      if (!r.ok) throw new Error("Не удалось загрузить базу паспортов ФАР");
      return r.json() as Promise<Raw>;
    })
    .then((d) => {
      const list = d.p.map(([id, name, gender, rank, birthDate, ri]) => ({
        id,
        name,
        gender: gender as Gender | "",
        rank,
        birthDate,
        region: d.regions[ri]?.[0] ?? "",
        district: d.regions[ri]?.[1] ?? "",
      }));
      return { updated: d.updated, list, byId: new Map(list.map((x) => [x.id, x])) };
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
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
