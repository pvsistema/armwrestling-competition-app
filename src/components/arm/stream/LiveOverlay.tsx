import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { GROUP_LABEL, HAND_LABEL, Match, Athlete } from "@/lib/arm";
import { pendingQueue } from "@/lib/queue";
import { Fight, Side, fightState, fighterSurname, useFights } from "@/lib/fights";
import { Overlay } from "@/lib/streams";
import { cn } from "@/lib/utils";
import Logo from "../Logo";
import FarFlag from "../FarFlag";
import { FighterFlag } from "../fights/FighterFace";
import { useCountdown } from "../fights/FightBoard";

type Row = { name: string; sub?: string; flag: React.ReactNode; score?: number; fouls: number; win: boolean | null };
interface Bar {
  head: string;
  title?: boolean;
  blue: Row;
  red: Row;
  dots?: { n: number; done: (Side | null)[] };
  extra?: string;
  timer?: { left: number; label: string } | null;
}

const SZ = {
  s: { w: "w-[min(560px,92%)]", name: "text-[15px]", sub: "text-[10px]", head: "text-[10px]", score: "w-9 text-xl", flag: "h-[14px] w-[21px]", row: "h-8" },
  m: { w: "w-[min(720px,94%)]", name: "text-[clamp(14px,2.2vw,22px)]", sub: "text-[clamp(9px,1vw,12px)]", head: "text-[clamp(9px,1vw,12px)]", score: "w-[clamp(36px,4vw,52px)] text-[clamp(18px,2.6vw,30px)]", flag: "h-[clamp(14px,1.6vw,20px)] w-[clamp(21px,2.4vw,30px)]", row: "h-[clamp(30px,3.6vw,44px)]" },
  l: { w: "w-[min(1000px,96%)]", name: "text-[clamp(18px,3vw,34px)]", sub: "text-[clamp(10px,1.3vw,16px)]", head: "text-[clamp(10px,1.3vw,16px)]", score: "w-[clamp(44px,5.5vw,72px)] text-[clamp(22px,3.6vw,44px)]", flag: "h-[clamp(18px,2.2vw,28px)] w-[clamp(27px,3.3vw,42px)]", row: "h-[clamp(38px,5vw,60px)]" },
};

function fightBar(f: Fight, timerUntil: number | null, timerKind: string | undefined, left: number | null): Bar {
  const st = fightState(f);
  const row = (s: Side): Row => ({
    name: fighterSurname(f[s]).toUpperCase(),
    sub: f[s].note || f[s].region,
    flag: <FighterFlag region={f[s].region} className="h-full w-full" />,
    score: st.score[s],
    fouls: st.winner ? 0 : st.fouls[s],
    win: st.winner ? st.winner === s : null,
  });
  return {
    head: [f.title ? "Титульный бой" : f.main ? "Главный бой" : "Супербой", f.category, f.hand === "right" ? "правая рука" : "левая рука"].join(" · "),
    title: f.title,
    blue: row("blue"),
    red: row("red"),
    dots: { n: f.bestOf, done: Array.from({ length: f.bestOf }, (_, i) => st.rounds[i]?.w ?? null) },
    extra: st.winner ? "Бой окончен" : st.strap ? `Раунд ${st.round} · ремень` : `Раунд ${st.round}`,
    timer: timerUntil && left != null && !st.winner ? { left, label: timerKind === "foul" ? "после фола" : "отдых" } : null,
  };
}

function matchBar(m: Match, amap: Record<string, Athlete>, head: string, decided: boolean): Bar {
  const row = (id: string): Row => {
    const a = amap[id];
    const p = m.pen?.[id];
    return {
      name: (a?.name.split(" ")[0] ?? "—").toUpperCase(),
      sub: [a?.name.split(" ").slice(1).join(" "), a?.club].filter(Boolean).join(" · "),
      flag: <FarFlag farId={a?.farId} club={a?.club} className="h-full w-full border-0" />,
      fouls: p ? Math.min(2, p.f + Math.floor(p.r / 2)) : 0,
      win: decided && m.winner ? m.winner === id : null,
    };
  };
  return { head, blue: row(m.a), red: row(m.b), extra: decided ? "Победитель" : `Стол ${m.table} · тур ${m.round}` };
}

