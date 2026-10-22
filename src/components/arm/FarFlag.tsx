import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FarBase, farFlagUrl, loadFar, onFarChange } from "@/lib/farPassports";

let shared: FarBase | null = null;

function useFarBase() {
  const [b, setB] = useState<FarBase | null>(shared);
  useEffect(() => {
    if (!shared) loadFar().then((x) => setB((shared = x)), () => {});
    return onFarChange((x) => setB((shared = x)));
  }, []);
  return b;
}

const regionsCache = new WeakMap<FarBase, string[]>();
const norm = (x: string) => x.toLowerCase().replace(/ё/g, "е").replace(/^(г\.|город)\s*/, "").replace(/\s+/g, " ").trim();

function matchRegion(club: string | undefined, base: FarBase | null): string {
  const c = club?.trim();
  if (!c) return "";
  if (!base) return c;
  let list = regionsCache.get(base);
  if (!list) {
    list = [...new Set(base.list.map((p) => p.region))];
    regionsCache.set(base, list);
  }
  const n = norm(c);
  return (
    list.find((r) => norm(r) === n) ??
    list.find((r) => norm(r).includes(n) || n.includes(norm(r))) ??
    list.find((r) => norm(r).split(" ")[0].slice(0, 6) === n.split(" ")[0].slice(0, 6) && n.length > 5) ??
    ""
  );
}

/** Флаг субъекта РФ (с сайта ФАР): по региону из паспорта ФАР, иначе по команде участника. */
export default function FarFlag({ farId, club, className }: { farId?: string; club?: string; className?: string }) {
  const base = useFarBase();
  const region = (farId && base?.byId.get(farId)?.region) || matchRegion(club, base) || "";
  const [failed, setFailed] = useState<string | null>(null);
  if (!region || failed === region) return null;
  return (
    <img
      key={region}
      src={farFlagUrl(region)}
      alt={region}
      title={region}
      referrerPolicy="no-referrer"
      onError={() => setFailed(region)}
      className={cn("shrink-0 rounded-[3px] border border-line object-cover shadow-sm", className)}
    />
  );
}
