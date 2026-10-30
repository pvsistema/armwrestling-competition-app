import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { openBoardWindow } from "@/lib/boardSync";
import { savedText, warmFolder } from "@/lib/saveFolder";
import {
  CUP_SYSTEM_LABEL,
  EMPTY_CUP,
  ROUND_NAME,
  bracketOf,
  bracketTable,
  buildPlayoff,
  drawCup,
  finalTable,
  groupName,
  groupsFinished,
  hasPlayoff,
  meetingState,
  teamName,
  useCup,
} from "@/lib/teamCup";
import CupTeams from "./CupTeams";
import CupSettingsForm from "./CupSettingsForm";
import CupMeetingPanel from "./CupMeetingPanel";
import CupBoard from "./CupBoard";

type Tab = "teams" | "settings" | "table";
type Fmt = "pdf" | "docx" | "xlsx";

/** Раздел «Командный кубок»: команды, жеребьёвка встреч, пульт встречи, таблицы и протокол. */
export default function CupSection() {
  const { cup, update, patchMeeting } = useCup();
  const [tab, setTab] = useState<Tab>("teams");
  const [busy, setBusy] = useState<Fmt | null>(null);
  const cur = cup.matches.find((m) => m.id === cup.current) ?? null;
  const ready = cup.teams.filter((t) => t.name.trim()).length;

  const draw = () => {
    if (ready < 2) return toast({ title: "Нужно минимум 2 команды", variant: "destructive" });
    if (cup.brackets.length && !confirm("Провести жеребьёвку заново? Все результаты встреч будут удалены.")) return;
    update((p) => {
      const n = drawCup(p);
      return { ...n, current: n.matches.find((m) => !m.winner)?.id ?? null };
    });
    setTab("table");
  };

  const reset = () => {
    if (!confirm("Сбросить жеребьёвку и все результаты встреч? Команды и составы останутся.")) return;
    update((p) => ({ ...p, brackets: [], matches: [], meetings: {}, current: null, order: 1 }));
  };

  const clearAll = () => {
    if (!confirm("Очистить командный кубок полностью — команды, составы, результаты?")) return;
    update(() => EMPTY_CUP);
  };

  const run = async (fmt: Fmt) => {
    setBusy(fmt);
    try {
      await warmFolder();
      const { buildCupProtocol } = await import("@/lib/cupProtocol");
      const doc = buildCupProtocol(cup);
      const m = await import("@/lib/exportProtocol");
      const r = fmt === "pdf" ? await m.exportPdf(doc, true) : fmt === "docx" ? await m.exportWord(doc, true) : await m.exportExcel(doc);
      toast({ title: "Протокол кубка сохранён", description: r ? savedText(r) : `${doc.fileBase}.${fmt}` });
    } catch (e) {
      toast({ title: "Не удалось сохранить протокол", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const openBoard = async () => {
    try {
      await openBoardWindow("cup");
    } catch (e) {
      toast({ title: "Окно табло не открылось", description: (e as Error).message, variant: "destructive" });
    }
  };

  const groups = cup.settings.system === "groups";
  const canPlayoff = groups && groupsFinished(cup) && !hasPlayoff(cup);
  const sorted = [...cup.matches].sort((x, y) => (x.key === y.key ? 0 : x.key === "po" ? 1 : y.key === "po" ? -1 : 0) || x.round - y.round || x.order - y.order);
  const champion = (() => {
    const done = cup.brackets.length && cup.matches.length && cup.matches.every((m) => m.winner) && cup.brackets.every((b) => b.done) && (!groups || hasPlayoff(cup));
    return done ? finalTable(cup)[0] : null;
  })();

  return (
    <div className="grid flex-1 gap-3 xl:grid-cols-[420px_1fr]">
      <div className="flex flex-col gap-3 rounded-lg bg-frame p-2.5">
        <div className="win flex-1">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>командный кубок</b>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div>
              <div className="text-xl font-medium tracking-tight">{cup.settings.name || "Командный кубок"}</div>
              <div className="text-xs text-panel-muted">{CUP_SYSTEM_LABEL[cup.settings.system]} · команд: {ready}</div>
            </div>
            <div className="flex gap-1.5">
              {(
                [
                  ["teams", "Команды", "Users"],
                  ["settings", "Правила", "Settings2"],
                  ["table", "Встречи", "Table"],
                ] as const
              ).map(([k, l, ic]) => (
                <button key={k} className={cn("pill flex-1 justify-center !px-2 !py-1.5 text-sm", tab === k && "pill-on")} onClick={() => setTab(k)}>
                  <Icon name={ic} size={15} /> {l}
                </button>
              ))}
            </div>

            {tab === "teams" && <CupTeams cup={cup} update={update} />}
            {tab === "settings" && <CupSettingsForm cup={cup} update={update} />}
            {tab === "table" && (
              <div className="flex flex-col gap-3">
                {!cup.brackets.length && <div className="rounded-[12px] border border-dashed border-line px-4 py-6 text-center text-sm text-panel-muted">Добавьте команды и проведите жеребьёвку.</div>}
                {cup.brackets.map((b) => (
                  <div key={b.key} className="flex flex-col gap-1">
                    {(groupName(b.key) || b.system === "roundrobin") && <span className="text-xs font-semibold uppercase text-panel-muted">{groupName(b.key) || "Таблица"}</span>}
                    {b.system === "roundrobin" && (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-panel-muted">
                            <th className="text-left font-normal">#</th>
                            <th className="text-left font-normal">команда</th>
                            <th className="font-normal">о</th>
                            <th className="font-normal">в-н-п</th>
                            <th className="font-normal">пары</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bracketTable(cup, b).map((r) => (
                            <tr key={r.id} className="border-t border-line/60" title={r.note}>
                              <td className="py-1 font-mono">{r.place}</td>
                              <td className="truncate py-1 font-medium">
                                {teamName(cup, r.id)}
                                {r.note && <Icon name="Info" size={11} className="ml-1 inline text-panel-muted" />}
                              </td>
                              <td className="text-center font-mono font-bold">{r.points}</td>
                              <td className="text-center font-mono">
                                {r.w}-{r.d}-{r.l}
                              </td>
                              <td className="text-center font-mono">
                                {r.pf}:{r.pa}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
                {canPlayoff && (
                  <button className="btn-gold" onClick={() => update(buildPlayoff)}>
                    <Icon name="GitFork" size={16} /> Составить плей-офф
                  </button>
                )}
                {champion && (
                  <div className="flex items-center gap-2 rounded-lg bg-gold-soft px-3 py-2 text-sm font-semibold text-tip-foreground">
                    <Icon name="Trophy" size={16} /> Победитель кубка: {teamName(cup, champion.id)}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {sorted.map((m) => {
                    const ms = meetingState(cup, m, bracketOf(cup, m)?.system === "roundrobin");
                    const active = m.id === cup.current;
                    return (
                      <button
                        key={m.id}
                        onClick={() => update((p) => ({ ...p, current: m.id }))}
                        className={cn("flex flex-col rounded-[10px] border px-2.5 py-1.5 text-left", active ? "border-gold bg-gold/10 ring-1 ring-gold" : "border-line bg-panel hover:border-primary/40")}
                      >
                        <span className="text-[11px] text-panel-muted">{ROUND_NAME(m, cup)}</span>
                        <span className="flex items-center gap-2 text-sm">
                          <span className={cn("min-w-0 flex-1 truncate", m.winner === m.a && "font-bold text-corner-blue")}>{teamName(cup, m.a)}</span>
                          <span className={cn("rounded-full px-2 font-mono font-semibold", m.winner ? "bg-navy text-gold" : ms.started ? "bg-gold/30" : "text-panel-muted")}>
                            {ms.started || m.winner ? `${ms.score.a}:${ms.score.b}` : "vs"}
                          </span>
                          <span className={cn("min-w-0 flex-1 truncate text-right", m.winner === m.b && "font-bold text-corner-red")}>{teamName(cup, m.b)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <button className="btn-blue flex-1" onClick={draw}>
                <Icon name="Shuffle" size={17} /> {cup.brackets.length ? "Жеребьёвка заново" : "Жеребьёвка встреч"}
              </button>
              {cup.brackets.length > 0 && (
                <button className="pill" onClick={reset} title="Сбросить сетку">
                  <Icon name="RotateCcw" size={15} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-panel-muted">Протокол:</span>
              {(
                [
                  ["pdf", "PDF", "FileText"],
                  ["docx", "Word", "FileType"],
                  ["xlsx", "Excel", "Sheet"],
                ] as const
              ).map(([k, l, ic]) => (
                <button key={k} className="pill !py-1.5" onClick={() => run(k)} disabled={!!busy || !cup.matches.length}>
                  <Icon name={busy === k ? "Loader2" : ic} size={15} className={busy === k ? "animate-spin" : ""} /> {l}
                </button>
              ))}
              <button className="pill ml-auto !py-1.5 text-corner-red" onClick={clearAll} title="Очистить кубок">
                <Icon name="Eraser" size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="win flex-row flex-wrap items-center gap-2 px-3 py-2">
          <Icon name="Shield" size={18} className="text-primary" />
          <span className="font-medium">Пульт встречи</span>
          <span className="hidden text-xs text-panel-muted md:inline">Пара — обе руки, при 1:1 монетка выбирает руку третьего поединка</span>
          <button className="btn-blue ml-auto !py-2" onClick={openBoard}>
            <Icon name="ExternalLink" size={16} /> Табло в отдельном окне
          </button>
        </div>
        {cur ? <CupMeetingPanel cup={cup} m={cur} patchMeeting={patchMeeting} /> : <div className="win items-center justify-center p-10 text-panel-muted">Выберите встречу во вкладке «Встречи».</div>}
        <div className="flex min-h-[420px] flex-col">
          <CupBoard cup={cup} />
        </div>
      </div>
    </div>
  );
}
