import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { Hand, places, surname } from "@/lib/arm";
import { cn } from "@/lib/utils";

const MEDAL = ["bg-[#d4a72c] text-white", "bg-[#a8b0ba] text-white", "bg-[#b87333] text-white"];

/** Перерыв между руками: «Левая рука завершена — перерыв, затем правая» + призёры по категориям. */
export default function HandBreak({
  first,
  second,
  table,
  size,
}: {
  first: Hand;
  second: Hand;
  table?: number;
  size: "hero" | "card";
}) {
  const { brackets, matches, amap } = useStore();
  const classMap = useClassMap();
  const list = brackets
    .filter((b) => b.hand === first && b.done && !b.classKey.endsWith(":abs") && (table == null || b.table === table))
    .sort((a, b) => Object.keys(classMap).indexOf(a.classKey) - Object.keys(classMap).indexOf(b.classKey));
  const F = first === "left" ? "Левая" : "Правая";
  const S = second === "left" ? "левая" : "правая";
  const hero = size === "hero";
  const top = hero ? 3 : 1;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", hero ? "" : "p-3")}>
      <div
        className={cn(
          "flex animate-scale-in flex-col items-center justify-center rounded-lg border-4 border-primary bg-primary/5 text-center",
          hero ? "gap-2 px-6 py-5 md:py-7" : "gap-1 px-3 py-2",
        )}
      >
        <div className={cn("font-semibold leading-tight tracking-tight text-primary", hero ? "text-[clamp(30px,4.6vw,84px)]" : "text-lg md:text-2xl")}>
          {F} рука завершена
        </div>
        <div className={cn("text-panel-muted", hero ? "text-xl md:text-4xl" : "text-sm md:text-base")}>
          Перерыв · затем <b className="text-foreground">{S} рука</b>
        </div>
      </div>
      {list.length > 0 && (
        <div className={cn("min-h-0 flex-1 overflow-hidden", hero && "grid content-start gap-3 md:grid-cols-2 xl:grid-cols-3")}>
          {hero && (
            <div className="cat text-sm md:col-span-2 xl:col-span-3">
              ПОБЕДИТЕЛИ И ПРИЗЁРЫ · {F.toUpperCase()} РУКА
            </div>
          )}
          {list.map((b) => {
            const c = classMap[b.classKey];
            const rows = places(b, matches, amap).filter((r) => r.place <= top);
            return (
              <div key={b.key} className={cn(hero ? "rounded-lg border border-line bg-panel px-4 py-3" : "flex items-baseline gap-2 py-0.5 text-sm md:text-base")}>
                <div className={cn(hero ? "cat mb-1.5" : "w-24 shrink-0 truncate font-mono text-xs text-panel-muted md:w-32")}>
                  {hero ? `${c?.groupName ?? ""} · ${c?.label ?? ""}` : c?.label}
                </div>
                {hero ? (
                  rows.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 py-0.5 text-lg md:text-2xl">
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold", MEDAL[r.place - 1])}>
                        {r.place}
                      </span>
                      <span className={cn("truncate", r.place === 1 && "font-semibold")}>{amap[r.id]?.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="flex items-center gap-1.5 truncate font-medium">
                    <Icon name="Trophy" size={14} className="shrink-0 text-[#d4a72c]" />
                    {rows[0] ? surname(amap[rows[0].id]?.name ?? "") : "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
