import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { isAdultGroup, PARA_LABEL, ParaClass, HAND_FLOW_LABEL, HandFlow, handFlowOf, SYSTEM_LABEL, System, entryClasses, AGE_PRESETS, AgeGroup, DEFAULT_POINTS, Gender, GENDER_LABEL, MODE_LABEL, ScoringMode, tMode, tPoints, tournamentYear, uid, weightClasses } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { shortLabel } from "@/lib/timers";

export default function ClassesSection({ onNext }: { onNext?: () => void }) {
  const { groups, setGroups, athletes, tournament, setTournament } = useStore();
  const year = tournamentYear(tournament);

  const counts = useMemo(() => {
    const c: Record<string, { right: number; left: number }> = {};
    for (const a of athletes) {
      for (const cl of entryClasses(a, groups, tournament)) {
        const k = cl.key;
        c[k] ||= { right: 0, left: 0 };
        a.hands.forEach((h) => c[k][h]++);
      }
    }
    return c;
  }, [athletes, groups, tournament]);

  const update = (id: string, patch: Partial<AgeGroup>) =>
    setGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  return (
    <div className="grid flex-1 gap-4 xl:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="win">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>турнир</b>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <L label="Название">
              <input className="field" value={tournament.name} onChange={(e) => setTournament({ name: e.target.value })} placeholder="Первенство области по армрестлингу" />
            </L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Дата">
                <input type="date" className="field" value={tournament.date} onChange={(e) => setTournament({ date: e.target.value })} />
              </L>
              <L label="Столов">
                <div className="flex h-11 items-center justify-between rounded-[14px] border border-line bg-surface px-1">
                  <button className="rounded-full p-2 hover:bg-line" onClick={() => setTournament({ tables: Math.max(1, tournament.tables - 1) })}>
                    <Icon name="Minus" size={16} />
                  </button>
                  <span className="font-mono">{tournament.tables}</span>
                  <button className="rounded-full p-2 hover:bg-line" onClick={() => setTournament({ tables: Math.min(8, tournament.tables + 1) })}>
                    <Icon name="Plus" size={16} />
                  </button>
                </div>
              </L>
            </div>
            <L label="Место проведения">
              <input className="field" value={tournament.place} onChange={(e) => setTournament({ place: e.target.value })} placeholder="г. Орёл, СК «Олимп»" />
            </L>
            <L label="Дата окончания (если турнир несколько дней)">
              <input type="date" className="field" value={tournament.dateEnd ?? ""} onChange={(e) => setTournament({ dateEnd: e.target.value })} />
            </L>
            <L label="Подзаголовок (возраст, № ЕКП)">
              <input className="field" value={tournament.ekp ?? ""} onChange={(e) => setTournament({ ekp: e.target.value })} placeholder="юноши, девушки 14-15 лет, ЕКП № …" />
            </L>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <L label="Главный судья">
                <input className="field" value={tournament.chiefJudge} onChange={(e) => setTournament({ chiefJudge: e.target.value })} placeholder="Фамилия Имя Отчество" />
              </L>
              <L label="Катег.">
                <input className="field" value={tournament.chiefJudgeCat ?? ""} onChange={(e) => setTournament({ chiefJudgeCat: e.target.value })} placeholder="СВК" />
              </L>
            </div>
            <L label="Зам. главного судьи">
              <input className="field" value={tournament.deputyJudge ?? ""} onChange={(e) => setTournament({ deputyJudge: e.target.value })} placeholder="Фамилия Имя Отчество" />
            </L>
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <L label="Главный секретарь">
                <input className="field" value={tournament.secretary} onChange={(e) => setTournament({ secretary: e.target.value })} placeholder="Фамилия Имя Отчество" />
              </L>
              <L label="Катег.">
                <input className="field" value={tournament.secretaryCat ?? ""} onChange={(e) => setTournament({ secretaryCat: e.target.value })} placeholder="СВК" />
              </L>
            </div>
            <L label="Зам. главного секретаря">
              <input className="field" value={tournament.deputySecretary ?? ""} onChange={(e) => setTournament({ deputySecretary: e.target.value })} placeholder="Фамилия Имя Отчество" />
            </L>
            <button
              type="button"
              className={cn("pill justify-start", (tournament.showLogo ?? true) && "pill-on")}
              onClick={() => setTournament({ showLogo: !(tournament.showLogo ?? true) })}
            >
              <Icon name={(tournament.showLogo ?? true) ? "SquareCheck" : "Square"} size={15} /> Эмблема ФАР в шапке, протоколах и на табло
            </button>
            <RestSettings />
            <L label="Требования для разрядов (печатается в протоколе)">
              <textarea className="field min-h-[72px] py-2" value={tournament.requirements ?? ""} onChange={(e) => setTournament({ requirements: e.target.value })} placeholder="КМС — 1 место при не менее 8 участниках в категории…" />
            </L>
          </div>
        </div>
        <ScoringCard />
        <SystemCard />
        <div className="rounded-lg bg-tip p-4 text-sm leading-relaxed text-tip-foreground">
          <div className="mb-1 font-semibold">Как считается возраст</div>
          Возраст = год турнира ({year}{tournament.date ? "" : ", пока не указана дата — текущий год"}) минус год рождения. Вес сравнивается с верхней границей: 80,0 кг — ещё «до 80».
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="win">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            <span className="mr-1 text-sm font-medium">Добавить готовый набор:</span>
            {AGE_PRESETS.map((p) => {
              const has = p.groups.every((pg) => groups.some((g) => g.name === pg.name));
              return (
                <button
                  key={p.title}
                  className={cn("pill", has && "pill-on")}
                  disabled={has}
                  onClick={() => setGroups([...groups, ...p.groups.map((g) => ({ ...g, limits: [...g.limits], id: uid() }))])}
                >
                  {has ? <Icon name="Check" size={14} /> : <Icon name="Plus" size={14} />} {p.title}
                </button>
              );
            })}
          </div>
          {groups.length > 0 && onNext && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-gold-soft/50 px-4 py-3">
              <span className="text-sm">
                Категории выбраны: <b>{groups.length}</b> возрастных групп. Участники будут распределяться автоматически.
              </span>
              <button className="btn-blue !py-2" onClick={onNext}>
                Далее: регистрация участников <Icon name="ArrowRight" size={16} />
              </button>
            </div>
          )}
          {groups.length > 0 && (
            <div className="flex justify-end px-4 pt-3">
              <button
                className="inline-flex items-center gap-1.5 text-xs text-panel-muted hover:text-corner-red"
                onClick={() => confirm("Удалить все возрастные группы и весовые категории?") && setGroups([])}
              >
                <Icon name="Eraser" size={14} /> Очистить все категории
              </button>
            </div>
          )}
          <p className="px-4 pb-3 pt-3 text-xs text-panel-muted">
            Весовые категории в наборах — типовые по правилам ФАР, проверьте их по положению вашего турнира. Возраст считается по году рождения.
            Группы ПОДА (пара-армрестлинг): PID — спортсмены соревнуются сидя, PIU — стоя. В них попадают только участники с указанным пара-классом.
          </p>
        </div>
        {!groups.length && (
          <div className="rounded-lg border-2 border-dashed border-line px-5 py-8 text-center text-panel-muted">
            Категорий пока нет. Выберите готовый набор выше или добавьте возрастную группу вручную.
          </div>
        )}
        {groups.map((g) => (
          <GroupCard key={g.id} g={g} counts={counts} onChange={(p) => update(g.id, p)} onRemove={() => setGroups(groups.filter((x) => x.id !== g.id))} />
        ))}
        <button
          className="pill self-start"
          onClick={() =>
            setGroups([...groups, { id: uid(), name: "Новая группа", gender: "M", ageMin: 18, ageMax: 99, limits: [70, 80, 90] }])
          }
        >
          <Icon name="Plus" size={16} /> Добавить возрастную группу
        </button>
      </div>
    </div>
  );
}

