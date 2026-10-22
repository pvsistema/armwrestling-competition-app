import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { HAND_LABEL, surname } from "@/lib/arm";
import { buildSchedule, fmtTime, schedBreak, schedMatch, schedStart } from "@/lib/schedule";
import { cn } from "@/lib/utils";

type View = "tables" | "athletes";

export default function ScheduleSection({ onGoBracket }: { onGoBracket: () => void }) {
  const { brackets, tournament, amap, setTournament } = useStore();
  const classMap = useClassMap();
  const [view, setView] = useState<View>("tables");
  const [q, setQ] = useState("");

  const sched = useMemo(() => buildSchedule(brackets, tournament, Object.keys(classMap)), [brackets, tournament, classMap]);
  const catName = (ck: string) => `${classMap[ck]?.groupName ?? ""} · ${classMap[ck]?.label ?? ""}`;

  const people = useMemo(() => {
    const rows: { id: string; name: string; club: string; cat: string; hand: string; table: number; start: number; end: number }[] = [];
    for (const ph of sched.phases)
      for (const it of ph.items)
        for (const id of it.athletes) {
          const a = amap[id];
          if (!a) continue;
          rows.push({ id, name: a.name, club: a.club || a.city, cat: catName(it.classKey), hand: HAND_LABEL[it.hand], table: it.table, start: it.start, end: it.end });
        }
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !s || r.name.toLowerCase().includes(s) || r.club.toLowerCase().includes(s))
      .sort((x, y) => x.name.localeCompare(y.name, "ru") || x.start - y.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sched, amap, q, classMap]);

  const dateStr = tournament.date ? new Date(tournament.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";

  if (!brackets.length)
    return (
      <div className="win flex-1 items-center justify-center gap-3 p-10 text-center">
        <Icon name="CalendarClock" size={40} className="text-gold" />
        <div className="text-lg font-medium">Расписание появится после жеребьёвки</div>
        <div className="max-w-md text-sm text-panel-muted">Программа распределит категории по столам и рассчитает примерное время выступления каждого спортсмена.</div>
        <button className="btn-blue mt-2" onClick={onGoBracket}>
          <Icon name="Shuffle" size={18} /> Перейти к жеребьёвке
        </button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h2 className="mr-auto text-[28px] font-medium tracking-tight md:text-[34px]">Расписание выступлений</h2>
        <button className={cn("pill", view === "tables" && "pill-on")} onClick={() => setView("tables")}>
          <Icon name="LayoutGrid" size={15} /> По столам
        </button>
        <button className={cn("pill", view === "athletes" && "pill-on")} onClick={() => setView("athletes")}>
          <Icon name="Users" size={15} /> По спортсменам
        </button>
        <button className="btn-blue" onClick={() => window.print()}>
          <Icon name="Printer" size={17} /> Печать
        </button>
      </div>

      <div className="win flex-row flex-wrap items-end gap-4 px-4 py-3 print:hidden">
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Начало
          <input type="time" className="field w-28" value={schedStart(tournament)} onChange={(e) => setTournament({ scheduleStart: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Минут на схватку
          <input
            type="number"
            min={0.5}
            step={0.5}
            className="field w-28"
            value={schedMatch(tournament)}
            onChange={(e) => setTournament({ matchMin: Math.max(0.5, parseFloat(e.target.value) || 1.5) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Перерыв между руками, мин
          <input
            type="number"
            min={0}
            className="field w-28"
            value={schedBreak(tournament)}
            onChange={(e) => setTournament({ handBreakMin: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </label>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm">
          <Icon name="Flag" size={15} className="text-gold" /> Окончание ≈ <b>{fmtTime(sched.finish)}</b>
        </div>
        <p className="basis-full text-xs text-panel-muted">
          Время ориентировочное: на столе категории идут вперемешку по турам, поэтому вся категория начинает вместе с блоком. Спортсменам — подойти к столу к началу блока и
          не уходить до конца своей категории.
        </p>
      </div>

      <div className="hidden text-center print:block">
        <div className="text-lg font-bold">{tournament.name}</div>
        <div className="text-sm">
          {[dateStr, tournament.place].filter(Boolean).join(", ")} · Расписание выступлений (время ориентировочное)
        </div>
      </div>

      {view === "tables" &&
        sched.phases.map((ph) => (
          <div key={ph.id} className="flex flex-col gap-2 print:break-inside-avoid">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Icon name="Hand" size={18} className="text-gold print:hidden" /> {ph.title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
              {Array.from({ length: sched.tables }, (_, i) => i + 1)
                .map((tb) => ({ tb, items: ph.items.filter((x) => x.table === tb) }))
                .filter((x) => x.items.length)
                .map(({ tb, items }) => (
                  <div key={tb} className="win print:break-inside-avoid print:border-black/40 print:shadow-none">
                    <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground print:bg-transparent print:text-black">
                      <span className="font-semibold">Стол {tb}</span>
                      <span className="font-mono text-sm">
                        {fmtTime(items[0].start)} – {fmtTime(Math.max(...items.map((x) => x.end)))}
                      </span>
                    </div>
                    {items.map((it) => (
                      <div key={it.key} className="border-b border-line px-4 py-2.5 last:border-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">{catName(it.classKey)}</span>
                          <span className="text-xs text-panel-muted">{HAND_LABEL[it.hand]}</span>
                          <span className="ml-auto whitespace-nowrap font-mono text-xs text-panel-muted">
                            {fmtTime(it.start)}–{fmtTime(it.end)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-foreground/75">
                          {it.athletes.map((id) => surname(amap[id]?.name ?? "?")).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        ))}

      {view === "athletes" && (
        <div className="flex flex-col gap-2">
          <input className="field max-w-sm print:hidden" placeholder="Поиск по фамилии или команде" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="win overflow-x-auto print:border-0 print:shadow-none">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface text-left text-xs text-panel-muted print:text-black">
                  <th className="px-3 py-2">Спортсмен</th>
                  <th className="px-3 py-2">Команда</th>
                  <th className="px-3 py-2">Категория</th>
                  <th className="px-3 py-2">Рука</th>
                  <th className="px-3 py-2 text-center">Стол</th>
                  <th className="px-3 py-2">Время</th>
                </tr>
              </thead>
              <tbody>
                {people.map((r, i) => (
                  <tr key={r.id + i} className="border-t border-line print:border-black/20">
                    <td className="px-3 py-1.5 font-medium">{r.name}</td>
                    <td className="px-3 py-1.5 text-foreground/75">{r.club}</td>
                    <td className="px-3 py-1.5">{r.cat}</td>
                    <td className="px-3 py-1.5">{r.hand}</td>
                    <td className="px-3 py-1.5 text-center font-semibold">{r.table}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono">
                      {fmtTime(r.start)}–{fmtTime(r.end)}
                    </td>
                  </tr>
                ))}
                {!people.length && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-panel-muted">
                      Никого не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
