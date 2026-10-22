import { Fragment, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { Hand, handsInOrder, GROUP_LABEL, HAND_LABEL, HOW_LABEL, fmtBirth, fmtKg2, places, pointsFor, tMode, tPoints } from "@/lib/arm";
import ReweighInput from "./ReweighInput";
import DeciderButton from "./DeciderButton";
import BiathlonProtocol from "./BiathlonProtocol";
import TeamProtocol from "./TeamProtocol";
import JudgesList from "./JudgesList";
import Logo from "./Logo";
import ExportButtons from "./ExportButtons";
import { cn } from "@/lib/utils";

export default function ResultsSection() {
  const { brackets, matches, amap, tournament, athletes } = useStore();
  const classMap = useClassMap();
  const pts = tPoints(tournament);
  const scoring = tMode(tournament);
  const [mode, setMode] = useState<"places" | "matches" | "biathlon" | "team" | "judges">(scoring === "biathlon" ? "biathlon" : "places");
  const [hand, setHand] = useState<Hand | "both">(scoring === "biathlon" ? (tournament.firstHand ?? "left") : "both");
  const order = handsInOrder(tournament);
  const [onlyDone, setOnlyDone] = useState(false);
  const [withJudges, setWithJudges] = useState(true);

  const list = useMemo(
    () =>
      brackets
        .filter((b) => !onlyDone || b.done)
        .filter((b) => hand === "both" || b.hand === hand)
        .slice()
        .sort(
          (a, b) =>
            order.indexOf(a.hand) - order.indexOf(b.hand) ||
            Object.keys(classMap).indexOf(a.classKey) - Object.keys(classMap).indexOf(b.classKey),
        ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brackets, onlyDone, hand, tournament.firstHand, classMap],
  );

  const dateEndStr = tournament.dateEnd
    ? new Date(tournament.dateEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const teamsCount = new Set(athletes.map((a) => a.club.trim().toLowerCase()).filter(Boolean)).size;
  const dateStr = tournament.date
    ? new Date(tournament.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h2 className="mr-auto text-[28px] font-medium tracking-tight md:text-[34px]">Итоговые протоколы</h2>
        <button className={cn("pill", mode === "places" && "pill-on")} onClick={() => setMode("places")}>
          Места
        </button>
        <button className={cn("pill", mode === "matches" && "pill-on")} onClick={() => setMode("matches")}>
          Ход схваток
        </button>
        {scoring === "biathlon" && (
          <button className={cn("pill", mode === "biathlon" && "pill-on")} onClick={() => setMode("biathlon")}>
            Двоеборье
          </button>
        )}
        <button className={cn("pill", mode === "judges" && "pill-on")} onClick={() => setMode("judges")}>
          Судейская коллегия
        </button>
        <button className={cn("pill", mode === "team" && "pill-on")} onClick={() => setMode("team")}>
          Командный зачёт
        </button>
        <button className={cn("pill", onlyDone && "pill-on")} onClick={() => setOnlyDone((v) => !v)}>
          Только завершённые
        </button>
        {mode !== "judges" && (
          <button
            className={cn("pill", withJudges && "pill-on")}
            onClick={() => setWithJudges((v) => !v)}
            title="Печатать список судейской коллегии последней страницей"
          >
            <Icon name={withJudges ? "SquareCheck" : "Square"} size={15} /> + судьи в конце
          </button>
        )}
        <button className="btn-blue" onClick={() => window.print()}>
          <Icon name="Printer" size={17} /> Печать
        </button>
      </div>

      {(mode === "places" || mode === "matches" || mode === "biathlon") && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-sm text-panel-muted">Протокол:</span>
          {order.map((h) => {
            const own = brackets.filter((b) => b.hand === h);
            const done = own.length > 0 && own.every((b) => b.done);
            return (
              <button
                key={h}
                className={cn("pill", mode !== "biathlon" && hand === h && "pill-on")}
                onClick={() => {
                  setHand(h);
                  if (mode === "biathlon") setMode("places");
                }}
                title={done ? "Все категории на этой руке завершены" : "Идёт или ещё не начата"}
              >
                <Icon name={done ? "CircleCheck" : "Hand"} size={15} /> {h === "left" ? "Левая рука" : "Правая рука"}
              </button>
            );
          })}
          {scoring !== "biathlon" && (
            <button className={cn("pill", hand === "both" && "pill-on")} onClick={() => setHand("both")}>
              Обе руки
            </button>
          )}
          {scoring === "biathlon" && (
            <button className={cn("pill", mode === "biathlon" && "pill-on")} onClick={() => setMode("biathlon")} title="Итог по сумме обеих рук">
              <Icon name="Sigma" size={15} /> Общий (двоеборье)
            </button>
          )}
        </div>
      )}

      <div className="win flex-row flex-wrap items-center gap-3 px-4 py-3 print:hidden">
        <ExportButtons onlyDone={onlyDone} />
        <span className="text-xs text-panel-muted">
          Отдельно левая рука, правая рука, общий итог двоеборья — или всё одним файлом. Альбомный A4, как в образце ФАР.
        </span>
      </div>

      <div className="hidden text-center print:block">
        {(tournament.showLogo ?? true) && <Logo hq className="float-left mr-3 h-[22mm] w-[22mm]" />}
        {(tournament.showLogo ?? true) && <div className="float-right h-[22mm] w-[22mm]" />}
        <div className="text-xl font-bold">{tournament.name || "Соревнования по армрестлингу"}</div>
        {tournament.ekp && <div className="text-sm">{tournament.ekp}</div>}
        <div className="text-sm">
          {[tournament.place, dateStr].filter(Boolean).join(", ")}
          {dateEndStr ? ` — ${dateEndStr}` : ""}
        </div>
        <div className="clear-both" />
        <div className="mt-2 grid grid-cols-2 gap-x-6 text-left text-[11px]">
          <div>Главный судья{tournament.chiefJudgeCat ? `, ${tournament.chiefJudgeCat}` : ""} ________ {tournament.chiefJudge}</div>
          <div>Главный секретарь{tournament.secretaryCat ? `, ${tournament.secretaryCat}` : ""} ________ {tournament.secretary}</div>
          {tournament.deputyJudge && <div>Зам. глав. судьи ________ {tournament.deputyJudge}</div>}
          {tournament.deputySecretary && <div>Зам. глав. секретаря ________ {tournament.deputySecretary}</div>}
        </div>
        <div className="mt-2 text-left text-[11px]">
          Количество участников: {athletes.length}; из них мужчин/юношей {athletes.filter((a) => a.gender === "M").length}, женщин/девушек {athletes.filter((a) => a.gender === "F").length}. Количество команд: {teamsCount}.
        </div>
        {tournament.requirements && <div className="mt-1 text-left text-[10px] leading-snug">{tournament.requirements}</div>}
        <div className="mt-2 text-base font-semibold">
          {mode === "places"
            ? `Протокол итоговых мест${hand === "both" ? "" : ` — борьба ${hand === "left" ? "левой" : "правой"} рукой`}`
            : mode === "matches"
              ? `Протокол хода соревнований${hand === "both" ? "" : ` — борьба ${hand === "left" ? "левой" : "правой"} рукой`}`
              : mode === "biathlon"
                ? "Протокол двоеборья"
                : mode === "judges"
                  ? "Список судейской коллегии"
                  : "Командный протокол"}
        </div>
      </div>

      {mode === "biathlon" && <BiathlonProtocol onlyDone={onlyDone} />}
      {mode === "team" && <TeamProtocol onlyDone={onlyDone} />}
      {mode === "judges" && <JudgesList />}
      {mode !== "judges" && withJudges && (tournament.judges?.length ?? 0) > 0 && (
        <div className="hidden print:block print:break-before-page">
          <div className="mb-2 text-center text-base font-semibold">Список судейской коллегии</div>
          <JudgesList printOnly />
        </div>
      )}

      {(mode === "places" || mode === "matches") && !list.length && (
        <div className="win flex-1 items-center justify-center p-10 text-panel-muted">Пока нет проведённых жеребьёвок</div>
      )}

      {(mode === "places" || mode === "matches") && (
      <div className="grid gap-4 xl:grid-cols-2 print:block">
        {list.map((b) => {
          const cls = classMap[b.classKey];
          const rows = places(b, matches, amap);
          const own = matches.filter((m) => m.key === b.key).sort((x, y) => x.round - y.round || x.order - y.order);
          return (
            <div key={b.key} className="win print:mb-6 print:break-inside-avoid print:rounded-none print:bg-white print:text-black">
              <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 print:border-black print:bg-white">
                <div className="flex-1">
                  <div className="text-lg font-medium">
                    {cls?.groupName} · {cls?.label} · {HAND_LABEL[b.hand]} рука
                  </div>
                  <div className="font-mono text-xs text-panel-muted print:text-black">
                    {b.athletes.length} участников · стол {b.table}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 font-mono text-[11px] print:hidden",
                    b.done ? "bg-tip text-tip-foreground" : "bg-line text-panel-muted",
                  )}
                >
                  {b.done ? "итог" : "идёт · предварительно"}
                </span>
              </div>
              {mode === "places" ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left font-mono text-xs text-panel-muted print:border-black print:text-black">
                      <th className="w-14 px-4 py-2 font-normal">место</th>
                      <th className="px-2 py-2 font-normal">участник</th>
                      <th className="px-2 py-2 font-normal">д.р. · звание</th>
                      <th className="px-2 py-2 font-normal">команда · округ</th>
                      <th className="px-2 py-2 font-normal">вес</th>
                      <th className="px-2 py-2 text-right font-normal">п–п</th>
                      <th className="px-4 py-2 text-right font-normal">очки</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const a = amap[r.id];
                      return (
                        <Fragment key={r.id}>
                        <tr className="border-b border-line/60 last:border-0 print:border-black/40">
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-sm font-semibold print:bg-transparent print:text-black",
                                b.done && r.place === 1 && "bg-tip text-tip-foreground",
                                b.done && r.place === 2 && "bg-line text-foreground",
                                b.done && r.place === 3 && "bg-corner-red/15 text-corner-red",
                              )}
                            >
                              {r.place}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-medium">
                            {a?.name}
                            {a?.farId && (tournament.showFar ?? true) && <div className="font-mono text-[11px] font-normal text-panel-muted">ФАР № {a.farId}</div>}
                          </td>
                          <td className="px-2 py-2 text-xs text-panel-muted print:text-black">
                            {a ? fmtBirth(a) : ""}
                            {a?.rank ? ` · ${a.rank}` : ""}
                          </td>
                          <td className="px-2 py-2 text-panel-muted print:text-black">
                            {a?.club || a?.city || "—"}
                            {a?.district ? ` · ${a.district}` : ""}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 font-mono text-panel-muted print:text-black">
                            {fmtKg2(a?.weight)}
                            {a?.reweigh != null && <span className="ml-1 text-xs">({fmtKg2(a.reweigh)})</span>}
                            {r.needReweigh && <ReweighInput id={r.id} />}
                          </td>
                          <td className="px-2 py-2 text-right font-mono">
                            {r.wins}–{r.losses}
                          </td>
                          <td className="px-4 py-2 text-right font-mono">{b.done ? pointsFor(r.place, pts) : "—"}</td>
                        </tr>
                        {r.note && (
                          <tr className="border-b border-line/60 print:border-black/40">
                            <td />
                            <td colSpan={6} className={cn("px-2 pb-2 text-xs", r.needReweigh ? "text-destructive print:text-black" : "text-panel-muted print:text-black")}>
                              {r.rule && (
                                <span className="mr-1.5 inline-flex items-center rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground print:border-black print:bg-white print:text-black">
                                  {/^\d/.test(r.rule) ? `п. ${r.rule}` : r.rule}
                                </span>
                              )}
                              {r.note}
                              {r.decider && <DeciderButton classKey={b.classKey} x={r.decider} y={r.id} />}
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left font-mono text-xs text-panel-muted print:border-black print:text-black">
                      <th className="px-4 py-2 font-normal">тур</th>
                      <th className="px-2 py-2 font-normal">сетка</th>
                      <th className="px-2 py-2 font-normal">синий угол</th>
                      <th className="px-2 py-2 font-normal">красный угол</th>
                      <th className="px-4 py-2 font-normal">победитель</th>
                    </tr>
                  </thead>
                  <tbody>
                    {own.map((m) => (
                      <tr key={m.id} className="border-b border-line/60 last:border-0 print:border-black/40">
                        <td className="px-4 py-1.5 font-mono">{m.round}</td>
                        <td className="px-2 py-1.5 text-panel-muted print:text-black">{GROUP_LABEL[m.group]}</td>
                        <td className={cn("px-2 py-1.5", m.winner === m.a && "font-semibold")}>{amap[m.a]?.name}</td>
                        <td className={cn("px-2 py-1.5", m.winner === m.b && "font-semibold")}>{amap[m.b]?.name}</td>
                        <td className="px-4 py-1.5">
                          {m.winner ? amap[m.winner]?.name : "—"}
                          {m.how && m.how !== "pin" && <span className="ml-1 text-xs text-panel-muted print:text-black">({HOW_LABEL[m.how]})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
      )}


      <p className="text-xs text-foreground/70 print:hidden">
        Порядок мест: кто выбыл позже — выше; выбывшие в одном туре — по меньшему весу; при равном весе — перевзвешивание (п. 2.4 Правил), затем выше тот, кто дольше шёл без поражений. Очки за места: {pts.join(", ")} (меняются в «Категориях»).
      </p>
    </div>
  );
}
