import { useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Fight, FightNight, Side, fightState, fighterSurname, pushEvent, startTimer, stopTimer, undoEvent, useFights } from "@/lib/fights";
import { fmtSec } from "@/lib/timers";
import { cn } from "@/lib/utils";
import { useCountdown } from "./FightBoard";


/** Пульт судьи армфайта: победа в раунде, фолы, срыв → ремень, таймеры отдыха. */
export default function FightPanel({ f, night }: { f: Fight; night: FightNight }) {
  const { update } = useFights();
  const st = fightState(f);
  const done = !!st.winner;
  const timer = night.timer?.fightId === f.id ? night.timer : null;
  const left = useCountdown(timer?.until);

  const win = (s: Side) => pushEvent(f.id, { t: "round", w: s, at: Date.now() });
  const foul = (s: Side) => pushEvent(f.id, { t: "foul", s, at: Date.now() });
  const slip = () => pushEvent(f.id, { t: "slip", at: Date.now() });

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "backspace") {
        e.preventDefault();
        undoEvent(f.id);
        return;
      }
      if (done) return;
      if (k === "1") win("blue");
      else if (k === "2") win("red");
      else if (k === "q" || k === "й") foul("blue");
      else if (k === "w" || k === "ц") foul("red");
      else if (k === "s" || k === "ы") slip();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.id, done]);

  const forfeit = (w: Side) => {
    const reason = prompt(`Причина досрочной победы ${f[w].name} (неявка, травма соперника, дисквалификация):`, "неявка соперника");
    if (reason == null) return;
    pushEvent(f.id, { t: "forfeit", w, reason: reason || "досрочно", at: Date.now() });
  };

  const nextFight = () => {
    const i = night.fights.findIndex((x) => x.id === f.id);
    const nxt = night.fights.slice(i + 1).find((x) => !fightState(x).winner) ?? night.fights.find((x) => !fightState(x).winner);
    update((p) => ({ ...p, current: nxt?.id ?? null, timer: null }));
  };

  const side = (s: Side) => {
    const blue = s === "blue";
    return (
      <div className={cn("flex flex-1 flex-col gap-2 rounded-[14px] border-2 p-3", blue ? "border-corner-blue/60 bg-corner-blue/5" : "border-corner-red/60 bg-corner-red/5")}>
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-lg font-bold", blue ? "text-corner-blue" : "text-corner-red")}>{f[s].name}</span>
          <span className="font-mono text-4xl font-bold tabular-nums">{st.score[s]}</span>
        </div>
        <button
          disabled={done}
          onClick={() => win(s)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-[12px] py-4 text-lg font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-40",
            blue ? "bg-corner-blue hover:brightness-110" : "bg-corner-red hover:brightness-110",
          )}
        >
          <Icon name="Trophy" size={20} /> Раунд {blue ? "синему" : "красному"}
          <kbd className="rounded bg-white/20 px-1.5 font-mono text-xs">{blue ? "1" : "2"}</kbd>
        </button>
        <div className="flex items-center gap-2">
          <button
            disabled={done}
            onClick={() => foul(s)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border-2 border-amber-400 bg-amber-50 py-2 font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
          >
            <Icon name="TriangleAlert" size={16} /> Фол
            <kbd className="rounded bg-amber-200 px-1.5 font-mono text-[10px]">{blue ? "Q" : "W"}</kbd>
          </button>
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <span key={i} className={cn("h-5 w-5 rounded-full border-2", i < st.fouls[s] ? "border-amber-500 bg-amber-400" : "border-line")} />
            ))}
          </div>
        </div>
        {!done && (
          <button className="self-start text-xs text-panel-muted underline-offset-2 hover:underline" onClick={() => forfeit(s)}>
            досрочная победа {blue ? "синего" : "красного"}…
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="win gap-3 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={cn("rounded-full px-3 py-1 font-semibold", done ? "bg-navy text-gold" : "bg-gold/25 text-foreground")}>
          {done ? `Бой окончен: победа ${fighterSurname(f[st.winner!])} ${st.score.blue}:${st.score.red}` : `Раунд ${st.round} из максимум ${f.bestOf} · до ${st.need} побед`}
        </span>
        {!done && st.strap && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 font-semibold text-navy">
            <Icon name="Link" size={14} /> раунд с ремнём{st.slips > 1 ? ` (срывов: ${st.slips})` : ""}
          </span>
        )}
        {st.rounds.length > 0 && (
          <span className="flex gap-1">
            {st.rounds.map((r) => (
              <span
                key={r.n}
                className={cn("flex h-6 min-w-6 items-center justify-center rounded px-1 font-mono text-xs font-semibold text-white", r.w === "blue" ? "bg-corner-blue" : "bg-corner-red")}
                title={`${r.n}-й раунд${r.how === "fouls" ? " — 2 фола соперника" : ""}${r.strap ? ", с ремнём" : ""}`}
              >
                {r.n}
                {r.how === "fouls" ? "ф" : ""}
                {r.strap ? "р" : ""}
              </span>
            ))}
          </span>
        )}
        <button className="pill ml-auto !py-1.5" onClick={() => undoEvent(f.id)} disabled={!f.log.length} title="Отменить последнее действие (Backspace)">
          <Icon name="Undo2" size={15} /> Отменить
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        {side("blue")}
        <div className="flex flex-row items-center justify-center gap-2 md:w-44 md:flex-col">
          <button
            disabled={done}
            onClick={slip}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-line bg-surface px-3 py-3 font-semibold transition hover:border-amber-400 disabled:opacity-40"
            title="Срыв рук без фола — раунд переигрывается с ремнём"
          >
            <Icon name="Link" size={17} /> Срыв → ремень <kbd className="rounded bg-line px-1 font-mono text-[10px]">S</kbd>
          </button>
          <div className="flex w-full flex-col items-center rounded-[12px] bg-navy px-3 py-2 text-white">
            <span className="text-[10px] uppercase text-white/60">{timer ? (timer.kind === "foul" ? "после фола" : "между раундами") : "отдых"}</span>
            <span className={cn("font-mono text-3xl font-bold tabular-nums", left === 0 ? "text-corner-red" : left != null && left <= 10 ? "text-amber-400" : "")}>
              {left == null ? "—:—" : left === 0 ? "0:00" : fmtSec(left)}
            </span>
            <div className="mt-1 flex gap-1">
              <button className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] hover:bg-white/25" onClick={() => startTimer("round", f.id)} title="Отдых между раундами">
                {night.restRound}с
              </button>
              <button className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] hover:bg-white/25" onClick={() => startTimer("foul", f.id)} title="Отдых после фола">
                {night.restFoul}с
              </button>
              {timer && (
                <button className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] hover:bg-white/25" onClick={stopTimer} title="Остановить">
                  <Icon name="Square" size={10} />
                </button>
              )}
            </div>
          </div>
        </div>
        {side("red")}
      </div>

      {done && (
        <button className="btn-gold self-center" onClick={nextFight}>
          <Icon name="ChevronsRight" size={18} /> Следующий бой
        </button>
      )}
    </div>
  );
}
