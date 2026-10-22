import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { askUpgrade, deviceId, useLicense } from "@/lib/license";
import { Entry, cab, fmtD, toProgram } from "@/lib/cabinet";
import { HAND_LABEL, uid } from "@/lib/arm";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();

export default function IntakePanel() {
  const { tournament, groups, athletes, addAthletes, setTournament } = useStore();
  const { license, full } = useLicense();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ open: boolean } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<number | null>(null);

  const auth = useCallback(() => ({ key: license?.key ?? "", device: deviceId(), t_uid: tournament.uid ?? "" }), [license, tournament.uid]);

  const load = useCallback(
    async (imported?: Record<number, number>) => {
      if (!full || !tournament.uid) return;
      try {
        const r = await cab<{ intake: { open: boolean } | null; entries: Entry[] }>("intake_get", { ...auth(), imported });
        setState(r.intake);
        setEntries(r.entries);
      } catch {
        /* нет связи */
      }
    },
    [full, tournament.uid, auth],
  );

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const publish = async () => {
    if (!tournament.name || !tournament.date) return toast({ title: "Укажите название и дату турнира в разделе «Категории»", variant: "destructive" });
    if (!groups.length) return toast({ title: "Сначала задайте возрастные и весовые категории", variant: "destructive" });
    setBusy(true);
    let t_uid = tournament.uid;
    if (!t_uid) {
      t_uid = uid() + uid();
      setTournament({ uid: t_uid });
    }
    try {
      await cab("intake_open", {
        ...auth(),
        t_uid,
        tournament: {
          name: tournament.name,
          date: tournament.date,
          dateEnd: tournament.dateEnd,
          place: tournament.place,
          groups,
          tolerance: tournament.tolerance,
        },
      });
      toast({ title: state?.open ? "Категории в кабинетах обновлены" : "Приём заявок открыт", description: "Турнир появился в кабинетах представителей." });
      setState({ open: true });
      load();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const close = async () => {
    if (!confirm("Закрыть приём заявок? Представители больше не смогут подавать и менять заявки.")) return;
    await cab("intake_close", auth()).catch(() => {});
    load();
  };

  const importEntry = (e: Entry) => {
    const have = new Set(athletes.map((a) => `${norm(a.name)}|${a.birthYear}`));
    const list = e.items.map((it) => toProgram(it, e.team));
    const fresh = list.filter((a) => !have.has(`${norm(a.name)}|${a.birthYear}`));
    if (fresh.length) addAthletes(fresh);
    toast({
      title: `${e.team}: загружено ${fresh.length}`,
      description: list.length - fresh.length ? `Уже были в списке: ${list.length - fresh.length}` : "Вес вносится на взвешивании.",
    });
    return { [e.rep_id]: e.version };
  };

  const pending = entries.filter((e) => e.imported_version < e.version);

  return (
    <>
      <button
        className={cn("pill", pending.length > 0 && "!border-gold")}
        onClick={() => (full ? setOpen(true) : askUpgrade("Приём заявок от представителей команд доступен в полной версии."))}
      >
        <Icon name="Inbox" size={16} /> Заявки представителей
        {pending.length > 0 && <span className="rounded-full bg-gold px-2 text-xs font-semibold text-gold-foreground">{pending.length}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Inbox" size={20} className="text-gold" /> Заявки представителей
            </DialogTitle>
            <DialogDescription>
              {state?.open
                ? "Приём открыт — турнир виден в кабинетах представителей."
                : state
                  ? "Приём закрыт."
                  : "Откройте приём — турнир с вашими категориями появится в кабинетах представителей."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <button className="btn-blue !py-2.5" disabled={busy} onClick={publish}>
              <Icon name={state?.open ? "RefreshCw" : "DoorOpen"} size={16} /> {state?.open ? "Обновить категории" : "Открыть приём заявок"}
            </button>
            {state?.open && (
              <button className="pill" onClick={close}>
                <Icon name="DoorClosed" size={16} /> Закрыть приём
              </button>
            )}
            {pending.length > 1 && (
              <button
                className="btn-gold !py-2.5 sm:ml-auto"
                onClick={() => {
                  const imp = Object.assign({}, ...pending.map(importEntry));
                  load(imp);
                }}
              >
                <Icon name="Download" size={16} /> Загрузить все новые ({pending.length})
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {entries.map((e) => {
              const isNew = e.imported_version === 0;
              const changed = !isNew && e.imported_version < e.version;
              return (
                <div key={e.rep_id} className="rounded-lg border border-line">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <button className="flex items-center gap-1.5 font-medium" onClick={() => setView(view === e.rep_id ? null : e.rep_id)}>
                      <Icon name={view === e.rep_id ? "ChevronDown" : "ChevronRight"} size={16} />
                      {e.team || e.name}
                    </button>
                    <span className="text-sm text-panel-muted">
                      {e.name}
                      {e.phone && ` · ${e.phone}`}
                    </span>
                    <span className="text-sm">{e.items.length} чел.</span>
                    <span className="text-xs text-panel-muted">{new Date(e.submitted_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    {isNew && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-gold-foreground">новая</span>}
                    {changed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">изменена</span>}
                    {!isNew && !changed && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">загружена</span>}
                    <button className="pill ml-auto !px-3 !py-1.5 text-xs" onClick={() => load(importEntry(e))}>
                      <Icon name="Download" size={14} /> {isNew ? "Загрузить" : "Загрузить ещё раз"}
                    </button>
                  </div>
                  {view === e.rep_id && (
                    <table className="w-full border-t border-line text-xs">
                      <tbody>
                        {e.items.map((it, i) => (
                          <tr key={i} className="border-b border-line/60 last:border-0">
                            <td className="px-3 py-1.5 text-panel-muted">{i + 1}</td>
                            <td className="px-2 py-1.5 font-medium">{it.athlete.name}</td>
                            <td className="px-2 py-1.5">{fmtD(it.athlete.birthDate)}</td>
                            <td className="px-2 py-1.5">{it.athlete.rank}</td>
                            <td className="px-2 py-1.5">{it.classLabel}</td>
                            <td className="px-2 py-1.5">{it.hands.map((h) => HAND_LABEL[h]).join(", ")}</td>
                            <td className="px-2 py-1.5 font-mono">
                              полис {it.athlete.insNum} до {fmtD(it.athlete.insTo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {state && !entries.length && <div className="p-6 text-center text-sm text-panel-muted">Заявок пока нет</div>}
          </div>
          <p className="text-xs text-panel-muted">
            При загрузке спортсмены попадают в список участников с отметкой страховки; повторно одних и тех же (ФИО + год рождения) программа не добавляет. Вес вносится на
            взвешивании.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