function GroupCard({
  g,
  counts,
  onChange,
  onRemove,
}: {
  g: AgeGroup;
  counts: Record<string, { right: number; left: number }>;
  onChange: (p: Partial<AgeGroup>) => void;
  onRemove: () => void;
}) {
  const [add, setAdd] = useState("");
  const classes = weightClasses([g]);
  return (
    <div className="rounded-lg bg-frame p-2.5">
      <div className="win">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <input className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none" value={g.name} onChange={(e) => onChange({ name: e.target.value })} />
          <div className="flex rounded-full bg-panel p-1">
            {(["M", "F"] as Gender[]).map((x) => (
              <button
                key={x}
                onClick={() => onChange({ gender: x })}
                className={cn("rounded-full px-3 py-1 text-xs font-medium", g.gender === x ? "bg-primary text-primary-foreground" : "text-panel-muted")}
              >
                {GENDER_LABEL[x]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-panel-muted">
            возраст
            <input className="h-8 w-12 rounded-full border border-line bg-panel text-center text-foreground outline-none" value={g.ageMin} onChange={(e) => onChange({ ageMin: parseInt(e.target.value) || 0 })} />
            –
            <input className="h-8 w-12 rounded-full border border-line bg-panel text-center text-foreground outline-none" value={g.ageMax} onChange={(e) => onChange({ ageMax: parseInt(e.target.value) || 0 })} />
          </div>
          <select
            value={g.para ?? ""}
            onChange={(e) => onChange({ para: (e.target.value || undefined) as ParaClass | undefined, ...(e.target.value ? { adult: false } : {}) })}
            className={cn("h-7 rounded-full border px-2 text-xs font-medium outline-none", g.para ? "border-copper bg-copper text-white" : "border-line bg-panel text-panel-muted")}
            title="Пара-армрестлинг (ПОДА): в группу попадают только спортсмены с этим классом"
          >
            <option value="">без ПОДА</option>
            {(Object.keys(PARA_LABEL) as ParaClass[]).map((k) => (
              <option key={k} value={k}>
                ПОДА {PARA_LABEL[k]}
              </option>
            ))}
          </select>
          {!g.para && <button
            onClick={() => onChange({ adult: !isAdultGroup(g) })}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", isAdultGroup(g) ? "bg-primary text-primary-foreground" : "bg-panel text-panel-muted hover:text-foreground")}
            title="Взрослая группа: сюда дополнительно попадают совершеннолетние юниоры"
          >
            {isAdultGroup(g) ? "✓ " : "+ "}взрослая
          </button>}
          <button
            onClick={() => onChange({ absolute: !g.absolute })}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", g.absolute ? "bg-primary text-primary-foreground" : "bg-panel text-panel-muted hover:text-foreground")}
            title="Абсолютное первенство: отдельная сетка без деления по весу (п. 1.1). Участников отмечают в разделе «Участники»."
          >
            {g.absolute ? "✓ " : "+ "}абсолютное
          </button>
          <button onClick={onRemove} className="rounded-full p-1.5 text-panel-muted hover:text-corner-red" aria-label="Удалить группу">
            <Icon name="Trash2" size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {classes.map((c) => {
            const n = counts[c.key] || { right: 0, left: 0 };
            return (
              <div key={c.key} className="group relative bg-panel px-4 py-3">
                <div className="text-xl font-medium">{c.label}</div>
                <div className="cat mt-1">
                  правая {n.right} · левая {n.left}
                </div>
                {c.abs && <div className="mt-1 text-[11px] text-panel-muted">без деления по весу</div>}
                {c.limit != null && (
                  <button
                    onClick={() => onChange({ limits: g.limits.filter((l) => l !== c.limit) })}
                    className="absolute right-2 top-2 rounded-full p-1 text-panel-muted opacity-0 transition-opacity hover:text-corner-red group-hover:opacity-100"
                    aria-label="Убрать категорию"
                  >
                    <Icon name="X" size={14} />
                  </button>
                )}
              </div>
            );
          })}
          <form
            className="flex items-center gap-2 bg-panel px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(add.replace(",", "."));
              if (v > 20 && v < 250 && !g.limits.includes(v)) onChange({ limits: [...g.limits, v].sort((a, b) => a - b) });
              setAdd("");
            }}
          >
            <input className="h-8 w-full rounded-full border border-line bg-surface px-3 font-mono text-sm outline-none focus:border-primary" placeholder="до … кг" value={add} onChange={(e) => setAdd(e.target.value)} />
            <button className="rounded-full bg-primary p-1.5 text-primary-foreground" aria-label="Добавить">
              <Icon name="Plus" size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-xs text-panel-muted">{label}</span>
      {children}
    </label>
  );
}

function ScoringCard() {
  const { tournament, setTournament } = useStore();
  const mode = tMode(tournament);
  const pts = tPoints(tournament);
  const [txt, setTxt] = useState(pts.join(", "));
  const commit = () => {
    const arr = txt
      .split(/[\s,;]+/)
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x) && x >= 0);
    setTournament({ points: arr.length ? arr : DEFAULT_POINTS });
    setTxt((arr.length ? arr : DEFAULT_POINTS).join(", "));
  };
  return (
    <div className="win">
      <div className="win-bar">
        <i />
        <i />
        <i />
        <b>правила подсчёта</b>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-2">
          {(Object.keys(MODE_LABEL) as ScoringMode[]).map((m) => (
            <button
              key={m}
              className={cn("pill justify-start", mode === m && "pill-on")}
              onClick={() => setTournament({ mode: m })}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-panel-muted">
          {mode === "hands"
            ? "Места и очки по каждой руке отдельно. Командный зачёт — сумма очков по обеим рукам."
            : "Дополнительно считается двоеборье: сумма очков за места на правой и левой руке. При равенстве — меньший вес, перевзвешивание, лучшее место на одной из рук; возможны два 3-х места (п. 2.7)."}
        </p>
        <L label="Очки за места 1, 2, 3…">
          <input
            className="field font-mono"
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        </L>
        <button className="self-start text-xs underline text-panel-muted" onClick={() => { setTournament({ points: DEFAULT_POINTS }); setTxt(DEFAULT_POINTS.join(", ")); }}>
          Вернуть стандартные ({DEFAULT_POINTS.join(", ")})
        </button>
      </div>
    </div>
  );
}

function RestSettings() {
  const { tournament, setTournament } = useStore();
  const row = (key: "restShort" | "restLong", title: string, hint: string, def: number, opts: number[]) => {
    const v = tournament[key] ?? def;
    const set = (n: number) => setTournament({ [key]: Math.max(5, Math.min(3600, n)) });
    return (
      <div className="flex flex-col gap-1.5">
        <div className="leading-tight">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-panel-muted">{hint}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {opts.map((o) => (
            <button key={o} type="button" className={cn("pill !px-3 !py-1 text-xs", v === o && "pill-on")} onClick={() => set(o)}>
              {shortLabel(o)}
            </button>
          ))}
          <span className="ml-1 flex items-center gap-1 text-xs text-panel-muted">
            или
            <input
              type="number"
              min={5}
              max={3600}
              className="field !h-8 !w-20 !px-2 text-center font-mono"
              value={v}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (Number.isFinite(n)) set(n);
              }}
            />
            сек
          </span>
        </div>
      </div>
    );
  };
  const changed = (tournament.restShort ?? 30) !== 30 || (tournament.restLong ?? 120) !== 120;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="Timer" size={16} className="text-primary" /> Таймеры отдыха по регламенту
      </div>
      {changed && (
          <button type="button" className="-mt-2 self-start text-xs font-normal text-primary hover:underline" onClick={() => setTournament({ restShort: 30, restLong: 120 })}>
            вернуть 30 сек / 2 мин
          </button>
      )}
      {row("restShort", "Короткий отдых (клавиша T)", "после ситуации в поединке", 30, [15, 30, 45, 60])}
      {row("restLong", "Длинный отдых (клавиша Y)", "между схватками", 120, [60, 90, 120, 180, 300])}
    </div>
  );
}

