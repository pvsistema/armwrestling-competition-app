import type { State } from "./store";

const DB = "armsport-archive";
const STORE = "t";

export interface ArchiveMeta {
  id: string;
  name: string;
  date: string;
  dateEnd?: string;
  place: string;
  athletes: number;
  brackets: number;
  done: number;
  total: number;
  updatedAt: number;
}
interface Entry extends ArchiveMeta {
  data: State;
}

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

const listeners = new Set<() => void>();
export const onArchiveChange = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const emit = () => listeners.forEach((f) => f());

/** Есть ли в турнире что сохранять. */
export const hasContent = (s: State) => s.athletes.length > 0 || s.brackets.length > 0 || !!s.tournament.name.trim();

/** Сохраняет турнир в список последних (на этом компьютере). */
export async function archiveTournament(s: State) {
  const id = s.tournament.uid;
  if (!id || !hasContent(s)) return;
  const e: Entry = {
    id,
    name: s.tournament.name,
    date: s.tournament.date,
    dateEnd: s.tournament.dateEnd,
    place: s.tournament.place,
    athletes: s.athletes.length,
    brackets: s.brackets.length,
    done: s.matches.filter((m) => m.winner).length,
    total: s.matches.length,
    updatedAt: Date.now(),
    data: s,
  };
  await tx("readwrite", (st) => st.put(e));
  emit();
}

export async function listArchive(): Promise<ArchiveMeta[]> {
  const all = (await tx("readonly", (st) => st.getAll())) as Entry[];
  return all.map(({ data: _d, ...m }) => m).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadArchived(id: string): Promise<State | null> {
  const e = (await tx("readonly", (st) => st.get(id))) as Entry | undefined;
  return e?.data ?? null;
}

export async function removeArchived(id: string) {
  await tx("readwrite", (st) => st.delete(id));
  emit();
}
