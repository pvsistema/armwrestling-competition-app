import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadFar } from "@/lib/farPassports";
import { FarDiff, RepAthlete, cab, farDiff } from "@/lib/cabinet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function RepFarSync({ list, reload }: { list: RepAthlete[]; reload: () => void }) {
  const [res, setRes] = useState<{ diffs: FarDiff[]; ok: number; missing: RepAthlete[]; none: number } | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const base = await loadFar();
      const diffs: FarDiff[] = [];
      const missing: RepAthlete[] = [];
      let ok = 0;
      let none = 0;
      for (const a of list) {
        const d = farDiff(a, base);
        if (d === "missing") missing.push(a);
        else if (!d) none++;
        else if (d.changes.length) diffs.push(d);
        else ok++;
      }
      setSkip(new Set());
      setRes({ diffs, ok, missing, none });
    } catch {
      toast({ title: "База паспортов ФАР недоступна", description: "Проверьте интернет и попробуйте ещё раз.", variant: "destructive" });
    }
    setBusy(false);
  };

  const apply = async () => {
    if (!res) return;
    const items = res.diffs.filter((_, i) => !skip.has(i)).map((d) => d.next);
    if (!items.length) return setRes(null);
    setBusy(true);
    try {
      const r = await cab<{ updated: number }>("athletes_bulk", { athletes: items });
      toast({ title: `Обновлено по базе ФАР: ${r.updated}` });
      setRes(null);
      reload();
    } catch (e) {
      toast({ title: "Не сохранено", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const toggle = (i: number) =>
    setSkip((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <>
      <button className="pill" onClick={run} disabled={busy || !list.length} title="Найти спортсменов в базе паспортов ФАР и дополнить их данные">
        <Icon name={busy ? "Loader2" : "BadgeCheck"} size={16} className={busy ? "animate-spin" : ""} /> Сверить с базой ФАР
      </button>
      <Dialog open={!!res} onOpenChange={(o) => !o && setRes(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-line px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-medium">
              <Icon name="BadgeCheck" size={20} className="text-primary" /> Сверка с базой паспортов ФАР
            </DialogTitle>
            <DialogDescription>
              Совпадают с базой: {res?.ok ?? 0} · можно дополнить: {res?.diffs.length ?? 0}
              {res?.missing.length ? ` · номер паспорта не найден: ${res.missing.length}` : ""}
              {res?.none ? ` · нет в базе: ${res.none}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[58vh] flex-col overflow-auto">
            {res?.diffs.map((d, i) => (
              <button
                key={d.a.id}
                onClick={() => toggle(i)}
                className={cn("flex items-start gap-3 border-b border-line/60 px-6 py-3 text-left hover:bg-surface/60", skip.has(i) && "opacity-45")}
              >
                <Icon name={skip.has(i) ? "Square" : "SquareCheck"} size={18} className={cn("mt-0.5 shrink-0", !skip.has(i) && "text-primary")} />
                <div>
                  <div className="font-medium">
                    {d.a.name}
                    {d.by === "name" && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-800">найден по ФИО — проверьте</span>}
                  </div>
                  <div className="text-sm text-panel-muted">{d.changes.join(" · ")}</div>
                </div>
              </button>
            ))}
            {res?.missing.map((a) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-line/60 px-6 py-3">
                <Icon name="BadgeAlert" size={18} className="mt-0.5 shrink-0 text-corner-red" />
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-corner-red">Паспорта № {a.farId} нет в базе — проверьте номер или обновите базу</div>
                </div>
              </div>
            ))}
            {res && !res.diffs.length && !res.missing.length && (
              <div className="p-8 text-center text-panel-muted">{res.ok ? "Все данные совпадают с базой ФАР" : "Ваших спортсменов нет в базе паспортов ФАР"}</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
            <span className="text-xs text-panel-muted">Страховка, тренер и город не меняются.</span>
            <button className="pill ml-auto" onClick={() => setRes(null)}>
              Закрыть
            </button>
            {!!res?.diffs.length && (
              <button className="btn-blue" disabled={busy || skip.size === res.diffs.length} onClick={apply}>
                <Icon name="RefreshCw" size={16} /> Обновить {res.diffs.length - skip.size}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
