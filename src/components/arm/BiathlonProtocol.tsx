import { Fragment, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { biathlon, fmtBirth, fmtKg2, tPoints } from "@/lib/arm";
import { cn } from "@/lib/utils";
import ReweighInput from "./ReweighInput";
import DeciderButton from "./DeciderButton";

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
    <div className="flex flex-col gap-4 print:block">
      {classes.map((c) => {
        const cls = classMap[c.key];
        const rows = biathlon(c.key, brackets, matches, amap, pts);
        return (
          <div key={c.key} className="win print:mb-6 print:break-inside-avoid print:rounded-none print:bg-white print:text-black">
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 print:border-black print:bg-white">
              <div className="flex-1">
                <div className="text-lg font-medium">
                  {cls?.groupName} · весовая категория {cls?.label.replace("до ", "")}
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
            <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm print:min-w-0 print:text-[10px]">
              <thead>
                <tr className="border-b border-line text-left align-bottom font-mono text-xs text-panel-muted print:border-black print:text-black">
                  <th className="w-14 px-3 py-2 font-normal">место по «двоеборью»</th>
                  <th className="px-2 py-2 font-normal">фамилия, имя, отчество</th>
                  <th className="px-2 py-2 font-normal">пол, дата рождения</th>
                  <th className="px-2 py-2 font-normal">спорт. звание</th>
                  <th className="px-2 py-2 font-normal">субъект РФ / команда</th>
                  <th className="px-2 py-2 font-normal">фед. округ</th>
                  <th className="px-2 py-2 text-center font-normal">место левой</th>
                  <th className="px-2 py-2 text-center font-normal">очки</th>
                  <th className="px-2 py-2 text-center font-normal">место правой</th>
                  <th className="px-2 py-2 text-center font-normal">очки</th>
                  <th className="px-2 py-2 text-center font-normal">сумма очков</th>
                  <th className="px-3 py-2 text-right font-normal">вес (кг)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = amap[r.id];
                  return (
                    <Fragment key={r.id}>
                      <tr className={cn("border-b border-line/60 last:border-0 print:border-black/40", r.rule && "bg-gold/15 print:bg-white")}>
                        <td className="px-3 py-2 font-mono font-semibold">
                          {r.rule ? (
                            <span
                              className="inline-flex flex-col items-start leading-tight"
                              title={`Место присуждено по п. ${r.rule} Правил`}
                            >
                              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gold px-1.5 text-navy ring-2 ring-gold/40 print:bg-white print:text-black print:ring-0">
                                {r.place}*
                              </span>
                              <span className="mt-0.5 whitespace-nowrap font-sans text-[10px] font-medium text-primary print:text-black">п. {r.rule}</span>
                            </span>
                          ) : (
                            r.place
                          )}
                        </td>
                        <td className="px-2 py-2 font-medium">{a?.name}</td>
                        <td className="px-2 py-2 text-panel-muted print:text-black">
                          {a?.gender === "F" ? "жен." : "муж."}
                          <div className="font-mono text-xs">{a ? fmtBirth(a) : ""}</div>
                        </td>
                        <td className="px-2 py-2">{a?.rank || "—"}</td>
                        <td className="px-2 py-2">{a?.club || "—"}</td>
                        <td className="px-2 py-2">{a?.district || "—"}</td>
                        <td className="px-2 py-2 text-center font-mono">{r.left ?? "—"}</td>
                        <td className="px-2 py-2 text-center font-mono">{r.left != null ? r.leftPts : ""}</td>
                        <td className="px-2 py-2 text-center font-mono">{r.right ?? "—"}</td>
                        <td className="px-2 py-2 text-center font-mono">{r.right != null ? r.rightPts : ""}</td>
                        <td className="px-2 py-2 text-center font-mono font-semibold">{r.total}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-panel-muted print:text-black">
                          {fmtKg2(a?.weight)}
                          {a?.reweigh != null && <span className="ml-1 text-xs">({fmtKg2(a.reweigh)})</span>}
                          {r.needReweigh && <ReweighInput id={r.id} />}
                        </td>
                      </tr>
                      {r.note && (
                        <tr className={cn("border-b border-line/60 print:border-black/40", r.rule && "bg-gold/15 print:bg-white")}>
                          <td />
                          <td colSpan={11} className={cn("px-2 pb-2 text-xs", r.needReweigh ? "text-destructive print:text-black" : r.rule ? "text-foreground print:text-black" : "text-panel-muted print:text-black")}>
                            {r.rule && (
                              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground print:border print:border-black print:bg-white print:text-black">
                                <Icon name="Scale" size={11} /> * п. {r.rule} Правил
                              </span>
                            )}
                            {r.note}
                            {r.decider && <DeciderButton classKey={c.key} x={r.decider} y={r.id} />}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
