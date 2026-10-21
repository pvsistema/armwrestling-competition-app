import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { GROUP_LABEL, HAND_LABEL, HOW_LABEL, Match, OUT_LABEL, OutReason, WinHow, fmtKg, standings, surname } from "@/lib/arm";
import CallBar from "./CallBar";
import HandStageBar from "./HandStageBar";
import { handStage, waitingSecond } from "@/lib/queue";
import { pendingQueue } from "@/lib/queue";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { TimerControls } from "./RestTimer";
import { restPresets, useTimers } from "@/lib/timers";

interface Props {
  table: number | "all";
  onGoBracket: () => void;
}

export default function JudgePanel({ table, onGoBracket }: Props) {
  const { matches, brackets, amap, setWinner, addPen, withdraw, undo, canUndo, tournament, setTournament } = useStore();
  const presets = restPresets(tournament);
  const classMap = useClassMap();
  const queue = useMemo(() => pendingQueue(matches, table, tournament), [matches, table, tournament]);
  const current = queue[0];
  const [flash, setFlash] = useState<string | null>(null);
  const timers = useTimers();

  const decide = (m: Match, winnerId: string, how: WinHow = "pin") => {
    setFlash(winnerId);
    setTimeout(() => setFlash(null), 600);
    setWinner(m.id, winnerId, how);
    const w = amap[winnerId];
    toast({
      title: `Победа: ${w?.name ?? ""}${how !== "pin" ? ` (${HOW_LABEL[how]})` : ""}`,
      description: "Сетка обновлена, к столу следующая пара.",
    });
  };

  const pen = (m: Match, id: string, kind: "r" | "f") => {
    const cur = m.pen?.[id] ?? { r: 0, f: 0 };
    const after = { ...cur, [kind]: cur[kind] + 1 };
    const fouls = after.f + Math.floor(after.r / 2);
    addPen(m.id, id, kind);
    if (fouls >= 2) {
      const w = id === m.a ? m.b : m.a;
      toast({ title: `Второй фол: ${amap[id]?.name ?? ""}`, description: `Победа присуждается: ${amap[w]?.name ?? ""} (п. 11.10).` });
    } else if (kind === "r" && after.r % 2 === 0) {
      toast({ title: "Два замечания = фол", description: amap[id]?.name ?? "" });
    }
  };

  const takeOut = (id: string, reason: OutReason) => {
    const n = amap[id]?.name ?? "";
    if (!confirm(`${n}: ${OUT_LABEL[reason]}. Во всех оставшихся схватках (на обеих руках) будет засчитано поражение. Продолжить?`)) return;
    withdraw(id, reason);
    toast({ title: `${n} — ${OUT_LABEL[reason]}`, description: "Оставшиеся схватки засчитаны соперникам." });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!current) return;
      if (e.key === "1" || e.key === "ArrowLeft") decide(current, current.a);
      if (e.key === "2" || e.key === "ArrowRight") decide(current, current.b);
      if (e.key === "q" || e.key === "Q" || e.key === "й" || e.key === "Й") pen(current, current.a, "f");
      if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") pen(current, current.b, "f");
      if (e.key === "t" || e.key === "T" || e.key === "е" || e.key === "Е") timers.start(current.table, "rest30", presets[0].seconds);
      if (e.key === "y" || e.key === "Y" || e.key === "н" || e.key === "Н") timers.start(current.table, "rest120", presets[1].seconds);
      if (e.key === "u" || e.key === "U" || e.key === "г" || e.key === "Г") {
        e.preventDefault();
        window.dispatchEvent(new Event(`custom-rest-${current.table}`));
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) {
    const hs = handStage(matches, tournament);
    const wait = waitingSecond(matches, table, tournament);
    if (wait > 0)
      return (
        <section className="flex flex-1 flex-col items-center justify-center rounded-lg bg-frame p-2.5">
          <div className="win w-full flex-1 items-center justify-center gap-4 p-10 text-center">
            <Icon name="Hourglass" size={44} className="text-primary" />
            <h1 className="text-[28px] font-medium leading-tight md:text-[40px]">
              {table === "all" ? "" : `Стол ${table}: `}
              {hs.first === "left" ? "левая" : "правая"} рука закончена
            </h1>
            <p className="max-w-lg text-panel-muted">
              Ждём окончания {hs.first === "left" ? "левой" : "правой"} руки на других столах — осталось {hs.firstLeft}{" "}
              {plural(hs.firstLeft, "схватка", "схватки", "схваток")}. Затем на этом столе начнётся{" "}
              {hs.second === "left" ? "левая" : "правая"} рука ({wait} {plural(wait, "схватка", "схватки", "схваток")} в первом туре).
            </p>
            <button className="pill" onClick={() => setTournament({ secondHandOpen: true })}>
              <Icon name="FastForward" size={16} /> Начать {hs.second === "left" ? "левую" : "правую"} руку сейчас
            </button>
          </div>
        </section>
      );
    return (
      <section className="flex flex-1 flex-col items-center justify-center rounded-lg bg-frame p-2.5">
        <div className="win w-full flex-1 items-center justify-center gap-4 p-10 text-center">
          <Icon name="Trophy" size={44} className="text-primary" />
          <h1 className="text-[32px] font-medium leading-tight md:text-[44px]">
            {brackets.length ? "Все схватки проведены" : "Сетки ещё не построены"}
          </h1>
          <p className="max-w-md text-panel-muted">
            {brackets.length
              ? "Итоговые места готовы в разделе «Протоколы»."
              : "Зарегистрируйте и взвесьте участников, затем запустите жеребьёвку."}
          </p>
          <div className="flex gap-2">
            <button className="btn-blue" onClick={onGoBracket}>
              <Icon name="GitFork" size={18} /> К сетке
            </button>
            {canUndo && (
              <button className="pill" onClick={undo}>
                <Icon name="Undo2" size={16} /> Отменить последнюю
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const b = brackets.find((x) => x.key === current.key);
  const cls = b ? classMap[b.classKey] : undefined;
  const st = b ? standings(b, matches) : {};
  const stage = GROUP_LABEL[current.group];
  const remaining = queue.length;

  const Side = ({ id, corner }: { id: string; corner: "blue" | "red" }) => {
    const a = amap[id];
    const losses = st[id]?.losses ?? 0;
    const p = current.pen?.[id] ?? { r: 0, f: 0 };
    const fouls = p.f + Math.floor(p.r / 2);
    const remarks = p.r % 2;
    return (
      <div className={cn("win border-t-4", corner === "blue" ? "border-t-corner-blue" : "border-t-corner-red", flash === id && "animate-win-flash")}>
        <div className="win-bar">
          <i />
          <i />
          <i />
          <b className={corner === "blue" ? "!text-corner-blue" : "!text-corner-red"}>
            {corner === "blue" ? "синий угол" : "красный угол"}
          </b>
        </div>
        <div className="flex flex-1 flex-col px-6 py-[22px]">
          <span className="cat">
            {cls?.label} · {stage} · тур {current.round} · {losses}{" "}
            {losses === 1 ? "поражение" : "поражений"}
          </span>
          <h1 className="mt-[18px] text-[32px] font-medium leading-[1.08] tracking-[-0.02em] md:text-[44px]">
            {a?.name ?? "—"}
          </h1>
          <p className="mt-2.5 text-panel-muted">
            {fmtKg(a?.weight)} кг · {a?.city || a?.club || "—"}
            {a?.club && a?.city ? ` · ${a.club}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button className="pill !py-1.5 text-sm" onClick={() => pen(current, id, "r")} title="Замечание (п. 11.14). Два замечания = фол">
              <Icon name="TriangleAlert" size={14} /> Замечание
            </button>
            <button
              className="pill !border-corner-red/50 !py-1.5 text-sm text-corner-red"
              onClick={() => pen(current, id, "f")}
              title={`Предупреждение (п. 11.15). Второй фол — поражение. Клавиша ${corner === "blue" ? "Q" : "P"}`}
            >
              <Icon name="Flag" size={14} /> Фол
            </button>
            <span className="ml-1 flex items-center gap-1" title="Фолы">
              {[0, 1].map((i) => (
                <span key={i} className={cn("h-4 w-4 rounded-full border-2", i < fouls ? "border-corner-red bg-corner-red" : "border-line")} />
              ))}
              {remarks > 0 && <span className="ml-1 font-mono text-xs text-panel-muted">+1 зам.</span>}
            </span>
            {(p.r > 0 || p.f > 0) && (
              <button
                className="text-xs text-panel-muted underline"
                onClick={() => addPen(current.id, id, p.r > 0 && p.r % 2 === 1 ? "r" : p.f > 0 ? "f" : "r", -1)}
              >
                убрать
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-auto rounded-full p-1.5 text-panel-muted hover:bg-surface hover:text-foreground" title="Снять с соревнований">
                  <Icon name="UserX" size={17} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => takeOut(id, "injury")}>Травма — снять (п. 11.10)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => takeOut(id, "withdrawn")}>Снят с соревнований</DropdownMenuItem>
                <DropdownMenuItem onClick={() => takeOut(id, "disq")}>Дисквалификация (п. 11.17–11.18)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button
            onClick={() => decide(current, id)}
            className={cn(
              "mt-auto rounded-full p-4 text-center text-[1.1em] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]",
              corner === "blue" ? "bg-corner-blue" : "bg-corner-red",
            )}
            style={{ marginTop: "auto" }}
          >
            Победил
            <span className="ml-2 font-mono text-xs opacity-70">[{corner === "blue" ? "1" : "2"}]</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <HandStageBar table={table} />
      <CallBar
        match={current}
        onNoShow={(absent) => {
          const w = absent === current.a ? current.b : current.a;
          decide(current, w, "noshow");
        }}
      />
      <section className="relative grid min-h-[380px] flex-1 grid-cols-1 gap-2.5 rounded-lg bg-frame p-2.5 md:grid-cols-2">
        <Side id={current.a} corner="blue" />
        <Side id={current.b} corner="red" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-sm bg-tip px-2.5 py-1.5 text-[0.85em] font-semibold text-tip-foreground md:block">
          Стол {current.table} · {b ? HAND_LABEL[b.hand] : ""} рука
        </div>
        {canUndo && (
          <button
            onClick={undo}
            className="absolute bottom-[-6px] left-1/2 z-10 hidden -translate-x-1/2 translate-y-full items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-xs text-panel-muted hover:text-foreground md:flex"
          >
            <Icon name="Undo2" size={13} /> отменить последнюю схватку
          </button>
        )}
      </section>
      <TimerControls table={current.table} />
      <QueueStrip queue={queue} remaining={remaining} />
    </>
  );
}

function QueueStrip({ queue, remaining }: { queue: Match[]; remaining: number }) {
  const { amap, brackets } = useStore();
  const classMap = useClassMap();
  const next = queue.slice(1, 4);
  return (
    <section className="grid shrink-0 grid-cols-1 border-t border-foreground/25 sm:grid-cols-2 lg:h-[210px] lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
      <div className="border-foreground/20 px-3.5 pb-4 pt-4 lg:border-r">
        <h3 className="text-[1.25em] font-medium">Следующие пары</h3>
        <p className="mt-2 leading-[1.55] text-foreground/75">
          Жеребьёвка готова, судья видит очередь на столе.
        </p>
        <span className="cat mt-2.5 block !text-foreground/70">
          осталось {remaining} {plural(remaining, "схватка", "схватки", "схваток")} в туре и далее
        </span>
      </div>
      {next.map((m, i) => {
        const b = brackets.find((x) => x.key === m.key);
        return (
          <div
            key={m.id}
            className="animate-fade-in border-foreground/20 px-3.5 pb-4 pt-4 lg:border-r lg:last:border-r-0"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="cat block !text-foreground/60">#{i + 2} · стол {m.table}</span>
            <h3 className="mt-1 text-[1.25em] font-medium">
              {surname(amap[m.a]?.name ?? "—")} — {surname(amap[m.b]?.name ?? "—")}
            </h3>
            <span className="cat mt-2.5 block !text-foreground/70">
              {b ? classMap[b.classKey]?.label : ""} · {b ? HAND_LABEL[b.hand] : ""} · {GROUP_LABEL[m.group]}
            </span>
          </div>
        );
      })}
      {next.length === 0 && (
        <div className="px-3.5 pt-4 text-foreground/70 lg:col-span-3">Это последняя схватка в очереди.</div>
      )}
    </section>
  );
}

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}