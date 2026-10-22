import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { HAND_LABEL, Hand } from "@/lib/arm";
import { EntryItem, IntakeTournament, RepAthlete, ageOn, cab, fitFor, fmtD, insuranceOk, lastDay } from "@/lib/cabinet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Sel {
  classKey: string;
  hands: Hand[];
  absolute: boolean;
  adult: boolean;
}

interface Props {
  t: IntakeTournament;
  athletes: RepAthlete[];
  sent: { items: EntryItem[]; version: number; submitted_at: string } | null;
  onSent: () => void;
  onBack: () => void;
}

export default function RepEntry({ t, athletes, sent, onSent, onBack }: Props) {
  const [sel, setSel] = useState<Record<number, Sel>>(() => {
    const s: Record<number, Sel> = {};
    for (const it of sent?.items ?? []) {
      const a = athletes.find((x) => x.id === it.athlete.id);
      if (a?.id) s[a.id] = { classKey: it.classKey, hands: it.hands, absolute: !!it.absolute, adult: !!it.adult };
    }
    return s;
  });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "fit" | "chosen">("fit");

  const rows = useMemo(
    () =>
      athletes.map((a) => {
        const fit = fitFor(a, t);
        const ins = insuranceOk(a, t);
        const reason = !a.birthDate ? "нет даты рождения" : !fit.group ? "нет подходящей возрастной группы" : !ins ? `страховка не действует на ${fmtD(lastDay(t))}` : "";
        return { a, fit, ins, reason, age: a.birthDate ? ageOn(a.birthDate, t) : null };
      }),
    [athletes, t],
  );

  const chosen = rows.filter((r) => r.a.id && sel[r.a.id]);
  const shown = rows.filter((r) => (filter === "all" ? true : filter === "fit" ? !r.reason : !!sel[r.a.id!]));

  const toggle = (id: number, first: string) =>
    setSel((s) => {
      const n = { ...s };
      if (n[id]) delete n[id];
      else n[id] = { classKey: first, hands: ["left", "right"], absolute: false, adult: false };
      return n;
    });
  const patch = (id: number, p: Partial<Sel>) => setSel((s) => ({ ...s, [id]: { ...s[id], ...p } }));

  const submit = async () => {
    const items: EntryItem[] = chosen.map(({ a, fit }) => {
      const s = sel[a.id!];
      const c = fit.classes.find((x) => x.key === s.classKey);
      return { athlete: a, classKey: s.classKey, classLabel: `${fit.group?.name ?? ""} · ${c?.label ?? ""}`, hands: s.hands, absolute: s.absolute || undefined, adult: s.adult || undefined };
    });
    if (items.some((i) => !i.hands.length)) return toast({ title: "У каждого спортсмена отметьте хотя бы одну руку", variant: "destructive" });
    setBusy(true);
    try {
      const r = await cab<{ version: number }>("entry_submit", { intake_id: t.id, items });
      toast({ title: r.version > 1 ? "Изменённая заявка отправлена" : "Заявка отправлена главному секретарю", description: `Спортсменов: ${items.length}` });
      onSent();
    } catch (e) {
      toast({ title: "Не отправлено", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button className="pill" onClick={onBack}>
          <Icon name="ArrowLeft" size={15} /> Назад
        </button>
        <div className="mr-auto">
          <div className="text-xl font-semibold">{t.name || "Турнир"}</div>
          <div className="text-sm text-panel-muted">
            {[fmtD(t.date) + (t.dateEnd ? ` – ${fmtD(t.dateEnd)}` : ""), t.place].filter(Boolean).join(" · ")}
          </div>
        </div>
        {sent && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
            Отправлена {new Date(sent.submitted_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            {sent.version > 1 && ` · версия ${sent.version}`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["fit", "Подходят"],
            ["chosen", `В заявке (${chosen.length})`],
            ["all", "Все спортсмены"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={cn("pill !py-1.5", filter === k && "pill-on")} onClick={() => setFilter(k)}>
            {l}
          </button>
        ))}
      </div>

      <div className="win">
        {shown.map(({ a, fit, reason, age }) => {
          const s = sel[a.id!];
          return (
            <div key={a.id} className={cn("flex flex-col gap-2 border-b border-line px-4 py-3 last:border-0", s && "bg-primary/5", reason && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[hsl(var(--primary))]"
                  checked={!!s}
                  disabled={!!reason}
                  onChange={() => toggle(a.id!, fit.classes[0]?.key ?? "")}
                />
                <span className="font-medium">{a.name}</span>
                <span className="text-sm text-panel-muted">
                  {fmtD(a.birthDate)} · {age} лет{fit.group ? ` · ${fit.group.name}` : ""}
                </span>
                {reason && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">{reason}</span>}
              </div>
              {s && (
                <div className="ml-8 flex flex-wrap items-center gap-2">
                  <select className="field !w-auto !py-1.5" value={s.classKey} onChange={(e) => patch(a.id!, { classKey: e.target.value })}>
                    {fit.classes.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {(["left", "right"] as Hand[]).map((h) => (
                    <button
                      key={h}
                      className={cn("pill !px-3 !py-1.5 text-xs", s.hands.includes(h) && "pill-on")}
                      onClick={() => patch(a.id!, { hands: s.hands.includes(h) ? s.hands.filter((x) => x !== h) : [...s.hands, h] })}
                    >
                      {HAND_LABEL[h]}
                    </button>
                  ))}
                  {fit.group?.absolute && (
                    <button className={cn("pill !px-3 !py-1.5 text-xs", s.absolute && "pill-on")} onClick={() => patch(a.id!, { absolute: !s.absolute })}>
                      + абсолютная
                    </button>
                  )}
                  {fit.adult && (
                    <button className={cn("pill !px-3 !py-1.5 text-xs", s.adult && "pill-on")} onClick={() => patch(a.id!, { adult: !s.adult })}>
                      + {fit.adult.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!shown.length && (
          <div className="p-8 text-center text-panel-muted">
            {filter === "chosen" ? "Отметьте спортсменов галочкой" : athletes.length ? "Нет подходящих спортсменов" : "Сначала добавьте спортсменов во вкладке «Мои спортсмены»"}
          </div>
        )}
      </div>

      <div className="sticky bottom-2 flex flex-wrap items-center gap-3 rounded-full border border-line bg-panel px-4 py-2 shadow-lg">
        <span className="text-sm">
          В заявке: <b>{chosen.length}</b>
        </span>
        <span className="hidden text-xs text-panel-muted sm:inline">Весовая категория — заявленная, окончательно определяется на взвешивании</span>
        {sent && (
          <button
            className="pill ml-auto !py-1.5 text-xs text-corner-red"
            onClick={async () => {
              if (!confirm("Отозвать заявку целиком?")) return;
              await cab("entry_withdraw", { intake_id: t.id }).catch(() => {});
              onSent();
            }}
          >
            Отозвать
          </button>
        )}
        <button className={cn("btn-blue !py-2", !sent && "ml-auto")} disabled={busy || !chosen.length} onClick={submit}>
          <Icon name="Send" size={16} /> {sent ? "Отправить изменения" : "Отправить секретарю"}
        </button>
      </div>
    </div>
  );
}
