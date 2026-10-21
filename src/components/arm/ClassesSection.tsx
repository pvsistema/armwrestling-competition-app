import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { AgeGroup, Gender, GENDER_LABEL, classOf, tournamentYear, uid, weightClasses } from "@/lib/arm";
import { cn } from "@/lib/utils";

export default function ClassesSection() {
  const { groups, setGroups, athletes, tournament, setTournament } = useStore();
  const year = tournamentYear(tournament);

  const counts = useMemo(() => {
    const c: Record<string, { right: number; left: number }> = {};
    for (const a of athletes) {
      const k = classOf(a, groups, year)?.key;
      if (!k) continue;
      c[k] ||= { right: 0, left: 0 };
      a.hands.forEach((h) => c[k][h]++);
    }
    return c;
  }, [athletes, groups, year]);

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
              <input className="field" value={tournament.name} onChange={(e) => setTournament({ name: e.target.value })} />
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
              <input className="field" value={tournament.place} onChange={(e) => setTournament({ place: e.target.value })} />
            </L>
            <L label="Главный судья">
              <input className="field" value={tournament.chiefJudge} onChange={(e) => setTournament({ chiefJudge: e.target.value })} placeholder="Фамилия И.О." />
            </L>
            <L label="Главный секретарь">
              <input className="field" value={tournament.secretary} onChange={(e) => setTournament({ secretary: e.target.value })} placeholder="Фамилия И.О." />
            </L>
          </div>
        </div>
        <div className="rounded-lg bg-tip p-4 text-sm leading-relaxed text-tip-foreground">
          <div className="mb-1 font-semibold">Как считается возраст</div>
          Возраст = год турнира ({year}) минус год рождения. Вес сравнивается с верхней границей: 80,0 кг — ещё «до 80».
        </div>
      </div>

      <div className="flex flex-col gap-3">
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
