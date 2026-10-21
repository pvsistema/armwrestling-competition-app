import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { teamStandings, tPoints } from "@/lib/arm";
import { cn } from "@/lib/utils";

const med = (m: [number, number, number]) => m.join("/");

export default function TeamProtocol({ onlyDone }: { onlyDone: boolean }) {
  const { brackets, matches, amap, tournament } = useStore();
  const pts = tPoints(tournament);
  const used = useMemo(() => brackets.filter((b) => !onlyDone || b.done), [brackets, onlyDone]);
  const rows = useMemo(() => teamStandings(used, matches, amap, pts), [used, matches, amap, pts]);
  const pending = brackets.filter((b) => !b.done).length;

  if (!rows.length)
    return <div className="win flex-1 items-center justify-center p-10 text-panel-muted">Нет данных: укажите команды (клубы) участников и проведите категории</div>;

  return (
    <div className="flex flex-col gap-3">
      {pending > 0 && (
        <div className="rounded-lg bg-tip p-3 text-sm text-tip-foreground print:hidden">
          Не завершено категорий: {pending}. Командный зачёт будет окончательным после завершения всех категорий.
        </div>
      )}
      <div className="win print:rounded-none print:bg-white print:text-black">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-xs text-panel-muted print:border-black print:text-black">
              <th className="w-14 px-4 py-2 font-normal">место</th>
              <th className="px-2 py-2 font-normal">команда</th>
              <th className="px-2 py-2 text-center font-normal">правая з/с/б</th>
              <th className="px-2 py-2 text-right font-normal">очки</th>
              <th className="px-2 py-2 text-center font-normal">левая з/с/б</th>
              <th className="px-2 py-2 text-right font-normal">очки</th>
              <th className="px-2 py-2 text-center font-normal">всего з/с/б</th>
              <th className="px-4 py-2 text-right font-normal">сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.team} className="border-b border-line/60 last:border-0 print:border-black/40">
                <td className="px-4 py-2">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-semibold print:bg-transparent print:text-black",
                      r.place === 1 && "bg-tip text-tip-foreground",
                    )}
                  >
                    {r.place}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <div className="font-medium">{r.team}</div>
                  <div className="text-xs text-panel-muted print:text-black">участников: {r.members}</div>
                </td>
                <td className="px-2 py-2 text-center font-mono">{med(r.right.medals)}</td>
                <td className="px-2 py-2 text-right font-mono">{r.right.points}</td>
                <td className="px-2 py-2 text-center font-mono">{med(r.left.medals)}</td>
                <td className="px-2 py-2 text-right font-mono">{r.left.points}</td>
                <td className="px-2 py-2 text-center font-mono">{med(r.medals)}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/70 print:text-black">
        Очки команде — за места её участников на каждой руке ({pts.map((p, i) => `${i + 1}-е — ${p}`).join(", ")}). При равенстве очков выше команда с бо́льшим числом золотых, затем серебряных и бронзовых медалей.
      </p>
    </div>
  );
}
