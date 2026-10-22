import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Fight, FightNight, HAND_SHORT, Side, fightState, fighterSurname, formatLabel } from "@/lib/fights";
import { beep, fmtSec } from "@/lib/timers";
import { cn } from "@/lib/utils";
import Logo from "../Logo";
import { FighterFlag, FighterPhoto } from "./FighterFace";

export function useCountdown(until: number | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [until]);
  if (!until) return null;
  return Math.max(0, Math.ceil((until - now) / 1000));
}


function Corner({ f, side, score, fouls, win, big }: { f: Fight; side: Side; score: number; fouls: number; win: boolean | null; big: boolean }) {
  const x = f[side];
  const blue = side === "blue";
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-[1.5vh]", win === false && "opacity-45")}>
      <div className="relative">
        <FighterPhoto f={x} corner={side} className={big ? "h-[30vh] w-[25vh]" : "h-40 w-32"} />
        {win && (
          <span className="absolute -right-3 -top-3 flex h-[6vh] min-h-10 w-[6vh] min-w-10 items-center justify-center rounded-full bg-gold text-navy shadow-lg ring-4 ring-navy">
            <Icon name="Trophy" size={big ? 30 : 20} />
          </span>
        )}
      </div>
      <div className="flex max-w-full items-center gap-2">
        <FighterFlag region={x.region} className={big ? "h-[4.2vh] w-[6.3vh]" : "h-6 w-9"} />
        <span className={cn("truncate text-white/80", big ? "text-[2.4vh]" : "text-sm")}>{x.region}</span>
      </div>
      <div className={cn("max-w-full text-center font-bold uppercase leading-none tracking-tight", big ? "text-[5.4vh]" : "text-2xl", blue ? "text-[hsl(214_90%_72%)]" : "text-[hsl(354_85%_70%)]")}>
        {fighterSurname(x)}
      </div>
      <div className={cn("max-w-full truncate text-center text-white/85", big ? "text-[2.6vh]" : "text-sm")}>{x.name}</div>
      <div className={cn("rounded-full px-3 py-0.5 font-medium text-gold", x.note ? "bg-gold/20" : "invisible", big ? "text-[2.2vh]" : "text-xs")}>{x.note || "—"}</div>
      <div className={cn("flex items-center gap-1.5", big ? "h-[3.4vh]" : "h-5")}>
        {[0, 1].map((i) => (
          <span key={i} className={cn("rounded-full border-2", big ? "h-[2.6vh] w-[2.6vh]" : "h-3.5 w-3.5", i < fouls ? "border-amber-400 bg-amber-400" : "border-white/25")} />
        ))}
        <span className={cn("ml-1 uppercase text-white/50", big ? "text-[1.8vh]" : "text-[10px]")}>фолы</span>
      </div>
      <span className="sr-only">{score}</span>
    </div>
  );
}

