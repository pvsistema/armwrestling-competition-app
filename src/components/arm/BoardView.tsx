import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { GROUP_LABEL, HAND_LABEL, Match, fmtKg, surname } from "@/lib/arm";
import { pendingQueue } from "@/lib/queue";
import { BoardFocus } from "@/lib/boardSync";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { TimerBoard } from "./RestTimer";

const GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 md:grid-rows-2",
  5: "grid-cols-1 md:grid-cols-3 md:grid-rows-2",
  6: "grid-cols-1 md:grid-cols-3 md:grid-rows-2",
  7: "grid-cols-1 md:grid-cols-4 md:grid-rows-2",
  8: "grid-cols-1 md:grid-cols-4 md:grid-rows-2",
};

interface Props {
  focus: BoardFocus;
  onFocus: (f: BoardFocus) => void;
  fullscreen?: () => void;
  standalone?: boolean;
}

export default function BoardView({ focus, onFocus, fullscreen, standalone }: Props) {
  const { matches, brackets, amap, tournament } = useStore();
  const classMap = useClassMap();
  const [now, setNow] = useState(new Date());
  const tables = Math.max(1, tournament.tables);
  const focusTable = focus !== "all" && focus <= tables ? focus : "all";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  type DM = Match & { decidedAt?: number };
  const lastOf = (t: number | "all") =>
    (matches as DM[])
      .filter((m) => m.winner && (t === "all" || m.table === t))
      .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0));
  const fresh = (m?: DM) => !!m?.decidedAt && now.getTime() - m.decidedAt < 10000;

  const winnerBanner = (m: DM, big: boolean) => {
    const loser = m.winner === m.a ? m.b : m.a;
    const blue = m.winner === m.a;
    return (
      <div
        className={cn(
          "flex animate-scale-in flex-col items-center justify-center gap-2 rounded-lg border-4 text-center",
          blue ? "border-corner-blue bg-corner-blue/10" : "border-corner-red bg-corner-red/10",
          big ? "flex-1 p-10" : "flex-1 p-4",
        )}
      >
        <div className="flex items-center gap-2 font-mono text-sm uppercase text-panel-muted md:text-lg">
          <Icon name="Trophy" size={big ? 28 : 18} className="text-primary" /> Победитель · {blue ? "синий угол" : "красный угол"}
        </div>
        <div className={cn("font-semibold leading-tight tracking-tight", blue ? "text-corner-blue" : "text-corner-red", big ? "text-[clamp(44px,7vw,128px)]" : "text-[clamp(22px,2.6vw,44px)]")}>
          {amap[m.winner!]?.name}
        </div>
        <div className={cn("text-panel-muted", big ? "text-xl md:text-3xl" : "text-sm md:text-base")}>
          против {amap[loser]?.name}
        </div>
      </div>
    );
  };

  const label = (key: string) => {
    const b = brackets.find((x) => x.key === key);
    if (!b) return "";
    const c = classMap[b.classKey];
    return `${c?.groupName ?? ""} · ${c?.label ?? ""} · ${HAND_LABEL[b.hand]} рука`;
  };

  return (
    <div className={cn("flex flex-col gap-4 bg-background text-foreground", standalone ? "h-screen overflow-hidden p-5 md:p-8" : "min-h-[70vh] rounded-stage border border-line p-5 md:p-8")}>
      <div className="tricolor -mx-5 -mt-5 mb-1 md:-mx-8 md:-mt-8" />
      <header className="flex items-center gap-4">
        {(tournament.showLogo ?? true) && <Logo hq className="h-14 w-14 shadow md:h-20 md:w-20" />}
        <div className="min-w-0">
          <div className="truncate text-xl font-semibold tracking-tight md:text-3xl">{tournament.name || "Соревнования по армрестлингу"}</div>
          {focusTable !== "all" && tables > 1 && <div className="text-lg text-panel-muted md:text-xl">Стол {focusTable}</div>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {tables > 1 && focusTable !== "all" && (
            <button className="pill" onClick={() => onFocus("all")}>
              <Icon name="LayoutGrid" size={16} /> Все столы
            </button>
          )}
          {fullscreen && (
            <button className="pill" onClick={fullscreen} title="Полный экран (F)">
              <Icon name="Maximize" size={16} />
            </button>
          )}
          <div className="font-mono text-2xl text-panel-muted md:text-4xl">
            {now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </header>

      {focusTable === "all" && tables > 1 ? (
        <div className={cn("grid min-h-0 flex-1 gap-3 md:gap-4", GRID[tables] ?? "grid-cols-1 md:grid-cols-4")}>
          {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
            tableCard(t, () => onFocus(t), tables > 4)
          ))}
        </div>
      ) : (
        singleTable(focusTable === "all" ? 1 : focusTable, tables === 1)
      )}
    </div>
  );

  function tableCard(table: number, onOpen: () => void, compact: boolean) {
    const q = pendingQueue(matches, table);
    const cur = q[0];
    const next = q.slice(1, compact ? 3 : 4);
    const last = lastOf(table)[0];
    return (
      <button
        key={table}
        onClick={onOpen}
        className="group flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel text-left shadow-sm transition hover:border-primary hover:shadow-md"
        title={`Показать стол ${table} на всё табло`}
      >
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
          <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-semibold text-primary-foreground md:text-base">Стол {table}</span>
          <span className="truncate text-xs text-panel-muted md:text-sm">{cur ? `${label(cur.key)} · ${GROUP_LABEL[cur.group]}` : ""}</span>
          <Icon name="Maximize2" size={16} className="ml-auto shrink-0 text-panel-muted opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="px-3 pt-2 empty:hidden">
          <TimerBoard table={table} size="md" sound={!!standalone} />
        </div>
        {fresh(last) ? (
          <div className="flex flex-1 p-3">{winnerBanner(last, false)}</div>
        ) : cur ? (
          <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3 md:px-6">
            {name(cur.a, "blue", compact ? "md" : "lg")}
            <div className="pl-1 font-mono text-xs text-panel-muted md:text-sm">против</div>
            {name(cur.b, "red", compact ? "md" : "lg")}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-4 text-lg text-panel-muted">Схваток нет</div>
        )}
        <div className="border-t border-line bg-surface/60 px-4 py-2.5">
          <div className="mb-1 font-mono text-xs text-panel-muted">СЛЕДУЮЩИЕ ПАРЫ</div>
          {(fresh(last) ? q.slice(0, next.length + 1) : next).map((m, i) => (
            <div key={m.id} className="flex items-baseline gap-2 text-base md:text-lg">
              <span className="w-5 shrink-0 font-mono text-xs text-panel-muted">{i + (fresh(last) ? 1 : 2)}.</span>
              <span className="truncate font-medium">
                {surname(amap[m.a]?.name ?? "")} — {surname(amap[m.b]?.name ?? "")}
              </span>
            </div>
          ))}
          {!next.length && !fresh(last) && (
            <div className="text-sm text-panel-muted">{cur ? "Следующий тур составится после окончания текущего" : "—"}</div>
          )}
          {last && !fresh(last) && (
            <div className="mt-1.5 flex items-center gap-1.5 border-t border-line/60 pt-1.5 text-sm text-panel-muted">
              <Icon name="Trophy" size={14} className="text-primary" /> Последняя: победил{" "}
              <span className="font-medium text-foreground">{surname(amap[last.winner!]?.name ?? "")}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  function name(id: string, corner: "blue" | "red", size: "md" | "lg") {
    const a = amap[id];
    return (
      <div className={cn("border-l-4 pl-3", corner === "blue" ? "border-corner-blue" : "border-corner-red")}>
        <div className={cn("font-semibold leading-tight tracking-tight", size === "lg" ? "text-[clamp(22px,2.6vw,44px)]" : "text-[clamp(18px,1.8vw,30px)]")}>
          {a?.name ?? "—"}
        </div>
        <div className="truncate text-sm text-panel-muted md:text-base">
          {fmtKg(a?.weight)} кг{a?.club ? ` · ${a.club}` : ""}
        </div>
      </div>
    );
  }

  function singleTable(table: number, single: boolean) {
    const t: number | "all" = single ? "all" : table;
    const queue = pendingQueue(matches, t);
    const lastOne = lastOf(t)[0];
    const showWin = fresh(lastOne);
    const current = queue[0];
    const next = showWin ? queue.slice(0, 4) : queue.slice(1, 5);
    const last = matches
      .filter((m) => m.winner && (t === "all" || m.table === t))
      .sort((a, b) => ((b as { decidedAt?: number }).decidedAt ?? 0) - ((a as { decidedAt?: number }).decidedAt ?? 0))
      .slice(0, 4);
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <TimerBoard table={single ? (current?.table ?? 1) : table} size="lg" sound={!!standalone} />
        {showWin ? (
          winnerBanner(lastOne, true)
        ) : current ? (
          <div className="flex flex-1 flex-col justify-center rounded-lg border border-line bg-frame p-3">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3 text-center text-base md:text-xl">
              <span className="rounded-full bg-primary px-4 py-1 font-semibold text-primary-foreground">СЕЙЧАС · СТОЛ {current.table}</span>
              <span className="text-panel-muted">
                {label(current.key)} · {GROUP_LABEL[current.group]} · тур {current.round}
              </span>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr]">
              {[current.a, current.b].map((id, i) => (
                <div
                  key={id}
                  className={cn(
                    "flex flex-col justify-center rounded-sm border-t-[6px] bg-panel p-6 md:p-10",
                    i === 0 ? "border-t-corner-blue" : "border-t-corner-red md:order-3 md:text-right",
                  )}
                >
                  <div className={cn("font-mono text-sm uppercase md:text-lg", i === 0 ? "text-corner-blue" : "text-corner-red")}>
                    {i === 0 ? "синий угол" : "красный угол"}
                  </div>
                  <div className="mt-3 text-[clamp(36px,5.5vw,104px)] font-semibold leading-[0.95] tracking-[-0.03em]">{amap[id]?.name}</div>
                  <div className="mt-4 text-lg text-panel-muted md:text-3xl">
                    {fmtKg(amap[id]?.weight)} кг{amap[id]?.club ? ` · ${amap[id]?.club}` : ""}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center text-4xl font-semibold text-primary md:order-2 md:text-7xl">VS</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-line bg-surface p-10 text-center text-3xl text-panel-muted">
            Ожидаем следующие схватки
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="cat mb-2 text-sm">ГОТОВЯТСЯ</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {next.map((m, i) => (
                <div key={m.id} className="rounded-lg border border-line bg-panel px-4 py-3">
                  <div className="cat">
                    #{i + (showWin ? 1 : 2)} · {label(m.key)}
                  </div>
                  <div className="mt-1 text-xl font-medium md:text-3xl">
                    {surname(amap[m.a]?.name ?? "")} — {surname(amap[m.b]?.name ?? "")}
                  </div>
                </div>
              ))}
              {!next.length && (
                <div className="text-panel-muted">{current ? "Следующий тур составится после окончания текущего" : "Очередь пуста"}</div>
              )}
            </div>
          </div>
          <div>
            <div className="cat mb-2 text-sm">ПОСЛЕДНИЕ РЕЗУЛЬТАТЫ</div>
            <div className="flex flex-col gap-1.5">
              {last.map((m) => {
                const loser = m.winner === m.a ? m.b : m.a;
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 md:text-lg">
                    <Icon name="Trophy" size={18} className="text-primary" />
                    <span className="font-medium">{surname(amap[m.winner!]?.name ?? "")}</span>
                    <span className="text-panel-muted">победил {surname(amap[loser]?.name ?? "")}</span>
                  </div>
                );
              })}
              {!last.length && <div className="text-panel-muted">Пока нет</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
