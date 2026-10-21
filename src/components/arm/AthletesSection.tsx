import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { AgeGroup, Athlete, DISTRICTS, Gender, HAND_LABEL, Hand, OUT_LABEL, OutReason, RANKS, Tournament, classOf, fmtBirth, fmtKg, isAdmitted, tournamentYear } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const EMPTY = {
  name: "",
  gender: "M" as Gender,
  birthYear: "",
  weight: "",
  club: "",
  city: "",
  rank: "",
  district: "",
  hands: ["left", "right"] as Hand[],
};

export default function AthletesSection() {
  const { athletes, groups, tournament, addAthlete, updateAthlete, removeAthlete, withdraw } = useStore();
  const classMap = useClassMap();
  const year = tournamentYear(tournament);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "weighed" | "pending" | "noadmit">("all");
  const needAdmit = !!tournament.requireAdmit;
  const notAdmitted = athletes.filter((a) => !isAdmitted(a, tournament)).length;

  const weighed = athletes.filter((a) => a.weight != null).length;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return athletes
      .filter((a) =>
        filter === "all" ? true : filter === "weighed" ? a.weight != null : filter === "noadmit" ? !isAdmitted(a, tournament) : a.weight == null,
      )
      .filter((a) => !s || `${a.name} ${a.club} ${a.city}`.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [athletes, q, filter, tournament]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().split(/\s+/).length < 2) er.name = "Фамилия и имя";
    const dm = f.birthYear.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const by = dm ? parseInt(dm[3], 10) : parseInt(f.birthYear, 10);
    const birthDate = dm ? `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}` : undefined;
    if (!by || by < 1930 || by > year - 10) er.birthYear = "Год рождения";
    const w = f.weight ? parseFloat(f.weight.replace(",", ".")) : null;
    if (f.weight && (!w || w < 25 || w > 250)) er.weight = "Вес 25–250 кг";
    if (!f.hands.length) er.hands = "Хотя бы одна рука";
    setErr(er);
    if (Object.keys(er).length) return;
    addAthlete({
      name: f.name.trim(),
      gender: f.gender,
      birthYear: by,
      weight: w,
      club: f.club.trim(),
      city: f.city.trim(),
      hands: f.hands,
      birthDate,
      rank: f.rank || undefined,
      district: f.district || undefined,
    });
    toast({ title: "Участник добавлен", description: f.name.trim() });
    setF({ ...EMPTY, gender: f.gender, club: f.club, city: f.city, district: f.district });
  };

  const toggleHand = (h: Hand) =>
    setF((p) => ({ ...p, hands: p.hands.includes(h) ? p.hands.filter((x) => x !== h) : [...p.hands, h] }));

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-frame p-2.5">
        <div className="win flex-1">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>регистрация</b>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <h2 className="text-2xl font-medium tracking-tight">Новый участник</h2>
            <Field label="Фамилия Имя" error={err.name}>
              <input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Волков Артём" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Пол">
                <div className="flex h-11 rounded-[14px] border border-line bg-surface p-1">
                  {(["M", "F"] as Gender[]).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setF({ ...f, gender: g })}
                      className={cn(
                        "flex-1 rounded-[10px] text-sm font-medium",
                        f.gender === g ? "bg-primary text-primary-foreground" : "text-panel-muted hover:text-foreground",
                      )}
                    >
                      {g === "M" ? "Муж" : "Жен"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Дата или год рождения" error={err.birthYear}>
                <input className="field" inputMode="numeric" value={f.birthYear} onChange={(e) => setF({ ...f, birthYear: e.target.value })} placeholder="10.01.2011" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Команда / субъект РФ">
                <input className="field" value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })} placeholder="Республика Татарстан" />
              </Field>
              <Field label="Город">
                <input className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Казань" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Спортивное звание">
                <select className="field" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })}>
                  <option value="">—</option>
                  {RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Федеральный округ">
                <select className="field" value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}>
                  <option value="">—</option>
                  {DISTRICTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Вес на взвешивании, кг (можно позже)" error={err.weight}>
              <input className="field font-mono" inputMode="decimal" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} placeholder="79,4" />
            </Field>
            <Field label="Руки" error={err.hands}>
              <div className="flex gap-2">
                {(["left", "right"] as Hand[]).map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => toggleHand(h)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors",
                      f.hands.includes(h) ? "border-primary bg-primary/15 text-foreground" : "border-line text-panel-muted",
                    )}
                  >
                    <Icon name={f.hands.includes(h) ? "CheckCircle2" : "Circle"} size={16} />
                    {h === "right" ? "Правая" : "Левая"}
                  </button>
                ))}
              </div>
            </Field>
            <button type="submit" className="btn-blue mt-2 w-full py-3.5">
              <Icon name="UserPlus" size={18} /> Зарегистрировать
            </button>
          </div>
        </div>
      </form>

      <div className="flex min-w-0 flex-col gap-3">
        <div className={cn("grid gap-3", needAdmit ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
          <Stat label="заявлено" value={athletes.length} />
          <Stat label="взвешено" value={weighed} />
          <Stat label="ждут весов" value={athletes.length - weighed} accent={athletes.length - weighed > 0} />
          {needAdmit && <Stat label="не допущены" value={notAdmitted} accent={notAdmitted > 0} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-muted" />
            <input className="field !rounded-full pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по фамилии, команде, городу" />
          </div>
          {(
            [
              ["all", "Все"],
              ["pending", "Без веса"],
              ["weighed", "Взвешены"],
              ...(needAdmit ? [["noadmit", "Без допуска"] as const] : []),
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn("pill", filter === k && "pill-on")}>
              {l}
            </button>
          ))}
        </div>

        <div className="win flex-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-panel-muted">
                  <th className="px-4 py-3 font-normal">участник</th>
                  <th className="px-2 py-3 font-normal">д.р. · звание</th>
                  <th className="px-2 py-3 font-normal">команда · город · округ</th>
                  <th className="px-2 py-3 font-normal">вес, кг</th>
                  <th className="px-2 py-3 font-normal">категория</th>
                  <th className="px-2 py-3 font-normal">руки</th>
                  {needAdmit && <th className="px-2 py-3 font-normal">допуск</th>}
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <Row
                    key={a.id}
                    a={a}
                    classLabel={(() => {
                      const c = classOf(a, groups, year, tournament.tolerance ?? 0);
                      return c ? `${classMap[c.key]?.groupName} · ${c.label}` : a.weight == null ? "после взвешивания" : "нет подходящей";
                    })()}
                    hint={weightHint(a, groups, year, tournament)}
                    canAbs={(() => {
                      const c = classOf(a, groups, year, tournament.tolerance ?? 0);
                      return !!groups.find((g) => g.id === c?.groupId)?.absolute;
                    })()}
                    needAdmit={needAdmit}
                    onPatch={(p) => updateAthlete(a.id, p)}
                    onOut={(r) => withdraw(a.id, r)}
                    onWeight={(w) => updateAthlete(a.id, { weight: w })}
                    onHands={(h) => updateAthlete(a.id, { hands: h })}
                    onRemove={() => removeAthlete(a.id)}
                  />
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-panel-muted">
                      Никого не найдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-foreground/70">
          После изменения веса, рук, категории или допуска заново проведите жеребьёвку этой категории в разделе «Сетка».
          {(tournament.tolerance ?? 0) > 0 && ` Провес при допуске в категорию: ${String(tournament.tolerance).replace(".", ",")} кг (п. 8.8).`}
        </p>
      </div>
    </div>
  );
}

