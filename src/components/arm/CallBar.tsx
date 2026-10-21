import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Match, surname } from "@/lib/arm";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { callLeft } from "@/lib/queue";


/** Вызов пары к столу: 1 минута на выход (п. 11.2), иначе — поражение за неявку. */
export default function CallBar({ match, onNoShow }: { match: Match; onNoShow: (absentId: string) => void }) {
  const { amap, callMatch } = useStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!match.calledAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [match.calledAt]);
  const left = callLeft(match, now);
  const a = surname(amap[match.a]?.name ?? "");
  const b = surname(amap[match.b]?.name ?? "");

  if (left == null)
    return (
      <div className="win flex-row flex-wrap items-center gap-2 px-4 py-2.5">
        <Icon name="Megaphone" size={18} className="text-primary" />
        <span className="mr-auto text-sm">
          Вызовите пару к столу: <b className="text-corner-blue">{a}</b> — <b className="text-corner-red">{b}</b>
        </span>
        <button className="btn-blue !py-2" onClick={() => callMatch(match.id)} title="Пункт 11.2 Правил: на выход даётся 1 минута">
          <Icon name="Megaphone" size={16} /> Вызов · 1 мин
        </button>
      </div>
    );

  const over = left === 0;
  return (
    <div
      className={cn(
        "win flex-row flex-wrap items-center gap-2 border-2 px-4 py-2.5",
        over ? "animate-pulse border-corner-red bg-corner-red/10" : left <= 15 ? "border-corner-red/60" : "border-primary/50",
      )}
    >
      <Icon name="Megaphone" size={18} className={over ? "text-corner-red" : "text-primary"} />
      <span className="text-sm">{over ? "Время на выход истекло:" : "Вызвана пара, на выход:"}</span>
      <span className={cn("font-mono text-2xl font-semibold tabular-nums", over || left <= 15 ? "text-corner-red" : "")}>
        0:{String(left).padStart(2, "0")}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        <button className="pill !py-2" onClick={() => callMatch(match.id, false)} title="Оба на месте — убрать отсчёт">
          <Icon name="Check" size={14} /> Вышли
        </button>
        <button className="pill !py-2 text-corner-blue" onClick={() => onNoShow(match.a)} title="Засчитать поражение за неявку (п. 11.10)">
          Неявка: {a}
        </button>
        <button className="pill !py-2 text-corner-red" onClick={() => onNoShow(match.b)} title="Засчитать поражение за неявку (п. 11.10)">
          Неявка: {b}
        </button>
      </div>
    </div>
  );
}
