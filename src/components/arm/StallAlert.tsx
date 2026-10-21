import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { fmtMin, useStallWatch } from "@/lib/stallWatch";
import { surname } from "@/lib/arm";

/** Сигнал секретарю: пара у стола дольше 3 минут без результата. */
export default function StallAlert({ onGoJudge }: { onGoJudge: (table: number) => void }) {
  const { matches, amap, tournament } = useStore();
  const { stalls, snooze } = useStallWatch(matches, tournament.tables);
  if (!stalls.length) return null;
  return (
    <div className="flex flex-col gap-2 print:hidden">
      {stalls.map((s) => (
        <div
          key={s.table}
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-corner-red bg-corner-red/10 px-4 py-3 text-foreground"
        >
          <Icon name="BellRing" size={22} className="animate-pulse text-corner-red" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              Стол {s.table}: пара стоит без результата уже {fmtMin(s.ms)}
            </div>
            <div className="text-sm text-panel-muted">
              {surname(amap[s.match.a]?.name ?? "")} — {surname(amap[s.match.b]?.name ?? "")}. Проверьте, не забыли ли отметить победителя.
            </div>
          </div>
          <button className="btn-blue !py-2" onClick={() => onGoJudge(s.table)}>
            <Icon name="Gavel" size={16} /> К пульту
          </button>
          <button className="pill !py-2" onClick={() => snooze(s.table)} title="Напомнить ещё через 3 минуты">
            <Icon name="AlarmClockOff" size={15} /> Ещё 3 мин
          </button>
        </div>
      ))}
    </div>
  );
}