/** Табло армфайта: крупный счёт, фото, флаги, раунды. */
export default function FightBoard({ night, big = false, sound = false }: { night: FightNight; big?: boolean; sound?: boolean }) {
  const f = night.fights.find((x) => x.id === night.current) ?? null;
  const left = useCountdown(night.timer?.until);
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (!sound || !night.timer || left !== 0) return;
    if (beeped.current === night.timer.until) return;
    beeped.current = night.timer.until;
    beep(3);
  }, [left, night.timer, sound]);

  if (!f)
    return (
      <div className="navy-band flex flex-1 flex-col items-center justify-center gap-6 rounded-[14px] p-8 text-white">
        <Logo hq className={big ? "h-[30vh] w-[30vh]" : "h-40 w-40"} />
        <div className={cn("gold-text text-center font-bold", big ? "text-[7vh]" : "text-4xl")}>{night.name || "Вечер армфайтов"}</div>
        {night.place && <div className={cn("text-white/70", big ? "text-[3vh]" : "")}>{night.place}</div>}
        <UpNext night={night} big={big} />
      </div>
    );

  const st = fightState(f);
  const timer = night.timer && night.timer.fightId === f.id ? night.timer : null;
  const roundLabel = st.winner ? "Бой окончен" : `Раунд ${st.round}`;
  const head = [f.title ? "Титульный бой" : f.main ? "Главный бой" : "Супербой", f.category, HAND_SHORT[f.hand], roundLabel].filter(Boolean).join(" · ");

  return (
    <div className="navy-band relative flex flex-1 flex-col overflow-hidden rounded-[14px] px-[3vw] py-[2.5vh] text-white">
      <div className="tricolor absolute inset-x-0 top-0" />
      <div className="flex items-center justify-between gap-4">
        <Logo className={big ? "h-[8vh] w-[8vh]" : "h-12 w-12"} />
        <div className="min-w-0 flex-1 text-center">
          <div className={cn("truncate text-white/70", big ? "text-[2.4vh]" : "text-sm")}>{night.name}</div>
          <div className={cn("font-semibold uppercase tracking-wide", big ? "text-[3.4vh]" : "text-lg", f.title ? "text-gold" : "text-white")}>
            {f.title && <Icon name="Trophy" size={big ? 28 : 18} className="mr-2 inline align-[-0.1em]" />}
            {head}
          </div>
        </div>
        <div className={cn("rounded-full border border-white/25 px-3 py-1 font-mono text-white/70", big ? "text-[2vh]" : "text-xs")}>{formatLabel(f.bestOf)}</div>
      </div>

      <div className="mt-[2vh] flex flex-1 items-center gap-[2vw]">
        <Corner f={f} side="blue" score={st.score.blue} fouls={st.fouls.blue} win={st.winner ? st.winner === "blue" : null} big={big} />
        <div className="flex shrink-0 flex-col items-center gap-[2vh]">
          <div className={cn("flex items-center font-mono font-bold leading-none tabular-nums", big ? "gap-[2vw] text-[20vh]" : "gap-4 text-7xl")}>
            <span className="text-[hsl(214_90%_72%)]">{st.score.blue}</span>
            <span className="text-white/40">:</span>
            <span className="text-[hsl(354_85%_70%)]">{st.score.red}</span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: f.bestOf }, (_, i) => {
              const r = st.rounds[i];
              return (
                <span
                  key={i}
                  title={r ? `Раунд ${i + 1}: ${r.w === "blue" ? f.blue.name : f.red.name}${r.how === "fouls" ? " (2 фола соперника)" : ""}` : `Раунд ${i + 1}`}
                  className={cn(
                    "flex items-center justify-center rounded-[6px] border font-mono font-semibold",
                    big ? "h-[5vh] w-[5vh] text-[2.4vh]" : "h-8 w-8 text-sm",
                    !r && i + 1 === st.round && !st.winner ? "border-gold text-gold" : "border-white/20 text-white/40",
                    r?.w === "blue" && "border-corner-blue bg-corner-blue text-white",
                    r?.w === "red" && "border-corner-red bg-corner-red text-white",
                  )}
                >
                  {r?.how === "fouls" ? "Ф" : i + 1}
                </span>
              );
            })}
          </div>
          {!st.winner && st.strap && (
            <div className={cn("flex items-center gap-2 rounded-full bg-amber-400 px-4 py-1 font-semibold uppercase text-navy", big ? "text-[2.6vh]" : "text-sm")}>
              <Icon name="Link" size={big ? 24 : 16} /> Ремень
            </div>
          )}
          {timer && left != null && !st.winner && (
            <div className="flex flex-col items-center">
              <span className={cn("uppercase text-white/60", big ? "text-[2vh]" : "text-xs")}>{timer.kind === "foul" ? "Отдых после фола" : "Отдых между раундами"}</span>
              <span className={cn("font-mono font-bold tabular-nums", big ? "text-[9vh]" : "text-5xl", left === 0 ? "animate-pulse text-corner-red" : left <= 10 ? "text-amber-400" : "text-white")}>
                {left === 0 ? "К столу!" : fmtSec(left)}
              </span>
            </div>
          )}
          {st.winner && (
            <div className={cn("rounded-[12px] bg-gold px-5 py-2 text-center font-bold uppercase text-navy", big ? "text-[3.4vh]" : "text-lg")}>
              Победа: {fighterSurname(f[st.winner])}
              {st.forfeit && <div className={cn("font-medium normal-case", big ? "text-[2vh]" : "text-xs")}>{st.forfeit.reason}</div>}
            </div>
          )}
        </div>
        <Corner f={f} side="red" score={st.score.red} fouls={st.fouls.red} win={st.winner ? st.winner === "red" : null} big={big} />
      </div>
    </div>
  );
}

function UpNext({ night, big }: { night: FightNight; big: boolean }) {
  const list = night.fights.filter((f) => !fightState(f).winner).slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="mt-2 flex w-full max-w-3xl flex-col gap-2">
      <div className={cn("text-center uppercase tracking-wide text-gold", big ? "text-[2.4vh]" : "text-sm")}>Кард вечера</div>
      {list.map((f) => (
        <div key={f.id} className={cn("flex items-center gap-3 rounded-[10px] bg-white/10 px-4 py-2", big ? "text-[2.6vh]" : "text-sm")}>
          <FighterFlag region={f.blue.region} className="h-5 w-8" />
          <span className="flex-1 truncate text-right font-semibold">{f.blue.name}</span>
          <span className="text-white/50">vs</span>
          <span className="flex-1 truncate font-semibold">{f.red.name}</span>
          <FighterFlag region={f.red.region} className="h-5 w-8" />
          {f.title && <Icon name="Trophy" size={16} className="text-gold" />}
        </div>
      ))}
    </div>
  );
}
