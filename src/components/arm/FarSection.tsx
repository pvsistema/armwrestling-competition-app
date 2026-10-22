import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { DISTRICT_FULL } from "@/lib/arm";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { FarBase, FarPassport, farFlagUrl, fmtFarBirth, loadFar, onFarChange, requestFarRegister, searchFar } from "@/lib/farPassports";
import FarCard from "./FarCard";
import FarUpdateButton from "./FarUpdateButton";

const ORDER = ["Город Москва", "Город Санкт-Петербург", "ДФО", "ПФО", "СЗФО", "СКФО", "СФО", "УФО", "ЦФО", "ЮФО"];
const groupTitle = (d: string) => (d.startsWith("Город") ? `${DISTRICT_FULL[d] ?? d}` : DISTRICT_FULL[d] ?? (d || "Без округа"));

interface Props {
  onRegistered: () => void;
}

/** Раздел «Паспорта ФАР»: регионы → спортсмены региона → карточка. */
export default function FarSection({ onRegistered }: Props) {
  const { athletes } = useStore();
  const [base, setBase] = useState<FarBase | null>(null);
  const [failed, setFailed] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const [card, setCard] = useState<FarPassport | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    loadFar().then(setBase, () => setFailed(true));
    return onFarChange(setBase);
  }, []);

  const regions = useMemo(() => {
    if (!base) return [];
    const m = new Map<string, { region: string; district: string; n: number }>();
    for (const p of base.list) {
      const r = m.get(p.region) ?? { region: p.region, district: p.district, n: 0 };
      r.n++;
      m.set(p.region, r);
    }
    const groups = new Map<string, { region: string; n: number }[]>();
    for (const r of m.values()) {
      const key = r.district || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (ORDER.indexOf(a) < 0 ? 99 : ORDER.indexOf(a)) - (ORDER.indexOf(b) < 0 ? 99 : ORDER.indexOf(b)))
      .map(([d, list]) => ({ d, list: list.sort((a, b) => a.region.localeCompare(b.region, "ru")) }));
  }, [base]);

  const people = useMemo(() => {
    if (!base) return [];
    if (q.trim().length >= 2) {
      const hits = searchFar(base, q, 300);
      return region ? hits.filter((p) => p.region === region) : hits;
    }
    return region ? base.list.filter((p) => p.region === region) : [];
  }, [base, region, q]);

  const regIds = useMemo(() => new Set(athletes.map((a) => a.farId).filter(Boolean)), [athletes]);

  const register = (p: FarPassport) => {
    requestFarRegister(p);
    onRegistered();
  };

  const searching = q.trim().length >= 2;

  return (
    <section className="flex flex-1 flex-col rounded-lg bg-frame p-2.5">
      <div className="win flex-1">
        <div className="win-bar">
          <i />
          <i />
          <i />
          <b>паспорта ФАР</b>
        </div>
        <div className="flex flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(region || card) && (
              <button className="pill" onClick={() => (card ? setCard(null) : setRegion(null))}>
                <Icon name="ArrowLeft" size={15} /> Назад
              </button>
            )}
            <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              <button className={cn("hover:underline", !region && !card ? "font-semibold" : "text-panel-muted")} onClick={() => { setRegion(null); setCard(null); }}>
                Паспорта ФАР
              </button>
              {region && (
                <>
                  <Icon name="ChevronRight" size={14} className="text-panel-muted" />
                  <button className={cn("hover:underline", !card ? "font-semibold" : "text-panel-muted")} onClick={() => setCard(null)}>
                    {region}
                  </button>
                </>
              )}
              {card && (
                <>
                  <Icon name="ChevronRight" size={14} className="text-panel-muted" />
                  <span className="font-semibold">{card.name}</span>
                </>
              )}
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {base && (
                <span className="font-mono text-xs text-panel-muted">
                  {base.list.length.toLocaleString("ru")} чел. · база от {fmtFarBirth(base.updated)}
                </span>
              )}
              <FarUpdateButton />
            </div>
          </div>

          {!card && (
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-muted" />
              <input
                className="field !rounded-full pl-10"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={region ? `Поиск в регионе: ${region}` : "Поиск по всей базе: фамилия, ФИО или № паспорта"}
              />
            </div>
          )}

          {failed && !base && <p className="text-corner-red">База паспортов ФАР не загрузилась. Нажмите «Обновить базу ФАР».</p>}
          {!base && !failed && (
            <div className="flex items-center gap-2 text-panel-muted">
              <Icon name="Loader2" size={18} className="animate-spin" /> Загрузка базы…
            </div>
          )}

          {card && <FarCard p={card} registered={regIds.has(card.id)} onRegister={() => register(card)} />}

          {!card && base && !region && !searching && (
            <div className="flex flex-col gap-5">
              {regions.map(({ d, list }) => (
                <div key={d}>
                  <h3 className="mb-2 text-center text-lg font-medium">{groupTitle(d)}</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                    {list.map((r) => (
                      <button
                        key={r.region}
                        onClick={() => setRegion(r.region)}
                        className="group flex w-[132px] flex-col items-center gap-1.5 rounded-[12px] p-2 text-center transition-colors hover:bg-surface"
                      >
                        <Flag region={r.region} />
                        <span className="text-xs font-semibold leading-tight">{r.region}</span>
                        <span className="font-mono text-[10px] text-panel-muted">{r.n} чел.</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!card && base && (region || searching) && (
            <div className="flex flex-col">
              {region && !searching && (
                <div className="mb-3 flex items-center gap-3">
                  <Flag region={region} small />
                  <h3 className="text-xl font-medium">
                    {region} <span className="text-panel-muted">(всего человек: {people.length})</span>
                  </h3>
                </div>
              )}
              {searching && <div className="mb-2 font-mono text-xs text-panel-muted">Найдено: {people.length >= 300 ? "300+" : people.length}</div>}
              {people.length === 0 && <p className="text-panel-muted">Никого не найдено.</p>}
              <div className="columns-1 gap-6 sm:columns-2 xl:columns-3">
                {people.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCard(p)}
                    className="flex w-full break-inside-avoid items-baseline gap-2 rounded-[8px] px-2 py-1 text-left text-sm hover:bg-surface"
                  >
                    <span className="shrink-0 font-mono text-xs text-panel-muted">[ {p.id} ]</span>
                    <span className="min-w-0 flex-1">
                      {p.name}
                      {searching && !region && <span className="text-xs text-panel-muted"> · {p.region}</span>}
                    </span>
                    {regIds.has(p.id) && <Icon name="UserCheck" size={14} className="shrink-0 self-center text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Flag({ region, small }: { region: string; small?: boolean }) {
  const [err, setErr] = useState(false);
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-[4px] border border-line bg-surface", small ? "h-8 w-12" : "h-[72px] w-[110px]")}>
      {err ? (
        <Icon name="Flag" size={small ? 14 : 22} className="text-panel-muted/60" />
      ) : (
        <img src={farFlagUrl(region)} alt={region} loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