/** Подсказка по весу: провес, заявка выше, нет допуска. */
function weightHint(a: Athlete, groups: AgeGroup[], year: number, t: Tournament): string {
  if (a.weight == null) return "";
  const tol = t.tolerance ?? 0;
  const strict = classOf({ ...a, upClass: false }, groups, year, 0);
  const withTol = classOf({ ...a, upClass: false }, groups, year, tol);
  const parts: string[] = [];
  if (strict && withTol && strict.key !== withTol.key && withTol.limit != null)
    parts.push(`провес ${(a.weight - withTol.limit).toFixed(2).replace(".", ",")} кг — допущен`);
  if (a.upClass) parts.push("заявлен на категорию выше");
  if (a.absolute) parts.push("+ абсолютная");
  return parts.join(" · ");
}

function Row({
  a,
  classLabel,
  hint,
  canAbs,
  needAdmit,
  onWeight,
  onHands,
  onRemove,
  onPatch,
  onOut,
}: {
  a: Athlete;
  classLabel: string;
  hint: string;
  canAbs: boolean;
  needAdmit: boolean;
  onWeight: (w: number | null) => void;
  onHands: (h: Hand[]) => void;
  onRemove: () => void;
  onPatch: (p: Partial<Athlete>) => void;
  onOut: (r: OutReason | null) => void;
}) {
  const [w, setW] = useState(a.weight == null ? "" : String(a.weight).replace(".", ","));
  const commit = () => {
    const v = w.trim() ? parseFloat(w.replace(",", ".")) : null;
    if (v != null && (!Number.isFinite(v) || v < 25 || v > 250)) {
      setW(a.weight == null ? "" : String(a.weight).replace(".", ","));
      return;
    }
    if (v !== a.weight) onWeight(v);
  };
  return (
    <tr className={cn("border-b border-line/70 last:border-0 hover:bg-surface/60", a.out && "opacity-60")}>
      <td className="px-4 py-2.5 font-medium">
        {a.name}
        <span className="ml-2 font-mono text-xs text-panel-muted">{a.gender === "M" ? "М" : "Ж"}</span>
        {a.out && (
          <div className="flex items-center gap-2 text-xs font-normal text-corner-red">
            {OUT_LABEL[a.out.reason]}
            <button className="text-panel-muted underline" onClick={() => onOut(null)} title="Вернуть в соревнования (уже засчитанные поражения останутся)">
              вернуть
            </button>
          </div>
        )}
      </td>
      <td className="px-2 py-2.5 font-mono text-panel-muted">
        {fmtBirth(a)}
        {a.rank && <div className="font-sans text-xs">{a.rank}</div>}
      </td>
      <td className="px-2 py-2.5 text-panel-muted">
        {a.club || "—"} · {a.city || "—"}
        {a.district && <div className="text-xs">{a.district}</div>}
      </td>
      <td className="px-2 py-2.5">
        <input
          value={w}
          onChange={(e) => setW(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="взвесить"
          inputMode="decimal"
          className={cn(
            "h-8 w-24 rounded-full border bg-surface px-3 font-mono text-sm outline-none focus:border-primary",
            a.weight == null ? "border-corner-red/50 placeholder:text-corner-red/70" : "border-line",
          )}
          title={a.weight != null ? `${fmtKg(a.weight)} кг` : "Введите вес и нажмите Enter"}
        />
      </td>
      <td className="px-2 py-2.5 text-panel-muted">
        {classLabel}
        {hint && <div className="text-xs text-primary">{hint}</div>}
        <div className="mt-1 flex flex-wrap gap-1">
          <button
            className={cn("rounded-full px-2 py-0.5 text-[11px]", a.upClass ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted hover:text-foreground")}
            onClick={() => onPatch({ upClass: !a.upClass })}
            title="Заявка на одну категорию выше (п. 8.9 Правил)"
          >
            ↑ выше
          </button>
          {canAbs && (
            <button
              className={cn("rounded-full px-2 py-0.5 text-[11px]", a.absolute ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted hover:text-foreground")}
              onClick={() => onPatch({ absolute: !a.absolute })}
              title="Участвует также в абсолютном первенстве"
            >
              абсолют
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex gap-1">
          {(["left", "right"] as Hand[]).map((h) => (
            <button
              key={h}
              onClick={() => onHands(a.hands.includes(h) ? a.hands.filter((x) => x !== h) : [...a.hands, h])}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                a.hands.includes(h) ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted",
              )}
            >
              {HAND_LABEL[h]}
            </button>
          ))}
        </div>
      </td>
      {needAdmit && (
        <td className="px-2 py-2.5">
          <div className="flex gap-1">
            {(
              [
                ["med", "врач", "Допуск врача"],
                ["ins", "страх.", "Страховка"],
                ["mandate", "мандат", "Комиссия по допуску (мандатная)"],
              ] as const
            ).map(([k, l, t]) => {
              const on = !!a.admit?.[k];
              return (
                <button
                  key={k}
                  title={t}
                  onClick={() => onPatch({ admit: { ...(a.admit ?? {}), [k]: !on } })}
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-medium",
                    on ? "bg-tip text-tip-foreground" : "border border-corner-red/40 text-corner-red/80",
                  )}
                >
                  {on ? "✓ " : ""}
                  {l}
                </button>
              );
            })}
          </div>
        </td>
      )}
      <td className="px-2 py-2.5 text-right">
        <button onClick={onRemove} className="rounded-full p-1.5 text-panel-muted hover:bg-destructive/20 hover:text-corner-red" aria-label="Удалить">
          <Icon name="Trash2" size={16} />
        </button>
      </td>
    </tr>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={cn("font-mono text-xs", error ? "text-corner-red" : "text-panel-muted")}>{error || label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-panel px-4 py-3">
      <div className={cn("text-3xl font-medium tracking-tight", accent && "text-corner-red")}>{value}</div>
      <div className="cat mt-0.5">{label}</div>
    </div>
  );
}
