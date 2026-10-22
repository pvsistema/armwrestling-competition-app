import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { DEMO_FIGHTS, Fight, HAND_SHORT, fid, fightState, formatLabel, useFights } from "@/lib/fights";
import { openBoardWindow } from "@/lib/boardSync";
import { savedText, warmFolder } from "@/lib/saveFolder";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import FightEditor, { newFight } from "./FightEditor";
import FightPanel from "./FightPanel";
import FightBoard from "./FightBoard";
import { FighterFlag } from "./FighterFace";

type Fmt = "pdf" | "docx" | "xlsx";

/** Раздел «Армфайты»: кард вечера, пульт судьи по раундам, табло, протокол. */
export default function FightsSection() {
  const { night, update } = useFights();
  const [edit, setEdit] = useState<Fight | null>(null);
  const [busy, setBusy] = useState<Fmt | null>(null);
  const [settings, setSettings] = useState(false);
  const cur = night.fights.find((f) => f.id === night.current) ?? null;

  useEffect(() => {
    if (!night.current && night.fights.length) {
      const next = night.fights.find((f) => !fightState(f).winner);
      if (next) update((p) => ({ ...p, current: next.id }));
    }
  }, [night, update]);

  const save = (f: Fight) => {
    update((p) => {
      const exists = p.fights.some((x) => x.id === f.id);
      const fights = exists ? p.fights.map((x) => (x.id === f.id ? f : x)) : [...p.fights, f];
      return { ...p, fights: f.main ? fights.map((x) => (x.id === f.id ? x : { ...x, main: false })) : fights, current: p.current ?? f.id };
    });
    setEdit(null);
  };

  const move = (id: string, d: -1 | 1) =>
    update((p) => {
      const i = p.fights.findIndex((x) => x.id === id);
      const j = i + d;
      if (j < 0 || j >= p.fights.length) return p;
      const a = [...p.fights];
      [a[i], a[j]] = [a[j], a[i]];
      return { ...p, fights: a };
    });

  const remove = (f: Fight) => {
    if (!confirm(`Удалить бой ${f.blue.name} — ${f.red.name}?`)) return;
    update((p) => ({ ...p, fights: p.fights.filter((x) => x.id !== f.id), current: p.current === f.id ? null : p.current }));
  };

  const demo = () => {
    if (night.fights.length && !confirm("Добавить в кард 3 примерных боя?")) return;
    update((p) => ({ ...p, fights: [...p.fights, ...DEMO_FIGHTS.map((d) => ({ ...d, id: fid(), log: [] }))] }));
  };

  const clear = () => {
    if (!confirm("Очистить кард вечера? Все бои и результаты будут удалены. Сначала сохраните протокол, если нужно.")) return;
    update((p) => ({ ...p, fights: [], current: null, timer: null }));
  };

  const run = async (fmt: Fmt) => {
    setBusy(fmt);
    try {
      await warmFolder();
      const { buildFightProtocol } = await import("@/lib/fightProtocol");
      const doc = buildFightProtocol(night);
      if (!night.fights.length) throw new Error("В карде нет боёв");
      const m = await import("@/lib/exportProtocol");
      const r = fmt === "pdf" ? await m.exportPdf(doc, true) : fmt === "docx" ? await m.exportWord(doc, true) : await m.exportExcel(doc);
      toast({ title: "Протокол армфайтов сохранён", description: r ? savedText(r) : `${doc.fileBase}.${fmt}` });
    } catch (e) {
      toast({ title: "Не удалось сохранить протокол", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const openBoard = async () => {
    try {
      await openBoardWindow("fights");
    } catch (e) {
      toast({ title: "Окно табло не открылось", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="grid flex-1 gap-3 xl:grid-cols-[400px_1fr]">
      <FightEditor fight={edit} onSave={save} onClose={() => setEdit(null)} />

      <div className="flex flex-col gap-3 rounded-lg bg-frame p-2.5">
        <div className="win flex-1">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>кард вечера</b>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <input
                  className="w-full bg-transparent text-xl font-medium tracking-tight outline-none"
                  value={night.name}
                  onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Название вечера"
                />
                <div className="text-xs text-panel-muted">{[night.place, night.date && night.date.split("-").reverse().join(".")].filter(Boolean).join(" · ") || "место и дата — в настройках"}</div>
              </div>
              <button className={cn("pill !px-3 !py-2", settings && "pill-on")} onClick={() => setSettings(!settings)} title="Настройки вечера">
                <Icon name="Settings2" size={16} />
              </button>
            </div>

            {settings && (
              <div className="grid grid-cols-2 gap-2 rounded-[12px] border border-line bg-surface p-3 text-sm">
                <label className="col-span-2 flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Место</span>
                  <input className="field !h-9" value={night.place} onChange={(e) => update((p) => ({ ...p, place: e.target.value }))} placeholder="г. Москва, ВТБ Арена" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Дата</span>
                  <input type="date" className="field !h-9" value={night.date} onChange={(e) => update((p) => ({ ...p, date: e.target.value }))} />
                </label>
                <div />
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Отдых между раундами, с</span>
                  <input type="number" min={10} max={600} className="field !h-9" value={night.restRound} onChange={(e) => update((p) => ({ ...p, restRound: Math.max(10, +e.target.value || 60) }))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Отдых после фола, с</span>
                  <input type="number" min={5} max={300} className="field !h-9" value={night.restFoul} onChange={(e) => update((p) => ({ ...p, restFoul: Math.max(5, +e.target.value || 30) }))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Главный судья</span>
                  <input className="field !h-9" value={night.chiefJudge} onChange={(e) => update((p) => ({ ...p, chiefJudge: e.target.value }))} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-panel-muted">Главный секретарь</span>
                  <input className="field !h-9" value={night.secretary} onChange={(e) => update((p) => ({ ...p, secretary: e.target.value }))} />
                </label>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {night.fights.map((f, i) => {
                const st = fightState(f);
                const active = f.id === night.current;
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "group rounded-[12px] border p-2.5 transition",
                      active ? "border-gold bg-gold/10 ring-1 ring-gold" : "border-line bg-panel hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-panel-muted">
                      <span className="font-mono">#{i + 1}</span>
                      {f.title && <span className="rounded-full bg-gold px-1.5 font-semibold text-navy">титул</span>}
                      {f.main && <span className="rounded-full bg-primary px-1.5 font-semibold text-primary-foreground">главный</span>}
                      <span className="truncate">
                        {f.category} · {HAND_SHORT[f.hand].toLowerCase()} · {formatLabel(f.bestOf)}
                      </span>
                      <span className="ml-auto flex opacity-0 transition group-hover:opacity-100">
                        <button className="rounded p-0.5 hover:bg-surface" onClick={() => move(f.id, -1)} title="Выше">
                          <Icon name="ChevronUp" size={14} />
                        </button>
                        <button className="rounded p-0.5 hover:bg-surface" onClick={() => move(f.id, 1)} title="Ниже">
                          <Icon name="ChevronDown" size={14} />
                        </button>
                        <button className="rounded p-0.5 hover:bg-surface" onClick={() => setEdit(f)} title="Изменить">
                          <Icon name="Pencil" size={14} />
                        </button>
                        <button className="rounded p-0.5 text-corner-red hover:bg-surface" onClick={() => remove(f)} title="Удалить">
                          <Icon name="Trash2" size={14} />
                        </button>
                      </span>
                    </div>
                    <button className="mt-1 flex w-full items-center gap-2 text-left" onClick={() => update((p) => ({ ...p, current: f.id }))} title="Вывести на пульт и табло">
                      <FighterFlag region={f.blue.region} className="h-4 w-6" />
                      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", st.winner === "blue" && "font-bold text-corner-blue", st.winner === "red" && "text-panel-muted")}>{f.blue.name}</span>
                      <span className={cn("rounded-full px-2 font-mono text-sm font-semibold", st.winner ? "bg-navy text-gold" : st.started ? "bg-gold/30" : "text-panel-muted")}>
                        {st.started || st.winner ? `${st.score.blue}:${st.score.red}` : "vs"}
                      </span>
                      <span className={cn("min-w-0 flex-1 truncate text-right text-sm font-medium", st.winner === "red" && "font-bold text-corner-red", st.winner === "blue" && "text-panel-muted")}>{f.red.name}</span>
                      <FighterFlag region={f.red.region} className="h-4 w-6" />
                    </button>
                  </div>
                );
              })}
              {!night.fights.length && (
                <div className="rounded-[12px] border border-dashed border-line px-4 py-8 text-center text-sm text-panel-muted">
                  Добавьте бои вечера: пары, рука, категория, число раундов.
                  <button className="mt-2 block w-full text-primary underline-offset-2 hover:underline" onClick={demo}>
                    Заполнить примером (Сагинашвили — Ларратт и др.)
                  </button>
                </div>
              )}
            </div>
            <button className="btn-blue" onClick={() => setEdit(newFight())}>
              <Icon name="Plus" size={17} /> Добавить бой
            </button>
            {night.fights.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <span className="text-xs text-panel-muted">Протокол вечера — счёт и разбивка по раундам:</span>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["pdf", "PDF", "FileText"],
                      ["docx", "Word", "FileType"],
                      ["xlsx", "Excel", "Sheet"],
                    ] as const
                  ).map(([k, l, ic]) => (
                    <button key={k} className="pill !py-1.5" onClick={() => run(k)} disabled={!!busy}>
                      <Icon name={busy === k ? "Loader2" : ic} size={15} className={busy === k ? "animate-spin" : ""} /> {l}
                    </button>
                  ))}
                  <button className="pill ml-auto !py-1.5 text-corner-red" onClick={clear} title="Очистить кард">
                    <Icon name="Eraser" size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="win flex-row flex-wrap items-center gap-2 px-3 py-2">
          <Icon name="Swords" size={18} className="text-primary" />
          <span className="font-medium">Пульт судьи</span>
          <span className="hidden text-xs text-panel-muted md:inline">Клавиши: 1 / 2 — раунд синему / красному, Q / W — фол, S — срыв, Backspace — отменить</span>
          <button className="btn-blue ml-auto !py-2" onClick={openBoard}>
            <Icon name="ExternalLink" size={16} /> Табло в отдельном окне
          </button>
        </div>
        {cur ? <FightPanel f={cur} night={night} /> : <div className="win items-center justify-center p-10 text-panel-muted">Выберите бой в карде слева.</div>}
        <div className="flex min-h-[420px] flex-col">
          <FightBoard night={night} />
        </div>
      </div>
    </div>
  );
}
