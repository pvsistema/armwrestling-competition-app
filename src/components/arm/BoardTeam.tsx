import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { tMode, tPoints, teamStandings } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { Flag } from "./FarFlag";

/** Командный зачёт на табло: субъекты РФ с флагами. */
export default function BoardTeam({ standalone }: { standalone?: boolean }) {
  const { brackets, matches, amap, tournament } = useStore();
  const pts = tPoints(tournament);
  const rows = useMemo(
    () => teamStandings(brackets, matches, amap, pts, { by: "team", mode: tMode(tournament), bestOnly: tournament.teamBestOnly ?? true }),
    [brackets, matches, amap, pts, tournament],
  );
  const flags = tournament.showFlagBoard ?? true;
  const pending = brackets.filter((b) => !b.done).length;
  const top = rows.slice(0, 16);
  const two = top.length > 8;

  if (!rows.length)
    return <div className="flex flex-1 items-center justify-center rounded-lg border border-line bg-surface p-10 text-3xl text-panel-muted">Командный зачёт появится после первых результатов</div>;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-line bg-frame p-3 md:p-4", standalone && "overflow-hidden")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-2xl font-semibold tracking-tight md:text-4xl">Командный зачёт</div>
        <div className="text-base text-panel-muted md:text-xl">
          {pending ? `предварительно · не завершено категорий: ${pending}` : "итог"}
        </div>
      </div>
      <div className={cn("grid min-h-0 flex-1 gap-2", two ? "md:grid-flow-col md:grid-cols-2 md:grid-rows-8" : "auto-rows-fr")}>
        {top.map((r) => {
          const p = parseInt(r.placeLabel, 10);
          return (
            <div
              key={r.team}
              className={cn(
                "flex min-h-0 items-center gap-3 rounded-lg border bg-panel px-3 py-1.5 md:gap-4 md:px-5",
                p === 1 ? "border-gold border-2" : p <= 3 ? "border-gold/60" : "border-line",
              )}
            >
              <div className={cn("w-[2.6em] shrink-0 text-center font-mono text-xl font-semibold md:text-3xl", p <= 3 && "text-primary")}>{r.placeLabel}</div>
              {flags && <Flag team={r.team} className="h-[clamp(26px,4.2vh,56px)] w-[clamp(39px,6.3vh,84px)]" />}
              <div className="min-w-0 flex-1 truncate text-xl font-medium md:text-[clamp(20px,2.1vw,36px)]">{r.team}</div>
              <div className="shrink-0 font-mono text-2xl font-semibold tabular-nums md:text-[clamp(24px,2.4vw,42px)]">{r.total}</div>
            </div>
          );
        })}
      </div>
      {rows.length > top.length && <div className="text-sm text-panel-muted md:text-base">и ещё команд: {rows.length - top.length}</div>}
    </div>
  );
}
