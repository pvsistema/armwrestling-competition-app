import { useState } from "react";
import Icon from "@/components/ui/icon";
import { DISTRICTS, PARA_LABEL, ParaClass, RANKS } from "@/lib/arm";
import { RepAthlete, cab, fmtD } from "@/lib/cabinet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EMPTY: RepAthlete = { name: "", gender: "M", birthDate: "", rank: "", club: "", city: "", district: "", farId: "", coach: "", insNum: "", insTo: "" };
const today = () => new Date().toISOString().slice(0, 10);

function L({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs text-panel-muted", className)}>
      {label}
      {children}
    </label>
  );
}

function AthleteForm({ init, team, onDone }: { init: RepAthlete; team: string; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState<RepAthlete>({ ...EMPTY, ...init, club: init.club || team });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<RepAthlete>) => setF((x) => ({ ...x, ...p }));
  const save = async () => {
    if (!f.name.trim() || !f.birthDate) return toast({ title: "Укажите ФИО и дату рождения", variant: "destructive" });
    setBusy(true);
    try {
      const { id, ...data } = f;
      await cab("athlete_save", { id: id ?? 0, athlete: data });
      onDone(true);
    } catch (e) {
      toast({ title: "Не сохранено", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };
  return (
    <div className="win gap-3 p-4">
      <div className="text-lg font-semibold">{init.id ? "Изменить спортсмена" : "Новый спортсмен"}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L label="Фамилия Имя Отчество" className="sm:col-span-2">
          <input className="field" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </L>
        <L label="Пол">
          <div className="flex gap-1.5">
            {(["M", "F"] as const).map((g) => (
              <button key={g} type="button" className={cn("pill flex-1 justify-center", f.gender === g && "pill-on")} onClick={() => set({ gender: g })}>
                {g === "M" ? "Муж." : "Жен."}
              </button>
            ))}
          </div>
        </L>
        <L label="Дата рождения">
          <input type="date" className="field" value={f.birthDate} max={today()} onChange={(e) => set({ birthDate: e.target.value })} />
        </L>
        <L label="Спортивное звание / разряд">
          <select className="field" value={f.rank} onChange={(e) => set({ rank: e.target.value })}>
            <option value="">—</option>
            {RANKS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </L>
        <L label="Субъект РФ / команда">
          <input className="field" value={f.club} onChange={(e) => set({ club: e.target.value })} />
        </L>
        <L label="Город">
          <input className="field" value={f.city} onChange={(e) => set({ city: e.target.value })} />
        </L>
        <L label="Федеральный округ">
          <select className="field" value={f.district} onChange={(e) => set({ district: e.target.value })}>
            <option value="">—</option>
            {DISTRICTS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </L>
        <L label="№ паспорта ФАР">
          <input className="field font-mono" value={f.farId} onChange={(e) => set({ farId: e.target.value })} />
        </L>
        <L label="Тренер">
          <input className="field" value={f.coach} onChange={(e) => set({ coach: e.target.value })} />
        </L>
        <L label="Пара-армрестлинг (ПОДА)">
          <select className="field" value={f.para ?? ""} onChange={(e) => set({ para: (e.target.value || undefined) as ParaClass | undefined })}>
            <option value="">нет</option>
            {(Object.keys(PARA_LABEL) as ParaClass[]).map((p) => (
              <option key={p} value={p}>
                {PARA_LABEL[p]}
              </option>
            ))}
          </select>
        </L>
      </div>
      <div className="grid gap-3 rounded-lg bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 text-sm font-medium sm:col-span-2 lg:col-span-1">
          <Icon name="ShieldCheck" size={18} className="text-gold" /> Страховка от несчастного случая
        </div>
        <L label="№ полиса">
          <input className="field font-mono" value={f.insNum} onChange={(e) => set({ insNum: e.target.value })} />
        </L>
        <L label="Действует до">
          <input type="date" className="field" value={f.insTo} onChange={(e) => set({ insTo: e.target.value })} />
        </L>
      </div>
      <div className="flex gap-2">
        <button className="btn-blue" disabled={busy} onClick={save}>
          <Icon name="Save" size={17} /> Сохранить
        </button>
        <button className="pill" onClick={() => onDone(false)}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function RepAthletes({ list, team, reload }: { list: RepAthlete[]; team: string; reload: () => void }) {
  const [edit, setEdit] = useState<RepAthlete | null>(null);
  const [q, setQ] = useState("");
  const shown = list.filter((a) => !q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase()));
  const t = today();

  return (
    <div className="flex flex-col gap-3">
      {edit ? (
        <AthleteForm
          init={edit}
          team={team}
          onDone={(s) => {
            setEdit(null);
            if (s) reload();
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-gold" onClick={() => setEdit({ ...EMPTY })}>
            <Icon name="UserPlus" size={18} /> Добавить спортсмена
          </button>
          <input className="field ml-auto w-full max-w-xs" placeholder="Поиск по ФИО" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}
      <div className="win overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-left text-xs text-panel-muted">
              <th className="px-3 py-2">№</th>
              <th className="px-3 py-2">ФИО</th>
              <th className="px-3 py-2">Дата рожд.</th>
              <th className="px-3 py-2">Звание</th>
              <th className="px-3 py-2">Субъект / город</th>
              <th className="px-3 py-2">Паспорт ФАР</th>
              <th className="px-3 py-2">Страховка</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((a, i) => {
              const ins = a.insNum && a.insTo ? (a.insTo >= t ? "ok" : "old") : "none";
              return (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-3 py-2 text-panel-muted">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">
                    {a.name} <span className="font-mono text-xs text-panel-muted">{a.gender === "M" ? "М" : "Ж"}</span>
                    {a.para && <span className="ml-1.5 rounded-full bg-copper px-1.5 text-[10px] font-semibold text-white">ПОДА {a.para}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono">{fmtD(a.birthDate)}</td>
                  <td className="px-3 py-2">{a.rank}</td>
                  <td className="px-3 py-2">{[a.club, a.city].filter(Boolean).join(", ")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.farId}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-2 py-0.5 text-xs",
                        ins === "ok" ? "bg-emerald-100 text-emerald-800" : ins === "old" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700",
                      )}
                    >
                      {ins === "none" ? "нет" : `до ${fmtD(a.insTo)}`}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button className="rounded-full p-1.5 hover:bg-accent" title="Изменить" onClick={() => setEdit(a)}>
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button
                      className="rounded-full p-1.5 text-corner-red hover:bg-corner-red/10"
                      title="Удалить"
                      onClick={async () => {
                        if (!confirm(`Удалить ${a.name} из вашего списка?`)) return;
                        await cab("athlete_delete", { id: a.id }).catch(() => {});
                        reload();
                      }}
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-panel-muted">
                  {list.length ? "Никого не найдено" : "Добавьте своих спортсменов — потом из них вы будете собирать заявки на турниры"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
