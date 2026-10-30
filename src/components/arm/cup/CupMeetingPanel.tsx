import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { HAND_LABEL, Hand, Match } from "@/lib/arm";
import {
  CupMeeting,
  CupSide,
  CupState,
  ROUND_NAME,
  bracketOf,
  fmtW,
  lineupOf,
  meetingState,
  memberOf,
  otherHand,
  slotLabel,
  teamName,
  weightIssue,
} from "@/lib/teamCup";
import { FighterFlag } from "../fights/FighterFace";

interface Props {
  cup: CupState;
  m: Match;
  patchMeeting: (id: string, fn: (m: CupMeeting) => CupMeeting) => void;
}

const SIDE_CLS: Record<CupSide, string> = { a: "text-corner-blue", b: "text-corner-red" };

/** Пульт встречи команд: составы, поединки обеими руками, жребий третьей руки, итог. */
export default function CupMeetingPanel({ cup, m, patchMeeting }: Props) {
  const rr = bracketOf(cup, m)?.system === "roundrobin";
  const ms = meetingState(cup, m, rr);
  const mt = cup.meetings[m.id] ?? { res: {} };
  const { slots, firstHand, heavierOk } = cup.settings;
  const second = otherHand(firstHand);
  const teamId = (s: CupSide) => (s === "a" ? m.a : m.b);
  const team = (s: CupSide) => cup.teams.find((t) => t.id === teamId(s));
  const frozen = !rr && ms.done && cup.matches.some((x) => x.key === m.key && x.round > m.round);
  const la = lineupOf(cup, m, "a");
  const lb = lineupOf(cup, m, "b");

  const setRes = (slot: string, p: Partial<CupMeeting["res"][string]>) =>
    patchMeeting(m.id, (x) => ({ ...x, res: { ...x.res, [slot]: { ...x.res[slot], ...p } } }));

  const setLine = (side: CupSide, slot: string, v: string | null) => {
    if (frozen) return alert("Следующий тур уже составлен по итогу этой встречи — изменить состав нельзя.");
    if (mt.res[slot] && Object.values(mt.res[slot]).some(Boolean) && !confirm("В этой весовой уже есть результат — он будет сброшен. Заменить спортсмена?")) return;
    patchMeeting(m.id, (x) => ({
      ...x,
      lineup: { ...x.lineup, [side]: { ...x.lineup?.[side], [slot]: v } },
      res: Object.fromEntries(Object.entries(x.res).filter(([k]) => k !== slot)),
    }));
  };

  const coin = (slot: string) => {
    const h: Hand = Math.random() < 0.5 ? "left" : "right";
    setRes(slot, { coin: h });
  };

  const winBtn = (slot: string, field: "left" | "right" | "third", side: CupSide, cur: CupSide | null | undefined, disabled: boolean) => (
    <button
      disabled={disabled}
      onClick={() => setRes(slot, { [field]: cur === side ? null : side })}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition disabled:opacity-30",
        cur === side
          ? side === "a"
            ? "border-corner-blue bg-corner-blue text-white"
            : "border-corner-red bg-corner-red text-white"
          : side === "a"
            ? "border-corner-blue/40 text-corner-blue hover:bg-corner-blue/10"
            : "border-corner-red/40 text-corner-red hover:bg-corner-red/10",
      )}
      title={cur === side ? "Отменить" : `Победа: ${teamName(cup, teamId(side))}`}
    >
      {cur === side ? <Icon name="Check" size={14} /> : side === "a" ? "С" : "К"}
    </button>
  );

  const pick = (side: CupSide, slot: string, line: Record<string, string | null>) => {
    const t = team(side);
    const curId = line[slot];
    const cur = curId ? memberOf(cup, teamId(side), curId) : null;
    const s = slots.find((x) => x.id === slot)!;
    const issue = cur ? weightIssue(slots, s, cur.weight, heavierOk) : null;
    const used = new Set(Object.entries(line).filter(([k, v]) => k !== slot && v).map(([, v]) => v));
    return (
      <select
        className={cn("field !h-8 w-full min-w-0 !px-2 !py-0 text-sm", !cur && "text-panel-muted", issue && "!border-corner-red")}
        value={curId ?? ""}
        onChange={(e) => setLine(side, slot, e.target.value || null)}
        title={issue ? `Вес: ${issue}` : cur ? `${cur.name}, ${fmtW(cur.weight)} кг` : "Не выставлен — пара засчитывается сопернику"}
      >
        <option value="">— нет —</option>
        {t?.members
          .filter((x) => x.name.trim())
          .map((x) => (
            <option key={x.id} value={x.id} disabled={used.has(x.id)}>
              {x.name} ({fmtW(x.weight)}){weightIssue(slots, s, x.weight, heavierOk) ? " ⚠" : ""}
            </option>
          ))}
      </select>
    );
  };

  const verdict = (() => {
    if (!ms.done) return null;
    const wn = ms.winner === "a" || ms.winner === "b" ? teamName(cup, teamId(ms.winner)) : "";
    if (ms.how === "pairs") return `Победа «${wn}» — ${Math.max(ms.score.a, ms.score.b)}:${Math.min(ms.score.a, ms.score.b)} по парам.`;
    if (ms.how === "weight")
      return `Пары поровну ${ms.score.a}:${ms.score.b}. Победа «${wn}» — меньше суммарный вес (${fmtW(ms.weight.a)} против ${fmtW(ms.weight.b)} кг).`;
    if (ms.how === "manual") return `Полное равенство. Победа «${wn}» по решению ГСК.`;
    if (ms.how === "draw") return `Ничья ${ms.score.a}:${ms.score.b}, суммарный вес равный — по очку обеим командам.`;
    return null;
  })();

  return (
    <div className="win">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-panel-muted">{ROUND_NAME(m, cup)}</span>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <FighterFlag region={team("a")?.region || team("a")?.name || ""} className="h-6 w-9" />
          <span className={cn("truncate text-lg font-bold", SIDE_CLS.a)}>{teamName(cup, m.a)}</span>
          <span className={cn("rounded-full px-3 py-0.5 font-mono text-2xl font-bold tabular-nums", ms.done ? "bg-navy text-gold" : "bg-gold/25")}>
            {ms.score.a}:{ms.score.b}
          </span>
          <span className={cn("truncate text-lg font-bold", SIDE_CLS.b)}>{teamName(cup, m.b)}</span>
          <FighterFlag region={team("b")?.region || team("b")?.name || ""} className="h-6 w-9" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-line text-left font-mono text-xs text-panel-muted">
              <th className="px-3 py-2 font-normal">вес</th>
              <th className={cn("px-2 py-2 font-normal", SIDE_CLS.a)}>синий угол</th>
              <th className="px-1 py-2 text-center font-normal">{HAND_LABEL[firstHand]}</th>
              <th className="px-1 py-2 text-center font-normal">{HAND_LABEL[second]}</th>
              <th className="px-1 py-2 text-center font-normal">третий (жребий)</th>
              <th className={cn("px-2 py-2 font-normal", SIDE_CLS.b)}>красный угол</th>
              <th className="px-3 py-2 text-center font-normal">пара</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => {
              const p = ms.pairs[s.id];
              const r = mt.res[s.id] ?? {};
              const live = !!p.a && !!p.b;
              const blocked = !live || mt.closed || frozen;
              return (
                <tr key={s.id} className={cn("border-b border-line/70", p.winner && "bg-surface/60")}>
                  <td className="px-3 py-2 font-mono font-semibold">{slotLabel(slots, s)}</td>
                  <td className="px-2 py-2">{pick("a", s.id, la)}</td>
                  <td className="px-1 py-2">
                    <div className="flex justify-center gap-1">
                      {winBtn(s.id, firstHand, "a", r[firstHand], blocked)}
                      {winBtn(s.id, firstHand, "b", r[firstHand], blocked)}
                    </div>
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex justify-center gap-1">
                      {winBtn(s.id, second, "a", r[second], blocked || !r[firstHand])}
                      {winBtn(s.id, second, "b", r[second], blocked || !r[firstHand])}
                    </div>
                  </td>
                  <td className="px-1 py-2">
                    {p.step === "coin" ? (
                      <button className="btn-gold mx-auto !px-3 !py-1.5 text-xs" onClick={() => coin(s.id)}>
                        <Icon name="Coins" size={14} /> Бросить монетку
                      </button>
                    ) : r.coin && (p.step === "third" || r.third) ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="mr-1 text-xs font-medium">{HAND_LABEL[r.coin]}</span>
                        {winBtn(s.id, "third", "a", r.third, !!mt.closed || frozen)}
                        {winBtn(s.id, "third", "b", r.third, !!mt.closed || frozen)}
                        {!r.third && !frozen && (
                          <button className="ml-1 text-panel-muted hover:text-foreground" title="Сбросить жребий" onClick={() => setRes(s.id, { coin: null })}>
                            <Icon name="RotateCcw" size={13} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-xs text-panel-muted">—</div>
                    )}
                  </td>
                  <td className="px-2 py-2">{pick("b", s.id, lb)}</td>
                  <td className="px-3 py-2 text-center">
                    {p.void ? (
                      <span className="text-xs text-panel-muted">не проводится</span>
                    ) : p.winner ? (
                      <span className={cn("text-xs font-semibold", SIDE_CLS[p.winner])}>
                        {p.walkover ? "без борьбы" : `${p.wins[p.winner]}:${p.wins[p.winner === "a" ? "b" : "a"]}`} · {p.winner === "a" ? "синие" : "красные"}
                      </span>
                    ) : (
                      <span className="text-xs text-panel-muted">{p.started ? `${p.wins.a}:${p.wins.b}` : "ждёт"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-xs text-panel-muted">
              <td className="px-3 py-2">сумма веса</td>
              <td className="px-2 py-2 font-mono">{fmtW(ms.weight.a)} кг</td>
              <td colSpan={3} className="px-2 py-2 text-center">поединков выиграно {ms.bouts.a}:{ms.bouts.b}</td>
              <td className="px-2 py-2 font-mono">{fmtW(ms.weight.b)} кг</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-sm">
        {verdict && (
          <div className="flex items-center gap-2 rounded-lg bg-gold-soft px-3 py-2 font-medium text-tip-foreground">
            <Icon name="Trophy" size={16} /> {verdict}
          </div>
        )}
        {ms.needManual && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-corner-red/40 bg-corner-red/5 px-3 py-2">
            <span>Пары поровну и суммарный вес равный. Победителя определяет ГСК (жребий):</span>
            {!frozen && (["a", "b"] as CupSide[]).map((sd) => (
              <button key={sd} className="pill !py-1 text-xs" onClick={() => patchMeeting(m.id, (x) => ({ ...x, manual: sd }))}>
                {teamName(cup, teamId(sd))}
              </button>
            ))}
          </div>
        )}
        {mt.manual && ms.how === "manual" && !frozen && (
          <button className="self-start text-xs underline text-panel-muted" onClick={() => patchMeeting(m.id, (x) => ({ ...x, manual: null }))}>
            Отменить решение ГСК
          </button>
        )}
        {!ms.done && ms.clinched && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-tip px-3 py-2 text-tip-foreground">
            <Icon name="Flag" size={16} /> Встреча решена: «{teamName(cup, teamId(ms.clinched))}» уже не догнать. Оставшиеся пары можно провести или закрыть встречу.
            <button className="pill ml-auto !py-1 text-xs" onClick={() => patchMeeting(m.id, (x) => ({ ...x, closed: true }))}>
              Закрыть встречу
            </button>
          </div>
        )}
        {frozen && <span className="text-xs text-panel-muted">Следующий тур составлен по итогу этой встречи — результаты закреплены.</span>}
        {mt.closed && !frozen && (
          <button className="self-start text-xs underline text-panel-muted" onClick={() => patchMeeting(m.id, (x) => ({ ...x, closed: false }))}>
            Открыть встречу снова — довести оставшиеся пары
          </button>
        )}
        <span className="text-xs text-panel-muted">
          «С» — победа синего угла, «К» — красного. Повторное нажатие отменяет. Составы можно менять до начала поединков в весовой.
        </span>
      </div>
    </div>
  );
}
