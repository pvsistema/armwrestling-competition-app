import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { CupState, CupTeam, fmtW, newMember, newTeam, slotLabel, weightIssue } from "@/lib/teamCup";
import { DEMO_ATHLETES, askUpgrade, useLicense } from "@/lib/license";
import { FighterFlag } from "../fights/FighterFace";

interface Props {
  cup: CupState;
  update: (fn: (p: CupState) => CupState) => void;
}

/** Команды: участники с весом и основной состав по весовым. */
export default function CupTeams({ cup, update }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const { demo } = useLicense();
  const locked = cup.brackets.length > 0;
  const total = cup.teams.reduce((n, t) => n + t.members.length, 0);

  const patch = (id: string, fn: (t: CupTeam) => CupTeam) => update((p) => ({ ...p, teams: p.teams.map((t) => (t.id === id ? fn(t) : t)) }));

  const add = () => {
    const t = newTeam();
    update((p) => ({ ...p, teams: [...p.teams, t] }));
    setOpen(t.id);
  };

  const remove = (t: CupTeam) => {
    if (locked) return alert("Жеребьёвка проведена — сначала сбросьте её, чтобы удалить команду.");
    if (!confirm(`Удалить команду «${t.name || "без названия"}»?`)) return;
    update((p) => ({ ...p, teams: p.teams.filter((x) => x.id !== t.id) }));
  };

  const addMember = (t: CupTeam) => {
    if (demo && total >= DEMO_ATHLETES) return askUpgrade(`В демоверсии можно зарегистрировать не больше ${DEMO_ATHLETES} спортсменов.`);
    patch(t.id, (x) => ({ ...x, members: [...x.members, newMember()] }));
  };

  const { slots, heavierOk } = cup.settings;

  return (
    <div className="flex flex-col gap-2">
      {cup.teams.map((t, i) => {
        const filled = slots.filter((s) => t.roster[s.id] && t.members.some((m) => m.id === t.roster[s.id])).length;
        const isOpen = open === t.id;
        return (
          <div key={t.id} className={cn("rounded-[12px] border bg-panel", isOpen ? "border-primary/50" : "border-line")}>
            <button className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen(isOpen ? null : t.id)}>
              <span className="font-mono text-xs text-panel-muted">{i + 1}</span>
              <FighterFlag region={t.region || t.name} className="h-4 w-6" />
              <span className="min-w-0 flex-1 truncate font-medium">{t.name || <span className="text-panel-muted">Новая команда</span>}</span>
              <span className={cn("rounded-full px-2 font-mono text-xs", filled === slots.length ? "bg-gold-soft text-tip-foreground" : "bg-corner-red/10 text-corner-red")}>
                {filled}/{slots.length}
              </span>
              <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={16} className="text-panel-muted" />
            </button>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-line p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-panel-muted">Команда</span>
                    <input className="field !h-9" value={t.name} onChange={(e) => patch(t.id, (x) => ({ ...x, name: e.target.value }))} placeholder="Сборная Москвы" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-panel-muted">Регион (для флага)</span>
                    <input className="field !h-9" value={t.region} onChange={(e) => patch(t.id, (x) => ({ ...x, region: e.target.value }))} placeholder="Москва" />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-panel-muted">Спортсмены и вес после взвешивания</span>
                  {t.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5">
                      <input
                        className="field !h-9 flex-1"
                        value={m.name}
                        onChange={(e) => patch(t.id, (x) => ({ ...x, members: x.members.map((y) => (y.id === m.id ? { ...y, name: e.target.value } : y)) }))}
                        placeholder="Фамилия Имя"
                      />
                      <input
                        className="field !h-9 !w-20 text-center font-mono"
                        defaultValue={m.weight == null ? "" : fmtW(m.weight)}
                        onBlur={(e) => {
                          const v = e.target.value.trim() ? parseFloat(e.target.value.replace(",", ".")) : null;
                          const w = v != null && Number.isFinite(v) && v >= 25 && v <= 250 ? Math.round(v * 10) / 10 : null;
                          patch(t.id, (x) => ({ ...x, members: x.members.map((y) => (y.id === m.id ? { ...y, weight: w } : y)) }));
                        }}
                        placeholder="кг"
                      />
                      <button
                        className="rounded p-1.5 text-corner-red hover:bg-surface"
                        title="Убрать спортсмена"
                        onClick={() =>
                          patch(t.id, (x) => ({
                            ...x,
                            members: x.members.filter((y) => y.id !== m.id),
                            roster: Object.fromEntries(Object.entries(x.roster).filter(([, v]) => v !== m.id)),
                          }))
                        }
                      >
                        <Icon name="X" size={15} />
                      </button>
                    </div>
                  ))}
                  <button className="pill self-start !py-1.5 text-sm" onClick={() => addMember(t)}>
                    <Icon name="UserPlus" size={15} /> Спортсмен
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-panel-muted">Основной состав по весовым (перед каждой встречей можно изменить)</span>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {slots.map((s) => {
                      const cur = t.members.find((m) => m.id === t.roster[s.id]);
                      const issue = cur ? weightIssue(slots, s, cur.weight, heavierOk) : null;
                      return (
                        <label key={s.id} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 font-mono text-sm font-semibold">{slotLabel(slots, s)}</span>
                          <select
                            className={cn("field !h-9 min-w-0 flex-1 !py-0", issue && "!border-corner-red")}
                            value={cur?.id ?? ""}
                            onChange={(e) => patch(t.id, (x) => ({ ...x, roster: { ...x.roster, [s.id]: e.target.value } }))}
                            title={issue ?? ""}
                          >
                            <option value="">— не выставлен —</option>
                            {t.members
                              .filter((m) => m.name.trim())
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} {m.weight != null ? `(${fmtW(m.weight)})` : ""}
                                  {weightIssue(slots, s, m.weight, heavierOk) ? " ⚠" : ""}
                                </option>
                              ))}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button className="self-start text-xs text-corner-red underline" onClick={() => remove(t)}>
                  Удалить команду
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button className="btn-blue" onClick={add} disabled={locked}>
        <Icon name="Plus" size={17} /> Добавить команду
      </button>
      {locked && <span className="text-xs text-panel-muted">Жеребьёвка проведена: новые команды — после сброса сетки. Составы можно менять.</span>}
    </div>
  );
}
