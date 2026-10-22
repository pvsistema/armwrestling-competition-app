import { useEffect, useMemo, useRef, useState } from "react";
import { GROUP_LABEL, HAND_LABEL, Match } from "./arm";
import { pendingQueue } from "./queue";
import { useClassMap, useStore } from "./store";
import { Fight, FightNight, Side, countryFlag, fightState, fighterSurname, useFights } from "./fights";
import { Overlay, useStreams } from "./streams";
import { flagUrl } from "./flags";
import { FarBase, loadFar, onFarChange } from "./farPassports";
import FUNCS from "../../backend/func2url.json";

export interface BarRow {
  name: string;
  sub?: string;
  flag: string | null;
  score?: number;
  fouls: number;
  win: boolean | null;
}
export interface BarData {
  head: string;
  title?: boolean;
  logo?: boolean;
  blue: BarRow;
  red: BarRow;
  dots?: (Side | null)[];
  extra?: string;
  timer?: { until: number; label: string } | null;
}

const abs = (u: string | null) => (u && u.startsWith("/") ? `${location.origin}${u}` : u);
const flagOf = (region?: string) => abs(flagUrl(region) ?? (region ? countryFlag(region) : null));

function fightBar(f: Fight, n: FightNight): BarData {
  const st = fightState(f);
  const row = (s: Side): BarRow => ({
    name: fighterSurname(f[s]).toUpperCase(),
    sub: f[s].note || f[s].region,
    flag: flagOf(f[s].region),
    score: st.score[s],
    fouls: st.winner ? 0 : st.fouls[s],
    win: st.winner ? st.winner === s : null,
  });
  const t = n.timer && n.timer.fightId === f.id && !st.winner ? n.timer : null;
  return {
    head: [f.title ? "Титульный бой" : f.main ? "Главный бой" : "Супербой", f.category, f.hand === "right" ? "правая рука" : "левая рука"].join(" · "),
    title: f.title,
    blue: row("blue"),
    red: row("red"),
    dots: Array.from({ length: f.bestOf }, (_, i) => st.rounds[i]?.w ?? null),
    extra: st.winner ? "Бой окончен" : st.strap ? `Раунд ${st.round} · ремень` : `Раунд ${st.round}`,
    timer: t ? { until: t.until, label: t.kind === "foul" ? "после фола" : "отдых" } : null,
  };
}

let farShared: FarBase | null = null;
function useFar() {
  const [b, setB] = useState<FarBase | null>(farShared);
  useEffect(() => {
    if (!farShared) loadFar().then((x) => setB((farShared = x)), () => {});
    return onFarChange((x) => setB((farShared = x)));
  }, []);
  return b;
}

/** Данные плашки по настройкам: идущий армфайт или текущая схватка турнира. */
export function useBarData(o: Overlay): BarData | null {
  const { night } = useFights();
  const { matches, brackets, amap, tournament } = useStore();
  const classMap = useClassMap();
  const far = useFar();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  if (o.mode === "off") return null;
  const logo = tournament.showLogo ?? true;
  const fight = night.fights.find((f) => f.id === night.current);
  const useFight = o.mode === "fights" || (o.mode === "auto" && fight && (fightState(fight).started || !matches.some((m) => !m.winner)));
  if (useFight) return fight ? { ...fightBar(fight, night), logo } : null;

  const t = tournament.tables > 1 ? o.table : "all";
  type DM = Match & { decidedAt?: number };
  const last = (matches as DM[])
    .filter((m) => m.winner && m.decidedAt && (t === "all" || m.table === t))
    .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))[0];
  const fresh = !!last && now - (last.decidedAt ?? 0) < 10000;
  const m = fresh ? last : pendingQueue(matches, t, tournament)[0];
  if (!m) return null;
  const b = brackets.find((x) => x.key === m.key);
  const c = b ? classMap[b.classKey] : null;
  const row = (id: string): BarRow => {
    const a = amap[id];
    const p = m.pen?.[id];
    const region = (a?.farId && far?.byId.get(a.farId)?.region) || a?.club;
    return {
      name: (a?.name.split(" ")[0] ?? "—").toUpperCase(),
      sub: [a?.name.split(" ").slice(1).join(" "), a?.club].filter(Boolean).join(" · "),
      flag: flagOf(region),
      fouls: p ? Math.min(2, p.f + Math.floor(p.r / 2)) : 0,
      win: fresh && m.winner ? m.winner === id : null,
    };
  };
  return {
    head: [c?.groupName, c?.label, b ? `${HAND_LABEL[b.hand]} рука` : "", GROUP_LABEL[m.group]].filter(Boolean).join(" · "),
    logo,
    blue: row(m.a),
    red: row(m.b),
    extra: fresh ? "Победитель" : `Стол ${m.table} · тур ${m.round}`,
  };
}

export const OVERLAY_API = (FUNCS as Record<string, string>).overlay;

const KKEY = "armsport-obs-key";
export function obsKey() {
  let k = localStorage.getItem(KKEY);
  if (!k) {
    k = Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
    localStorage.setItem(KKEY, k);
  }
  return k;
}
export const newObsKey = () => {
  localStorage.removeItem(KKEY);
  return obsKey();
};
export const obsUrl = (key: string, o: Pick<Overlay, "pos" | "size">) => `${location.origin}${import.meta.env.BASE_URL}?overlay=${key}&pos=${o.pos}&size=${o.size}`;

const PKEY = "armsport-obs-on";
export const obsOn = () => localStorage.getItem(PKEY) === "1";
export const setObsOn = (v: boolean) => (v ? localStorage.setItem(PKEY, "1") : localStorage.removeItem(PKEY));

/** Отправляет плашку на сервер, чтобы её видела страница для OBS (с любого компьютера). */
export function usePublishOverlay(enabled: boolean) {
  const { overlay } = useStreams();
  const bar = useBarData(overlay);
  const json = useMemo(() => JSON.stringify(bar), [bar]);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const last = useRef("");
  const timer = useRef<number>();
  useEffect(() => {
    if (!enabled || !OVERLAY_API) return;
    const send = (force = false) => {
      if (!force && json === last.current) return;
      last.current = json;
      fetch(OVERLAY_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: obsKey(), bar: JSON.parse(json) }) })
        .then((r) => setStatus(r.ok ? "ok" : "err"))
        .catch(() => setStatus("err"));
    };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => send(), 150);
    const keep = window.setInterval(() => send(true), 30000);
    return () => window.clearInterval(keep);
  }, [json, enabled]);
  return status;
}
