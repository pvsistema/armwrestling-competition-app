import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { HAND_LABEL, Hand } from "@/lib/arm";
import { CUP_SYSTEM_LABEL, CupSettings, CupState, CupSystem, DEFAULT_SLOTS, slotLabel } from "@/lib/teamCup";

interface Props {
  cup: CupState;
  update: (fn: (p: CupState) => CupState) => void;
}

/** Настройки кубка: система, весовые состава, порядок рук, очки. */
export default function CupSettingsForm({ cup, update }: Props) {
  const s = cup.settings;
  const locked = cup.brackets.length > 0;
  const set = (p: Partial<CupSettings>) => update((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const [txt, setTxt] = useState(() => s.slots.map((x) => x.limit ?? "+").join(", "));

  const commitSlots = () => {
    const parts = txt.split(/[\s,;]+/).filter(Boolean);
    const nums = Array.from(new Set(parts.map((p) => parseFloat(p.replace(",", "."))).filter((n) => Number.isFinite(n) && n > 20 && n < 250))).sort((a, b) => a - b);
    if (!nums.length) return setTxt(s.slots.map((x) => x.limit ?? "+").join(", "));
    const plus = parts.some((p) => p.includes("+"));
    const lims: (number | null)[] = [...nums, ...(plus ? [null] : [])];
    const slots = lims.map((limit, i) => ({ id: s.slots.find((x) => x.limit === limit)?.id ?? `s${Date.now().toString(36)}${i}`, limit }));
    set({ slots });
    setTxt(lims.map((l) => l ?? "+").join(", "));
  };

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs text-panel-muted">Название</span>
          <input className="field !h-9" value={s.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-panel-muted">Место</span>
          <input className="field !h-9" value={s.place} onChange={(e) => set({ place: e.target.value })} placeholder="г. Тула" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-panel-muted">Дата</span>
          <input type="date" className="field !h-9" value={s.date} onChange={(e) => set({ date: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-panel-muted">Главный судья</span>
          <input className="field !h-9" value={s.chiefJudge} onChange={(e) => set({ chiefJudge: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-panel-muted">Главный секретарь</span>
          <input className="field !h-9" value={s.secretary} onChange={(e) => set({ secretary: e.target.value })} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-panel-muted">Система встреч команд {locked && "(меняется после сброса жеребьёвки)"}</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CUP_SYSTEM_LABEL) as CupSystem[]).map((k) => (
            <button key={k} disabled={locked} className={cn("pill !px-3 !py-1.5 text-xs disabled:opacity-50", s.system === k && "pill-on")} onClick={() => set({ system: k })}>
              {CUP_SYSTEM_LABEL[k]}
            </button>
          ))}
        </div>
        {s.system === "groups" && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            Групп:
            {[2, 3, 4].map((n) => (
              <button key={n} disabled={locked} className={cn("pill !px-3 !py-1 text-xs", s.groups === n && "pill-on")} onClick={() => set({ groups: n })}>
                {n}
              </button>
            ))}
            <span className="ml-2">В плей-офф из группы:</span>
            {[1, 2].map((n) => (
              <button key={n} disabled={locked} className={cn("pill !px-3 !py-1 text-xs", s.advance === n && "pill-on")} onClick={() => set({ advance: n })}>
                {n}
              </button>
            ))}
          </div>
        )}
        {(s.system === "olympic" || s.system === "groups") && (
          <button className={cn("pill self-start !px-3 !py-1 text-xs", s.third && "pill-on")} disabled={locked} onClick={() => set({ third: !s.third })}>
            <Icon name={s.third ? "SquareCheck" : "Square"} size={14} /> Встреча за 3-е место
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-panel-muted">Весовые состава, кг («+» — свыше последней)</span>
        <input
          className="field !h-9 font-mono"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={commitSlots}
          onKeyDown={(e) => e.key === "Enter" && commitSlots()}
          disabled={locked}
        />
        <span className="flex flex-wrap gap-1 text-xs text-panel-muted">
          Состав: {s.slots.map((x) => slotLabel(s.slots, x)).join(" · ")} — {s.slots.length} чел.
          {!locked && (
            <button
              className="ml-1 underline"
              onClick={() => {
                set({ slots: DEFAULT_SLOTS });
                setTxt(DEFAULT_SLOTS.map((x) => x.limit ?? "+").join(", "));
              }}
            >
              50…100+
            </button>
          )}
        </span>
      </label>

      <button className={cn("pill self-start !px-3 !py-1 text-xs", s.heavierOk && "pill-on")} onClick={() => set({ heavierOk: !s.heavierOk })}>
        <Icon name={s.heavierOk ? "SquareCheck" : "Square"} size={14} /> Можно выставлять спортсмена легче категории (за более тяжёлый вес)
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-panel-muted">Первая рука в паре:</span>
        {(["left", "right"] as Hand[]).map((h) => (
          <button key={h} className={cn("pill !px-3 !py-1 text-xs", s.firstHand === h && "pill-on")} onClick={() => set({ firstHand: h })}>
            {HAND_LABEL[h]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-panel-muted">Очки за встречу в круговой — победа / ничья / поражение:</span>
        {(["win", "draw", "loss"] as const).map((k) => (
          <input
            key={k}
            type="number"
            min={0}
            max={10}
            className="field !h-8 !w-14 !px-1 text-center font-mono"
            value={s.pts[k]}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n)) set({ pts: { ...s.pts, [k]: Math.max(0, Math.min(10, n)) } });
            }}
          />
        ))}
      </div>

      <p className="rounded-lg bg-tip px-3 py-2 text-xs leading-relaxed text-tip-foreground">
        В каждой весовой пара борется обеими руками. Выиграл обе — очко команде. 1:1 — монетка выбирает руку третьего поединка. Встреча — по числу выигранных пар; при равенстве побеждает команда с меньшим суммарным весом
        выставленных спортсменов. Ничья во встрече (очко обеим) — только в круговой, если и вес равный. Нет спортсмена в весовой — пара засчитывается сопернику.
      </p>
    </div>
  );
}