/** Телевизионная плашка поверх видео: имена, углы, флаги, счёт. Данные — из пульта армфайтов или турнира. */
export default function LiveOverlay({ o }: { o: Overlay }) {
  const { night } = useFights();
  const { matches, brackets, amap, tournament } = useStore();
  const classMap = useClassMap();
  const left = useCountdown(night.timer?.until);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (o.mode === "off") return null;

  let bar: Bar | null = null;
  const fight = night.fights.find((f) => f.id === night.current);
  const useFight = o.mode === "fights" || (o.mode === "auto" && fight && (fightState(fight).started || !matches.some((m) => !m.winner)));

  if (useFight && fight) {
    bar = fightBar(fight, night.timer?.fightId === fight.id ? night.timer.until : null, night.timer?.kind, left);
  } else if (o.mode !== "fights") {
    const t = tournament.tables > 1 ? o.table : "all";
    type DM = Match & { decidedAt?: number };
    const last = (matches as DM[])
      .filter((m) => m.winner && m.decidedAt && (t === "all" || m.table === t))
      .sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))[0];
    const fresh = last && now - (last.decidedAt ?? 0) < 10000;
    const m = fresh ? last : pendingQueue(matches, t, tournament)[0];
    if (m) {
      const b = brackets.find((x) => x.key === m.key);
      const c = b ? classMap[b.classKey] : null;
      const head = [c?.groupName, c?.label, b ? `${HAND_LABEL[b.hand]} рука` : "", GROUP_LABEL[m.group]].filter(Boolean).join(" · ");
      bar = matchBar(m, amap, head, !!fresh);
    }
  }
  if (!bar) return null;

  const z = SZ[o.size];
  const line = (r: Row, side: Side) => (
    <div className={cn("flex items-center", z.row, r.win === false && "opacity-55")}>
      <span className={cn("h-full w-[6px] shrink-0", side === "blue" ? "bg-corner-blue" : "bg-corner-red")} />
      <span className={cn("ml-2.5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-white/30", z.flag)}>{r.flag}</span>
      <span className="ml-2.5 flex min-w-0 flex-1 items-baseline gap-2">
        <span className={cn("truncate font-bold tracking-tight text-white", z.name)}>{r.name}</span>
        {r.sub && <span className={cn("hidden truncate text-white/60 sm:inline", z.sub)}>{r.sub}</span>}
      </span>
      {r.fouls > 0 && (
        <span className="mr-2 flex gap-1">
          {Array.from({ length: r.fouls }, (_, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400" title="фол" />
          ))}
        </span>
      )}
      {r.win && <Icon name="Trophy" size={18} className="mr-2 shrink-0 text-gold" />}
      {r.score != null && (
        <span className={cn("flex h-full shrink-0 items-center justify-center font-mono font-bold tabular-nums", z.score, r.win ? "bg-gold text-navy" : "bg-white/10 text-white")}>{r.score}</span>
      )}
    </div>
  );

  return (
    <div className={cn("pointer-events-none absolute left-1/2 z-10 -translate-x-1/2", o.pos === "bottom" ? "bottom-[4%]" : "top-[4%]", z.w)}>
      <div className="overflow-hidden rounded-[6px] shadow-[0_6px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        <div className={cn("flex items-center gap-2 bg-gradient-to-r from-gold to-[hsl(36_60%_42%)] px-2.5 py-1 font-semibold uppercase tracking-wide text-navy", z.head)}>
          {(tournament.showLogo ?? true) && <Logo className="h-[1.6em] w-[1.6em]" />}
          {bar.title && <Icon name="Trophy" size={13} />}
          <span className="min-w-0 flex-1 truncate">{bar.head}</span>
          {bar.extra && <span className="shrink-0 rounded-sm bg-navy/85 px-1.5 text-gold">{bar.extra}</span>}
        </div>
        <div className="divide-y divide-white/10 bg-navy/90">
          {line(bar.blue, "blue")}
          {line(bar.red, "red")}
        </div>
        {(bar.dots || bar.timer) && (
          <div className={cn("flex items-center gap-1.5 bg-black/75 px-2.5 py-1", z.head)}>
            {bar.dots &&
              bar.dots.done.map((w, i) => (
                <span key={i} className={cn("h-2 flex-1 max-w-6 rounded-sm", w === "blue" ? "bg-corner-blue" : w === "red" ? "bg-corner-red" : "bg-white/15")} />
              ))}
            {bar.timer && (
              <span className={cn("ml-auto font-mono font-semibold tabular-nums", bar.timer.left <= 10 ? "text-amber-400" : "text-white")}>
                {bar.timer.label} {Math.floor(bar.timer.left / 60)}:{String(bar.timer.left % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