function SystemCard() {
  const { tournament, setTournament } = useStore();
  const sys = tournament.system ?? "double";
  const tol = tournament.tolerance ?? 0;
  return (
    <div className="win">
      <div className="win-bar">
        <i />
        <i />
        <i />
        <b>система и допуск</b>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="text-sm font-medium">Система проведения (п. 1.2 Правил)</div>
        <div className="flex flex-col gap-2">
          {(Object.keys(SYSTEM_LABEL) as System[]).map((m) => (
            <button key={m} className={cn("pill justify-start", sys === m && "pill-on")} onClick={() => setTournament({ system: m })}>
              {SYSTEM_LABEL[m]}
            </button>
          ))}
        </div>
        {sys === "olympic" && (
          <button
            className={cn("pill justify-start", (tournament.olympicThird ?? true) && "pill-on")}
            onClick={() => setTournament({ olympicThird: !(tournament.olympicThird ?? true) })}
          >
            <Icon name={(tournament.olympicThird ?? true) ? "SquareCheck" : "Square"} size={15} /> Поединок за 3-е место
          </button>
        )}
        {sys !== "roundrobin" && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Круговая, если в категории не больше
            <select
              className="field !h-9 !w-20 !px-2"
              value={tournament.rrMax ?? 0}
              onChange={(e) => setTournament({ rrMax: parseInt(e.target.value, 10) || 0 })}
            >
              <option value={0}>—</option>
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            участников
          </label>
        )}
        <p className="text-xs leading-relaxed text-panel-muted">
          Система применяется к новым жеребьёвкам. Уже построенные сетки не меняются — перетяните жребий, если нужно.
        </p>

        <div className="mt-1 border-t border-line pt-3 text-sm font-medium">Порядок рук (п. 1.1, по Положению)</div>
        <div className="flex flex-wrap gap-1.5">
          {(["left", "right"] as const).map((h) => (
            <button
              key={h}
              className={cn("pill !px-3 !py-1 text-xs", (tournament.firstHand ?? "left") === h && "pill-on")}
              onClick={() => setTournament({ firstHand: h, secondHandOpen: false })}
            >
              Сначала {h === "left" ? "левая" : "правая"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(HAND_FLOW_LABEL) as HandFlow[]).map((f) => (
            <button
              key={f}
              className={cn("pill justify-start text-left text-sm", handFlowOf(tournament) === f && "pill-on")}
              onClick={() => setTournament({ handFlow: f, secondHandOpen: false })}
            >
              {HAND_FLOW_LABEL[f]}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-panel-muted">
          Весовая категория закрепляется за одним столом на обе руки. Когда стол закончил первую руку, на табло показывается перерыв с победителями — до вызова первой пары второй руки.
        </p>

        <div className="mt-1 border-t border-line pt-3 text-sm font-medium">Провес при допуске в категорию (п. 8.8)</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            [0, "без провеса"],
            [0.05, "0,05 кг · ЧР/ПР"],
            [0.1, "0,1 кг"],
          ].map(([v, l]) => (
            <button key={String(v)} className={cn("pill !px-3 !py-1 text-xs", tol === v && "pill-on")} onClick={() => setTournament({ tolerance: v as number })}>
              {l}
            </button>
          ))}
        </div>
        <ToleranceInput value={tol} onChange={(v) => setTournament({ tolerance: v })} />

        <button
          className={cn("pill mt-1 justify-start", tournament.requireAdmit && "pill-on")}
          onClick={() => setTournament({ requireAdmit: !tournament.requireAdmit })}
        >
          <Icon name={tournament.requireAdmit ? "SquareCheck" : "Square"} size={15} /> Требовать отметки допуска
        </button>
        <p className="text-xs leading-relaxed text-panel-muted">
          Врач, страховка и комиссия по допуску (п. 3.1, 7). Без всех трёх отметок спортсмен не попадает в жеребьёвку.
        </p>
        <p className="rounded-[12px] bg-gold-soft/60 px-3 py-2 text-xs leading-relaxed text-tip-foreground">
          Совершеннолетние юниоры (от 18 лет) выступают в своей юниорской категории. Во взрослую их заявляют только по желанию — отметкой «+ взрослые» при регистрации или в таблице участников.
        </p>
      </div>
    </div>
  );
}

/** Провес вручную — по Положению турнира (п. 8.8 допускает своё значение). */
function ToleranceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const fmt = (v: number) => (v ? String(v).replace(".", ",") : "");
  const [txt, setTxt] = useState(fmt(value));
  const [err, setErr] = useState("");
  useEffect(() => setTxt(fmt(value)), [value]);
  const commit = () => {
    const t = txt.trim().replace(",", ".");
    if (!t) {
      setErr("");
      if (value !== 0) onChange(0);
      return;
    }
    const v = Number(t);
    if (!Number.isFinite(v) || v < 0 || v > 2) {
      setErr("От 0 до 2 кг");
      return;
    }
    setErr("");
    const r = Math.round(v * 1000) / 1000;
    if (r !== value) onChange(r);
    setTxt(fmt(r));
  };
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      Свой провес:
      <input
        className={cn("field !h-9 !w-24 !px-3 font-mono", err && "!border-corner-red")}
        inputMode="decimal"
        placeholder="0,2"
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      кг
      {err ? (
        <span className="text-xs text-corner-red">{err}</span>
      ) : (
        <span className="text-xs text-panel-muted">
          {value ? `спортсмен до 80 кг допускается с весом до ${(80 + value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")} кг` : "Enter — сохранить"}
        </span>
      )}
    </label>
  );
}
