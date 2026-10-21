import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { HAND_LABEL } from "@/lib/arm";
import { handStage, waitingSecond } from "@/lib/queue";
import { cn } from "@/lib/utils";

/** Этап турнира: сначала вся первая рука, затем вторая. */
export default function HandStageBar({ table, onProtocol }: { table: number | "all"; onProtocol?: () => void }) {
  const { matches, tournament, setTournament } = useStore();
  if (!matches.length) return null;
  const st = handStage(matches, tournament);
  const staged = tournament.handStages ?? true;
  const waiting = waitingSecond(matches, table, tournament);
  const firstDone = st.firstTotal > 0 && st.firstLeft === 0;
  const pct = st.firstTotal ? Math.round(((st.firstTotal - st.firstLeft) / st.firstTotal) * 100) : 0;
  const F = HAND_LABEL[st.first];
  const S = HAND_LABEL[st.second];

  if (!staged) return null;

  return (
    <div
      className={cn(
        "win flex-row flex-wrap items-center gap-3 px-4 py-2.5 print:hidden",
        firstDone && "border-2 border-tip bg-tip/30",
      )}
    >
      <Icon name={firstDone ? "CircleCheck" : "Hand"} size={18} className="text-primary" />
      {firstDone ? (
        <>
          <span className="text-sm">
            <b>Этап 1 завершён: {F} рука.</b> Идёт этап 2 — {S} рука. Протокол {F === "левая" ? "левой" : "правой"} руки готов.
          </span>
          {onProtocol && (
            <button className="pill ml-auto !py-1.5 text-sm" onClick={onProtocol}>
              <Icon name="FileText" size={14} /> Протокол {F === "левая" ? "левой" : "правой"} руки
            </button>
          )}
        </>
      ) : (
        <>
          <span className="text-sm">
            <b>Этап 1: {F} рука</b> на всех столах · осталось {st.firstLeft} из {st.firstTotal}
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          {st.gated ? (
            waiting > 0 && (
              <button
                className="pill ml-auto !py-1.5 text-xs"
                onClick={() =>
                  confirm(`Разрешить начинать ${S === "правая" ? "правую" : "левую"} руку, не дожидаясь окончания ${F === "левая" ? "левой" : "правой"} на всех столах?`) &&
                  setTournament({ secondHandOpen: true })
                }
                title="Если стол освободился, а на других ещё идёт первая рука"
              >
                <Icon name="FastForward" size={13} /> Начать {S === "правая" ? "правую" : "левую"} раньше
              </button>
            )
          ) : (
            <span className="ml-auto flex items-center gap-2 text-xs text-panel-muted">
              {S} рука уже разрешена
              <button className="underline" onClick={() => setTournament({ secondHandOpen: false })}>
                вернуть очерёдность
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
}
