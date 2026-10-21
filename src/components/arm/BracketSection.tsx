import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { GROUP_LABEL, HAND_LABEL, Hand, Match, bracketKey, classOf, standings, surname, tournamentYear, weightClasses } from "@/lib/arm";
import { cn } from "@/lib/utils";

export default function BracketSection() {
  const { athletes, groups, tournament, brackets, matches, amap, draw, drawAll, clearDraw, setWinner } = useStore();
  const classMap = useClassMap();
  const year = tournamentYear(tournament);

  const pools = useMemo(() => {
    const p: Record<string, number> = {};
    for (const a of athletes) {
      const c = classOf(a, groups, year);
      if (!c) continue;
      a.hands.forEach((h) => (p[bracketKey(c.key, h)] = (p[bracketKey(c.key, h)] || 0) + 1));
    }
    return p;
  }, [athletes, groups, year]);

  const keys = useMemo(
    () =>
      weightClasses(groups)
        .flatMap((c) => (["right", "left"] as Hand[]).map((h) => bracketKey(c.key, h)))
        .filter((k) => pools[k] || brackets.some((b) => b.key === k)),
    [groups, pools, brackets],
  );

  const [sel, setSel] = useState<string | null>(null);
  const active = sel && keys.includes(sel) ? sel : keys[0];
  const bracket = brackets.find((b) => b.key === active);
  const [classKey, hand] = (active || "|").split("|") as [string, Hand];
  const cls = classMap[classKey];
  const own = matches.filter((m) => m.key === active);
  const st = bracket ? standings(bracket, matches) : {};
  const rounds = bracket ? Array.from({ length: bracket.round }, (_, i) => i + 1) : [];
  const unweighed = athletes.filter((a) => a.weight == null).length;

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[300px_1fr]">
      <aside className="flex flex-col gap-3">
        <button className="btn-blue w-full py-3.5" onClick={drawAll}>
          <Icon name="Shuffle" size={18} /> Жеребьёвка всех новых
        </button>
        {unweighed > 0 && (
          <div className="rounded-lg bg-tip px-4 py-3 text-sm text-tip-foreground">
            Не взвешено: {unweighed}. Они не попадут в сетку, пока нет веса.
          </div>
        )}
        <div className="win max-h-[620px] overflow-y-auto">
          {keys.map((k) => {
            const [ck, h] = k.split("|") as [string, Hand];
            const c = classMap[ck];
            const b = brackets.find((x) => x.key === k);
            const left = matches.filter((m) => m.key === k && !m.winner).length;
            return (
              <button
                key={k}
                onClick={() => setSel(k)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-0",
                  k === active ? "bg-primary text-primary-foreground" : "hover:bg-surface",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {c?.groupName} · {c?.label}
                  </div>
                  <div className={cn("font-mono text-xs", k === active ? "text-primary-foreground/80" : "text-panel-muted")}>
                    {HAND_LABEL[h]} · {pools[k] || 0} уч.
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-mono text-[11px]",
                    !b ? "bg-line text-panel-muted" : b.done ? "bg-tip text-tip-foreground" : "bg-foreground/15",
                  )}
                >
                  {!b ? "нет" : b.done ? "итог" : `ост. ${left}`}
                </span>
              </button>
            );
          })}
          {!keys.length && <div className="p-6 text-center text-panel-muted">Нет взвешенных участников</div>}
        </div>
        {brackets.length > 0 && (
          <button className="pill self-start" onClick={() => confirm("Сбросить все сетки и результаты?") && clearDraw()}>
            <Icon name="RotateCcw" size={15} /> Сбросить все сетки
          </button>
        )}
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        {active && (
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[28px] font-medium tracking-tight md:text-[34px]">
              {cls?.groupName} · {cls?.label} · {HAND_LABEL[hand]} рука
            </h2>
            <div className="ml-auto flex gap-2">
              {bracket && <span className="pill">Стол {bracket.table}</span>}
              <button
                className="pill"
                onClick={() => (!bracket || own.every((m) => !m.winner) || confirm("Результаты этой категории будут удалены. Провести жеребьёвку заново?")) && draw(active)}
              >
                <Icon name="Shuffle" size={15} /> {bracket ? "Перетянуть жребий" : "Жеребьёвка"}
              </button>
            </div>
          </div>
        )}

        {bracket && (
          <>
            <div className="flex flex-wrap gap-2">
              {bracket.athletes
                .slice()
                .sort((x, y) => (st[x].losses - st[y].losses) || (st[y].wins - st[x].wins))
                .map((id) => (
                  <span
                    key={id}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm",
                      st[id].losses >= 2 ? "bg-foreground/5 text-foreground/50 line-through" : st[id].losses === 1 ? "bg-foreground/15" : "bg-panel",
                    )}
                  >
                    {surname(amap[id]?.name ?? "?")}
                    <span className="ml-1.5 font-mono text-xs opacity-70">
                      {st[id].wins}–{st[id].losses}
                    </span>
                  </span>
                ))}
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3">
                {rounds.map((r) => {
                  const rm = own.filter((m) => m.round === r);
                  const byes = bracket.byes.filter((b) => b.round === r);
                  return (
                    <div key={r} className="w-[250px] shrink-0 rounded-lg bg-frame p-2">
                      <div className="mb-2 px-2 font-mono text-xs font-medium text-tip-foreground">ТУР {r}</div>
                      <div className="flex flex-col gap-2">
                        {(["A", "B", "F", "SF"] as const).map((g) => {
                          const gm = rm.filter((m) => m.group === g);
                          const gb = byes.filter((b) => b.group === g);
                          if (!gm.length && !gb.length) return null;
                          return (
                            <div key={g} className="flex flex-col gap-1.5">
                              <div className="px-2 font-mono text-[11px] text-tip-foreground/80">
                                {GROUP_LABEL[g]} {g === "A" ? "· 0 пор." : g === "B" ? "· 1 пор." : ""}
                              </div>
                              {gm.map((m) => (
                                <MatchCard key={m.id} m={m} name={(id) => amap[id]?.name ?? "?"} onWin={(w) => setWinner(m.id, w)} />
                              ))}
                              {gb.map((b) => (
                                <div key={b.id} className="rounded-sm bg-panel/70 px-3 py-2 text-xs text-panel-muted">
                                  {surname(amap[b.id]?.name ?? "?")} — проходит без схватки
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {bracket.done && (
                  <div className="flex w-[220px] shrink-0 flex-col justify-center gap-2 rounded-lg bg-tip p-4 text-tip-foreground">
                    <Icon name="Trophy" size={28} />
                    <div className="text-lg font-semibold">Категория завершена</div>
                    <div className="text-sm">Места — в разделе «Протоколы».</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {active && !bracket && (
          <div className="win flex-1 items-center justify-center gap-3 p-10 text-center">
            <Icon name="Shuffle" size={36} className="text-panel-muted" />
            <p className="max-w-sm text-panel-muted">
              Жеребьёвка ещё не проведена. Программа случайно разведёт пары и по возможности не сведёт одноклубников в первом туре.
            </p>
            <button className="btn-blue" onClick={() => draw(active)}>
              Провести жеребьёвку
            </button>
          </div>
        )}

        <div className="rounded-lg bg-panel p-4 text-sm leading-relaxed text-panel-muted">
          <span className="font-medium text-foreground">Система «до двух поражений». </span>
          Каждый тур победители без поражений борются в основной сетке, проигравшие один раз — в утешительной. Два поражения — выбывание. Нечётному участнику даётся проход без схватки. Финал: лидер основной сетки против победителя утешительной; если лидер проигрывает — суперфинал.
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m, name, onWin }: { m: Match; name: (id: string) => string; onWin: (id: string) => void }) {
  const row = (id: string) => (
    <button
      disabled={!!m.winner}
      onClick={() => onWin(id)}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors",
        m.winner === id && "bg-primary font-semibold text-primary-foreground",
        m.winner && m.winner !== id && "text-panel-muted line-through",
        !m.winner && "hover:bg-surface",
      )}
      title={m.winner ? "" : "Отметить победителя"}
    >
      <span className="truncate">{surname(name(id))}</span>
      {m.winner === id && <Icon name="Check" size={14} />}
    </button>
  );
  return (
    <div className="overflow-hidden rounded-sm bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-1 font-mono text-[10px] text-panel-muted">
        <span>#{m.order}</span>
        <span>{m.winner ? "проведена" : "ожидает"}</span>
      </div>
      {row(m.a)}
      <div className="h-px bg-line" />
      {row(m.b)}
    </div>
  );
}
