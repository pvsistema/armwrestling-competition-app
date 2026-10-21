import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { Hand } from "@/lib/arm";
import { handStage, tableBreak, tableFirstLeft, waitingSecond } from "@/lib/queue";
import { cn } from "@/lib/utils";

const gen = (h: Hand) => (h === "left" ? "левой" : "правой");
const acc = (h: Hand) => (h === "left" ? "левую" : "правую");
const nom = (h: Hand) => (h === "left" ? "левая" : "правая");

/** Этап на пульте: какая рука идёт на этом столе и во всём турнире. */
export default function HandStageBar({ table }: { table: number | "all" }) {
  const { matches, tournament, setTournament } = useStore();
  if (!matches.length) return null;
  const st = handStage(matches, tournament);
  if (st.flow === "free" || !st.firstTotal) return null;
  const waiting = waitingSecond(matches, table, tournament);
  const allDone = st.firstLeft === 0;
  const own = typeof table === "number" ? tableFirstLeft(matches, table, tournament) : null;
  const left = own ? own.left : st.firstLeft;
  const total = own ? own.total : st.firstTotal;
  const pct = total ? Math.round(((total - left) / total) * 100) : 100;
  const onBreak = typeof table === "number" && tableBreak(matches, table, tournament);
  const where = typeof table === "number" ? `Стол ${table}` : "Все столы";

  return (
    <div
      className={cn(
        "win flex-row flex-wrap items-center gap-3 px-4 py-2.5 print:hidden",
        left === 0 && total > 0 && "border-2 border-tip bg-tip/30",
      )}
    >
      <Icon name={left === 0 ? "CircleCheck" : "Hand"} size={18} className="text-primary" />
      {left > 0 ? (
        <>
          <span className="text-sm">
            <b>
              {where}: {nom(st.first)} рука
            </b>{" "}
            · осталось {left} из {total}
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          {st.flow === "table" && (
            <span className="text-xs text-panel-muted">
              стол, закончивший {gen(st.first)}, сразу начинает {acc(st.second)}
            </span>
          )}
        </>
      ) : (
        <span className="text-sm">
          <b>
            {where}: {nom(st.first)} рука завершена
          </b>
          {onBreak
            ? ` — перерыв, на табло победители. Вызовите первую пару — начнётся ${nom(st.second)} рука.`
            : ` · идёт ${nom(st.second)} рука.`}
          {!allDone && typeof table === "number" && ` На других столах ${nom(st.first)} ещё идёт (осталось ${st.firstLeft}).`}
        </span>
      )}
      {waiting > 0 && !tournament.secondHandOpen && (
        <button
          className="pill ml-auto !py-1.5 text-xs"
          onClick={() =>
            confirm(`Разрешить ${acc(st.second)} руку сейчас, не дожидаясь окончания ${gen(st.first)}?`) &&
            setTournament({ secondHandOpen: true })
          }
        >
          <Icon name="FastForward" size={13} /> Начать {acc(st.second)} раньше
        </button>
      )}
      {tournament.secondHandOpen && !allDone && (
        <span className="ml-auto flex items-center gap-2 text-xs text-panel-muted">
          {nom(st.second)} рука разрешена досрочно
          <button className="underline" onClick={() => setTournament({ secondHandOpen: false })}>
            вернуть очерёдность
          </button>
        </span>
      )}
    </div>
  );
}
