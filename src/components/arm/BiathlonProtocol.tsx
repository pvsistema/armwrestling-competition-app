import { Fragment, useMemo } from "react";
import { useClassMap, useStore } from "@/lib/store";
import { biathlon, fmtKg, tPoints } from "@/lib/arm";
import { cn } from "@/lib/utils";
import ReweighInput from "./ReweighInput";

export default function BiathlonProtocol({ onlyDone }: { onlyDone: boolean }) {
  const { brackets, matches, amap, tournament } = useStore();
  const classMap = useClassMap();
  const pts = tPoints(tournament);

  const classes = useMemo(() => {
    const keys = Array.from(new Set(brackets.map((b) => b.classKey))).sort();
    return keys
      .map((k) => {
        const own = brackets.filter((b) => b.classKey === k);
        return { key: k, done: own.length > 0 && own.every((b) => b.done), hands: own.length };
      })
      .filter((c) => !onlyDone || c.done);
  }, [brackets, onlyDone]);

  if (!classes.length)
    return <div className="win flex-1 items-center justify-center p-10 text-panel-muted">Нет категорий для двоеборья</div>;

  return (
    <div className="grid gap-4 xl:grid-cols-2 print:block">
      {classes.map((c) => {
        const cls = classMap[c.key];
        const rows = biathlon(c.key, brackets, matches, amap, pts);
        return (
          <div key={c.key} className="win print:mb-6 print:break-inside-avoid print:rounded-none print:bg-white print:text-black">
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 print:border-black print:bg-white">
              <div className="flex-1">
                <div className="text-lg font-medium">
                  {cls?.groupName} · {cls?.label} · двоеборье
                </div>
                <div className="font-mono text-xs text-panel-muted print:text-black">
                  {rows.length} участников · {c.hands === 2 ? "правая + левая" : "только одна рука проведена"}
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[11px] print:hidden",
                  c.done ? "bg-tip text-tip-foreground" : "bg-line text-panel-muted",
                )}
              >
                {c.done ? "итог" : "идёт · предварительно"}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-panel-muted print:border-black print:text-black">
                  <th className="w-14 px-4 py-2 font-normal">место</th>
                  <th className="px-2 py-2 font-normal">участник</th>
                  <th className="px-2 py-2 font-normal">вес</th>
                  <th className="px-2 py-2 text-center font-normal">правая м/о</th>
                  <th className="px-2 py-2 text-center font-normal">левая м/о</th>
                  <th className="px-4 py-2 text-right font-normal">сумма</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = amap[r.id];
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-line/60 last:border-0 print:border-black/40">
                        <td className="px-4 py-2 font-mono font-semibold">{r.place}</td>
                        <td className="px-2 py-2">
                          <div className="font-medium">{a?.name}</div>
                          <div className="text-xs text-panel-muted print:text-black">{a?.club}</div>
                        </td>
                        <td className="px-2 py-2 font-mono text-panel-muted print:text-black">
                          {fmtKg(a?.weight)}
                          {a?.reweigh != null && <span className="ml-1 text-xs">({fmtKg(a.reweigh)})</span>}
                          {r.needReweigh && <ReweighInput id={r.id} />}
                        </td>
                        <td className="px-2 py-2 text-center font-mono">{r.right != null ? `${r.right} / ${r.rightPts}` : "—"}</td>
                        <td className="px-2 py-2 text-center font-mono">{r.left != null ? `${r.left} / ${r.leftPts}` : "—"}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{r.total}</td>
                      </tr>
                      {r.note && (
                        <tr className="border-b border-line/60 print:border-black/40">
                          <td />
                          <td colSpan={5} className={cn("px-2 pb-2 text-xs", r.needReweigh ? "text-destructive print:text-black" : "text-panel-muted print:text-black")}>
                            {r.note}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
