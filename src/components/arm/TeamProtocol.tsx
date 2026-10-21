import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { DISTRICT_FULL, TeamBy, tMode, tPoints, teamStandings } from "@/lib/arm";
import { cn } from "@/lib/utils";

export default function TeamProtocol({ onlyDone }: { onlyDone: boolean }) {
  const { brackets, matches, amap, tournament, setTournament } = useStore();
  const pts = tPoints(tournament);
  const mode = tMode(tournament);
  const bestOnly = tournament.teamBestOnly ?? true;
  const [by, setBy] = useState<TeamBy>("team");
  const used = useMemo(() => brackets.filter((b) => !onlyDone || b.done), [brackets, onlyDone]);
  const rows = useMemo(
    () => teamStandings(used, matches, amap, pts, { by, mode, bestOnly }),
    [used, matches, amap, pts, by, mode, bestOnly],
  );
  const pending = brackets.filter((b) => !b.done).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button className={cn("pill", by === "team" && "pill-on")} onClick={() => setBy("team")}>
          По командам / субъектам
        </button>
        <button className={cn("pill", by === "district" && "pill-on")} onClick={() => setBy("district")}>
          По федеральным округам
        </button>
        <button
          className={cn("pill", bestOnly && "pill-on")}
          onClick={() => setTournament({ teamBestOnly: !bestOnly })}
          title="Как в протоколах ФАР: от команды в каждой весовой категории идёт в зачёт только лучший участник"
        >
          {bestOnly ? "Лучший в категории" : "Все участники"}
        </button>
      </div>
      <div className="hidden text-center text-base font-semibold print:block">
        {by === "team" ? "Командный зачёт среди субъектов / команд" : "Командный зачёт среди федеральных округов"}
      </div>
      {pending > 0 && (
        <div className="rounded-lg bg-tip p-3 text-sm text-tip-foreground print:hidden">
          Не завершено категорий: {pending}. Командный зачёт будет окончательным после завершения всех категорий.
        </div>
      )}
      {!rows.length ? (
        <div className="win flex-1 items-center justify-center p-10 text-panel-muted">
          {by === "team"
            ? "Нет данных: укажите команду (субъект) участников и проведите категории"
            : "Нет данных: укажите федеральный округ участников"}
        </div>
      ) : (
        <div className="win print:rounded-none print:bg-white print:text-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs text-panel-muted print:border-black print:text-black">
                <th className="w-20 px-4 py-2 font-normal">место</th>
                <th className="px-2 py-2 font-normal">{by === "team" ? "команда / субъект РФ" : "федеральный округ"}</th>
                {mode === "hands" && (
                  <>
                    <th className="px-2 py-2 text-right font-normal">левая</th>
                    <th className="px-2 py-2 text-right font-normal">правая</th>
                  </>
                )}
                <th className="px-2 py-2 text-center font-normal print:hidden">з/с/б</th>
                <th className="px-4 py-2 text-right font-normal">сумма очков</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.team} className="border-b border-line/60 last:border-0 print:border-black/40">
                  <td className="px-4 py-2 font-mono font-semibold">{r.placeLabel}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{by === "district" ? DISTRICT_FULL[r.team] ?? r.team : r.team}</div>
                    <div className="text-xs text-panel-muted print:hidden">участников: {r.members}</div>
                    {r.tieNote && <div className="text-xs text-panel-muted print:text-black">{r.tieNote}</div>}
                  </td>
                  {mode === "hands" && (
                    <>
                      <td className="px-2 py-2 text-right font-mono">{r.left}</td>
                      <td className="px-2 py-2 text-right font-mono">{r.right}</td>
                    </>
                  )}
                  <td className="px-2 py-2 text-center font-mono print:hidden">{r.medals.join("/")}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-foreground/70 print:hidden">
        Очки: {pts.map((p, i) => `${i + 1}-е — ${p}`).join(", ")}, дальше 0.{" "}
        {mode === "biathlon" ? "Считаются места по двоеборью." : "Считаются места на каждой руке."}{" "}
        {bestOnly
          ? "От команды в каждой весовой категории засчитывается только лучший результат (как в протоколе Первенства России)."
          : "Засчитываются все участники команды."}{" "}
        При равной сумме выше команда с большим числом более высоких мест (п. 1.1 Правил); при полном совпадении — делят места («4-5»).
      </p>
    </div>
  );
}
