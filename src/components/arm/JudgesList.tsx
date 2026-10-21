import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { JUDGE_CATEGORIES, JUDGE_ROLES, Judge, uid } from "@/lib/arm";
import { cn } from "@/lib/utils";

const ROLE_ORDER = (r: string) => {
  const i = JUDGE_ROLES.indexOf(r);
  return i < 0 ? JUDGE_ROLES.length : i;
};
const CAT_ORDER = (c: string) => {
  const i = JUDGE_CATEGORIES.indexOf(c);
  return i < 0 ? JUDGE_CATEGORIES.length : i;
};

const EMPTY = { name: "", role: "Спортивный судья", category: "ВК", city: "" };

export default function JudgesList({ printOnly = false }: { printOnly?: boolean }) {
  const { tournament, setTournament } = useStore();
  const judges = tournament.judges ?? [];
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState("");

  const save = (list: Judge[]) => setTournament({ judges: list });

  const sorted = [...judges].sort(
    (a, b) => ROLE_ORDER(a.role) - ROLE_ORDER(b.role) || CAT_ORDER(a.category) - CAT_ORDER(b.category) || a.name.localeCompare(b.name, "ru"),
  );

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().split(/\s+/).length < 2) return setErr("Укажите фамилию и имя");
    setErr("");
    save([...judges, { ...f, name: f.name.trim(), city: f.city.trim(), id: uid() }]);
    setF({ ...EMPTY, role: f.role === "Спортивный судья" ? f.role : "Спортивный судья", category: f.category });
  };

  const update = (id: string, patch: Partial<Judge>) => save(judges.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const fillFromTournament = () => {
    const have = new Set(judges.map((j) => j.name.trim().toLowerCase()));
    const extra: Judge[] = [];
    const push = (name: string | undefined, role: string, cat?: string) => {
      const n = (name || "").trim();
      if (!n || have.has(n.toLowerCase())) return;
      have.add(n.toLowerCase());
      extra.push({ id: uid(), name: n, role, category: cat?.replace(/^С/, "") || "ВК", city: "" });
    };
    push(tournament.chiefJudge, "Главный судья", tournament.chiefJudgeCat);
    push(tournament.deputyJudge, "Заместитель главного судьи");
    push(tournament.secretary, "Главный секретарь", tournament.secretaryCat);
    push(tournament.deputySecretary, "Заместитель главного секретаря");
    save([...extra, ...judges]);
  };

  const table = (
    <table className={cn("w-full text-sm", printOnly && "text-[11px]")}>
      <thead>
        <tr className="border-b border-line text-left align-bottom font-mono text-xs text-panel-muted print:border-black print:text-black">
          <th className="w-12 px-3 py-2 font-normal">№ п/п</th>
          <th className="px-2 py-2 font-normal">ФИО</th>
          <th className="px-2 py-2 font-normal">должность</th>
          <th className="px-2 py-2 font-normal">судейская категория</th>
          <th className="px-2 py-2 font-normal">город, субъект РФ</th>
          {!printOnly && <th className="w-10 print:hidden" />}
        </tr>
      </thead>
      <tbody>
        {sorted.map((j, i) => (
          <tr key={j.id} className="border-b border-line/60 last:border-0 print:border-black/40">
            <td className="px-3 py-1.5 font-mono">{i + 1}.</td>
            {printOnly ? (
              <>
                <td className="px-2 py-1.5">{j.name}</td>
                <td className="px-2 py-1.5">{j.role}</td>
                <td className="px-2 py-1.5">{j.category}</td>
                <td className="px-2 py-1.5">{j.city}</td>
              </>
            ) : (
              <>
                <td className="px-2 py-1.5">
                  <input className="cell" value={j.name} onChange={(e) => update(j.id, { name: e.target.value })} />
                </td>
                <td className="px-2 py-1.5">
                  <select className="cell" value={j.role} onChange={(e) => update(j.id, { role: e.target.value })}>
                    {!JUDGE_ROLES.includes(j.role) && <option value={j.role}>{j.role}</option>}
                    {JUDGE_ROLES.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <select className="cell" value={j.category} onChange={(e) => update(j.id, { category: e.target.value })}>
                    {!JUDGE_CATEGORIES.includes(j.category) && <option value={j.category}>{j.category}</option>}
                    {JUDGE_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <input className="cell" value={j.city} placeholder="г. Орёл, Орловская область" onChange={(e) => update(j.id, { city: e.target.value })} />
                </td>
                <td className="px-2 py-1.5 text-right print:hidden">
                  <button
                    className="rounded-full p-1.5 text-panel-muted hover:text-corner-red"
                    aria-label="Удалить судью"
                    onClick={() => save(judges.filter((x) => x.id !== j.id))}
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (printOnly) return table;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={add} className="win print:hidden">
        <div className="grid gap-2 p-4 md:grid-cols-[1.4fr_1.2fr_0.8fr_1.3fr_auto]">
          <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Фамилия Имя Отчество" />
          <select className="field" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {JUDGE_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select className="field" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {JUDGE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Город, субъект РФ" />
          <button type="submit" className="btn-blue">
            <Icon name="UserPlus" size={16} /> Добавить
          </button>
        </div>
        {err && <div className="px-4 pb-3 text-xs text-corner-red">{err}</div>}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          <button type="button" className="pill" onClick={fillFromTournament}>
            <Icon name="Users" size={15} /> Взять главного судью и секретаря из «Категорий»
          </button>
          <span className="text-xs text-panel-muted">Порядок в списке: по должности, затем по категории и фамилии.</span>
        </div>
      </form>

      {judges.length ? (
        <div className="win overflow-x-auto print:rounded-none print:bg-white print:text-black">{table}</div>
      ) : (
        <div className="win items-center justify-center p-10 text-panel-muted">Список пока пуст — добавьте судей выше</div>
      )}
    </div>
  );
}
