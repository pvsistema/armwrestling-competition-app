import { cn } from "@/lib/utils";
import { HAND_LABEL, surname } from "@/lib/arm";
import { CupState, bracketOf, lineupOf, meetingState, memberOf, otherHand, ROUND_NAME, slotLabel, teamName } from "@/lib/teamCup";
import Logo from "../Logo";
import { FighterFlag } from "../fights/FighterFace";

/** Табло встречи команд: счёт по парам, составы по весовым, текущая пара. */
export default function CupBoard({ cup, big = false }: { cup: CupState; big?: boolean }) {
  const m = cup.matches.find((x) => x.id === cup.current) ?? null;
  if (!m)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[14px] bg-navy text-white/70">
        <Logo className="h-24 w-24" />
        <span className={big ? "text-[3vh]" : "text-lg"}>{cup.settings.name}</span>
      </div>
    );
  const ms = meetingState(cup, m, bracketOf(cup, m)?.system === "roundrobin");
  const la = lineupOf(cup, m, "a");
  const lb = lineupOf(cup, m, "b");
  const ta = cup.teams.find((t) => t.id === m.a);
  const tb = cup.teams.find((t) => t.id === m.b);
  const { slots, firstHand } = cup.settings;
  const second = otherHand(firstHand);
  const curSlot = slots.find((s) => !ms.pairs[s.id].void && !ms.pairs[s.id].winner)?.id;
  const nm = (team: string, id: string | null) => {
    const x = memberOf(cup, team, id);
    return x ? surname(x.name) : "—";
  };
  const t = (a: string, b: string) => (big ? a : b);

  return (
    <div className="flex flex-1 flex-col gap-[1.5vh] overflow-hidden rounded-[14px] bg-navy p-[2vh] text-white">
      <div className={cn("text-center uppercase tracking-widest text-gold", t("text-[2.2vh]", "text-xs"))}>
        {cup.settings.name} · {ROUND_NAME(m, cup)}
      </div>
      <div className="flex items-center gap-[2vw]">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-[1vw]">
          <span className={cn("truncate text-right font-bold uppercase text-[hsl(214_90%_72%)]", t("text-[5vh]", "text-2xl"))}>{teamName(cup, m.a)}</span>
          <FighterFlag region={ta?.region || ta?.name || ""} className={t("h-[6vh] w-[9vh]", "h-8 w-12")} />
        </div>
        <div className={cn("rounded-[2vh] bg-white/10 px-[2vw] font-mono font-bold tabular-nums", t("text-[11vh] leading-none", "text-5xl"), ms.done && "text-gold")}>
          {ms.score.a}:{ms.score.b}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-[1vw]">
          <FighterFlag region={tb?.region || tb?.name || ""} className={t("h-[6vh] w-[9vh]", "h-8 w-12")} />
          <span className={cn("truncate font-bold uppercase text-[hsl(354_85%_70%)]", t("text-[5vh]", "text-2xl"))}>{teamName(cup, m.b)}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-[0.8vh]">
        {slots.map((s) => {
          const p = ms.pairs[s.id];
          const r = cup.meetings[m.id]?.res[s.id] ?? {};
          const live = s.id === curSlot && !ms.done;
          const mark = (h?: "a" | "b" | null, side?: "a" | "b") =>
            h ? (h === side ? "bg-gold text-navy" : "bg-white/10 text-white/30") : "border border-white/20 text-white/30";
          const hands = [r[firstHand], r[second], r.third] as const;
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-[1vw] rounded-[1.2vh] px-[1.5vw] py-[0.7vh]",
                live ? "bg-gold/20 ring-2 ring-gold" : "bg-white/5",
                p.void && "opacity-40",
              )}
            >
              <span className={cn("truncate text-right font-semibold", t("text-[3.2vh]", "text-base"), p.winner === "b" && "opacity-45", p.winner === "a" && "text-[hsl(214_90%_80%)]")}>
                {nm(m.a, la[s.id])}
              </span>
              <div className="flex gap-[0.4vw]">
                {hands.map((h, i) => (i === 2 && !r.coin ? null : <span key={i} className={cn("rounded-full", t("h-[2.4vh] w-[2.4vh]", "h-3 w-3"), mark(h, "a"))} />))}
              </div>
              <span className={cn("min-w-[9vw] rounded-full bg-white/10 px-[1vw] text-center font-mono font-bold", t("text-[2.8vh]", "text-sm"))}>{slotLabel(slots, s)}</span>
              <div className="flex gap-[0.4vw]">
                {hands.map((h, i) => (i === 2 && !r.coin ? null : <span key={i} className={cn("rounded-full", t("h-[2.4vh] w-[2.4vh]", "h-3 w-3"), mark(h, "b"))} />))}
              </div>
              <span className={cn("truncate font-semibold", t("text-[3.2vh]", "text-base"), p.winner === "a" && "opacity-45", p.winner === "b" && "text-[hsl(354_85%_80%)]")}>
                {nm(m.b, lb[s.id])}
              </span>
            </div>
          );
        })}
      </div>

      <div className={cn("text-center text-white/60", t("text-[2.2vh]", "text-xs"))}>
        {ms.done
          ? ms.how === "weight"
            ? `Пары поровну — победа по меньшему суммарному весу: ${teamName(cup, ms.winner === "a" ? m.a : m.b)}`
            : ms.winner === "draw"
              ? "Ничья"
              : `Победа: ${teamName(cup, ms.winner === "a" ? m.a : ms.winner === "b" ? m.b : null)}`
          : curSlot
            ? (() => {
                const p = ms.pairs[curSlot];
                const r = cup.meetings[m.id]?.res[curSlot] ?? {};
                const h = p.step === "first" ? firstHand : p.step === "second" ? second : p.step === "third" ? r.coin : null;
                return `Сейчас: ${slotLabel(slots, slots.find((x) => x.id === curSlot)!)} · ${h ? `${HAND_LABEL[h]} рука` : "жребий на третий поединок"}`;
              })()
            : ""}
      </div>
    </div>
  );
}
