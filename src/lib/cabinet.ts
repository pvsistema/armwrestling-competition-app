import func2url from "../../backend/func2url.json";
import { AgeGroup, Athlete, Gender, Hand, ParaClass, RANKS, WeightClass, groupOf, tournamentYear, weightClasses, adultGroupFor } from "./arm";
import { FarBase, fmtFarBirth, matchFar, normName } from "./farPassports";

export const CABINET_URL = (func2url as Record<string, string>).cabinet;
const TKEY = "armsport-rep-token";

export interface RepAthlete {
  id?: number;
  name: string;
  gender: Gender;
  birthDate: string;
  rank?: string;
  club: string;
  city?: string;
  district?: string;
  farId?: string;
  para?: ParaClass;
  coach?: string;
  insNum: string;
  insTo: string;
}

/** Опубликованный секретарём турнир для приёма заявок. */
export interface IntakeTournament {
  id: number;
  open: boolean;
  name: string;
  date: string;
  dateEnd?: string;
  place?: string;
  groups: AgeGroup[];
  tolerance?: number;
}

export interface EntryItem {
  athlete: RepAthlete;
  classKey: string;
  classLabel: string;
  hands: Hand[];
  absolute?: boolean;
  adult?: boolean;
}

export interface Entry {
  rep_id: number;
  items: EntryItem[];
  version: number;
  submitted_at: string;
  imported_version: number;
  name: string;
  team: string;
  phone: string;
}

export const getToken = () => localStorage.getItem(TKEY) || "";
export const setToken = (t: string) => (t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY));

export async function cab<T = Record<string, unknown>>(action: string, body: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
  const r = await fetch(CABINET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": getToken(), ...headers },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error || "Ошибка сервера") as Error & { status?: number };
    e.status = r.status;
    throw e;
  }
  return j as T;
}

export const ageOn = (birthDate: string, t: Pick<IntakeTournament, "date">) =>
  tournamentYear({ date: t.date } as never) - parseInt(birthDate.slice(0, 4), 10);

/** Последний день соревнований — страховка должна действовать до него. */
export const lastDay = (t: Pick<IntakeTournament, "date" | "dateEnd">) => t.dateEnd || t.date;

export function insuranceOk(a: Pick<RepAthlete, "insNum" | "insTo">, t: Pick<IntakeTournament, "date" | "dateEnd">) {
  return !!a.insNum.trim() && !!a.insTo && a.insTo >= lastDay(t);
}

const asAthlete = (a: RepAthlete) => ({ gender: a.gender, birthYear: parseInt(a.birthDate.slice(0, 4), 10), para: a.para });

/** Возрастная группа турнира, куда попадает спортсмен, и её весовые категории. */
export function fitFor(a: RepAthlete, t: IntakeTournament): { group: AgeGroup | null; classes: WeightClass[]; adult: AgeGroup | null } {
  if (!a.birthDate) return { group: null, classes: [], adult: null };
  const year = tournamentYear({ date: t.date } as never);
  const g = groupOf(asAthlete(a), t.groups, year);
  return {
    group: g,
    classes: g ? weightClasses([g]).filter((c) => !c.abs) : [],
    adult: adultGroupFor(asAthlete(a), t.groups, year),
  };
}

/** Спортсмен из заявки в формате программы секретаря. */
export function toProgram(it: EntryItem, team: string): Omit<Athlete, "id"> {
  const a = it.athlete;
  return {
    name: a.name.trim(),
    gender: a.gender,
    birthYear: parseInt(a.birthDate.slice(0, 4), 10),
    birthDate: a.birthDate,
    weight: null,
    club: a.club.trim() || team,
    city: a.city?.trim() || "",
    hands: it.hands,
    rank: a.rank || undefined,
    district: a.district || undefined,
    farId: a.farId?.trim() || undefined,
    para: a.para || undefined,
    absolute: it.absolute || undefined,
    adult: it.adult || undefined,
    admit: { ins: true },
  };
}

export const fmtD = (d?: string | null) => (d ? new Date(d).toLocaleDateString("ru-RU") : "");

export interface FarDiff {
  a: RepAthlete;
  next: RepAthlete;
  changes: string[];
  by: "id" | "name";
}

/** Сверка спортсмена с базой паспортов ФАР: что будет дополнено или исправлено. */
export function farDiff(a: RepAthlete, base: FarBase): FarDiff | "missing" | null {
  const p = a.farId?.trim() ? base.byId.get(a.farId.trim()) : matchFar(base, a.name, a.birthDate ? +a.birthDate.slice(0, 4) : undefined);
  if (!p) return a.farId?.trim() ? "missing" : null;
  const next: RepAthlete = { ...a };
  const changes: string[] = [];
  const set = <K extends keyof RepAthlete>(k: K, v: RepAthlete[K], label: string) => {
    if (v && v !== a[k]) {
      next[k] = v;
      changes.push(label);
    }
  };
  set("farId", p.id, `паспорт № ${p.id}`);
  if (normName(p.name) !== normName(a.name)) set("name", p.name, `ФИО: ${p.name}`);
  set("birthDate", p.birthDate, `дата рождения ${fmtFarBirth(p.birthDate)}`);
  if (p.gender) set("gender", p.gender, p.gender === "M" ? "пол: муж." : "пол: жен.");
  if (p.rank && RANKS.includes(p.rank)) set("rank", p.rank, `звание: ${p.rank}`);
  if (!a.club?.trim()) set("club", p.region, `субъект: ${p.region}`);
  set("district", p.district, `округ: ${p.district}`);
  return { a, next, changes, by: a.farId?.trim() ? "id" : "name" };
}
