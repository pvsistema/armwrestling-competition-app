import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { GROUP_LABEL, HAND_LABEL, fmtKg, surname } from "@/lib/arm";
import { pendingQueue } from "@/lib/queue";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

export default function BoardSection() {
  const { matches, brackets, amap, tournament } = useStore();
  const classMap = useClassMap();
  const [table, setTable] = useState<number | "all">("all");
  const [now, setNow] = useState(new Date());
  const ref = useRef<HTMLDivElement>(null);
  const queue = useMemo(() => pendingQueue(matches, table), [matches, table]);
  const current = queue[0];
  const next = queue.slice(1, 6);

  const lastResults = useMemo(
    () =>
      matches
        .filter((m) => m.winner && (table === "all" || m.table === table))
        .sort((a, b) => ((b as { decidedAt?: number }).decidedAt ?? 0) - ((a as { decidedAt?: number }).decidedAt ?? 0))
        .slice(0, 4),
    [matches, table],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  const label = (key: string) => {
    const b = brackets.find((x) => x.key === key);
    return b ? `${classMap[b.classKey]?.groupName} · ${classMap[b.classKey]?.label} · ${HAND_LABEL[b.hand]}` : "";
  };

  const full = () => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...Array.from({ length: tournament.tables }, (_, i) => i + 1)] as (number | "all")[]).map((t) => (
          <button key={String(t)} className={cn("pill", table === t && "pill-on")} onClick={() => setTable(t)}>
            {t === "all" ? "Все столы" : `Стол ${t}`}
          </button>
        ))}
        <button className="btn-blue ml-auto" onClick={full}>
          <Icon name="Maximize" size={17} /> На весь экран
        </button>
      </div>

      <div ref={ref} className="flex flex-1 flex-col gap-4 rounded-stage bg-panel p-6 text-foreground md:p-10">
        <div className="flex items-center gap-4">
          {(tournament.showLogo ?? true) && <Logo hq className="h-14 w-14 shadow-lg md:h-24 md:w-24" />}
          <div className="text-xl font-semibold tracking-tight md:text-3xl">{tournament.name}</div>
          <div className="ml-auto font-mono text-xl text-panel-muted md:text-3xl">
            {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        {current ? (
          <div className="flex flex-1 flex-col justify-center rounded-lg bg-frame p-3">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-center font-mono text-sm text-tip-foreground md:text-lg">
              <span className="rounded-full bg-tip px-3 py-1 font-semibold">СЕЙЧАС · СТОЛ {current.table}</span>
              <span>
                {label(current.key)} · {GROUP_LABEL[current.group]} · тур {current.round}
              </span>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
              {[current.a, current.b].map((id, i) => (
                <div
                  key={id}
                  className={cn(
                    "flex flex-col justify-center rounded-sm bg-panel p-6 md:p-10",
                    i === 1 && "md:order-3 md:text-right",
                  )}
                >
                  <div className={cn("font-mono text-sm uppercase md:text-base", i === 0 ? "text-corner-blue" : "text-corner-red")}>
                    {i === 0 ? "синий угол" : "красный угол"}
                  </div>
                  <div className="mt-3 text-[clamp(36px,6vw,96px)] font-semibold leading-[0.95] tracking-[-0.03em]">
                    {amap[id]?.name}
                  </div>
                  <div className="mt-4 text-lg text-panel-muted md:text-2xl">
                    {fmtKg(amap[id]?.weight)} кг · {amap[id]?.city}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center text-4xl font-semibold text-tip-foreground md:order-2 md:text-6xl">VS</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg bg-surface p-10 text-center text-3xl text-panel-muted">
            Ожидаем следующие схватки
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="cat mb-2 text-sm">ГОТОВЯТСЯ</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {next.map((m, i) => (
                <div key={m.id} className="rounded-lg bg-surface px-4 py-3">
                  <div className="cat">
                    #{i + 2} · стол {m.table} · {label(m.key)}
                  </div>
                  <div className="mt-1 text-xl font-medium md:text-2xl">
                    {surname(amap[m.a]?.name ?? "")} — {surname(amap[m.b]?.name ?? "")}
                  </div>
                </div>
              ))}
              {!next.length && <div className="text-panel-muted">Очередь пуста</div>}
            </div>
          </div>
          <div>
            <div className="cat mb-2 text-sm">ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ</div>
            <div className="flex flex-col gap-1.5">
              {lastResults.map((m) => {
                const loser = m.winner === m.a ? m.b : m.a;
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-full bg-surface px-4 py-2">
                    <Icon name="Trophy" size={16} className="text-primary" />
                    <span className="font-medium">{surname(amap[m.winner!]?.name ?? "")}</span>
                    <span className="text-panel-muted">победил {surname(amap[loser]?.name ?? "")}</span>
                  </div>
                );
              })}
              {!lastResults.length && <div className="text-panel-muted">Пока нет</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
