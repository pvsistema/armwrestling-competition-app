import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { FarBase, fmtFarBirth, loadFar, onFarChange } from "@/lib/farPassports";
import { SyncProgress, syncFar } from "@/lib/farSync";

/** Кнопка «Обновить базу ФАР»: скачивает свежие паспорта с сайта федерации. */
export default function FarUpdateButton() {
  const [base, setBase] = useState<FarBase | null>(null);
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<SyncProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFar().then(setBase, () => {});
    return onFarChange(setBase);
  }, []);

  const run = async () => {
    setBusy(true);
    setError("");
    setProg(null);
    try {
      const r = await syncFar(full, setProg);
      toast({
        title: `База ФАР обновлена: ${r.total.toLocaleString("ru")} спортсменов`,
        description: [r.added && `новых: ${r.added}`, r.removed && `исключено: ${r.removed}`, r.siteUpdated && `данные сайта на ${r.siteUpdated}`]
          .filter(Boolean)
          .join(" · "),
      });
      setOpen(false);
    } catch (e) {
      setError((e as Error).message || "Не удалось обновить базу");
    } finally {
      setBusy(false);
    }
  };

  const pct = prog && prog.total ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <>
      <button
        type="button"
        className="pill"
        onClick={() => setOpen(true)}
        title={base ? `База ФАР: ${base.list.length} чел., обновлена ${fmtFarBirth(base.updated)}` : "База паспортов ФАР"}
      >
        <Icon name="RefreshCw" size={15} /> Обновить базу ФАР
      </button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Обновить базу паспортов ФАР</DialogTitle>
            <DialogDescription>Свежие данные с сайта baza.armwrestling-ru.ru. Нужен интернет; после обновления база работает без сети.</DialogDescription>
          </DialogHeader>

          {base && (
            <div className="rounded-[12px] bg-surface px-3 py-2.5 text-sm">
              Сейчас: <b>{base.list.length.toLocaleString("ru")}</b> спортсменов, обновлена {fmtFarBirth(base.updated)}
              {base.siteUpdated && <span className="text-panel-muted"> (сайт: {base.siteUpdated})</span>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(
              [
                [false, "Быстро — несколько секунд", "Новые спортсмены и переходы между регионами. Разряды и даты рождения — только у новых."],
                [true, "Полностью — около минуты", "Перечитать карточки всех спортсменов: свежие разряды и даты рождения."],
              ] as const
            ).map(([v, t, d]) => (
              <button
                key={String(v)}
                type="button"
                disabled={busy}
                onClick={() => setFull(v)}
                className={cn(
                  "flex items-start gap-2 rounded-[12px] border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
                  full === v ? "border-primary bg-primary/10" : "border-line hover:bg-surface",
                )}
              >
                <Icon name={full === v ? "CircleDot" : "Circle"} size={17} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-medium">{t}</span>
                  <span className="block text-xs text-panel-muted">{d}</span>
                </span>
              </button>
            ))}
          </div>

          {busy && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-panel-muted">
                <span>{prog?.stage ?? "Подключение…"}</span>
                <span className="font-mono">{prog ? `${prog.done} / ${prog.total}` : ""}</span>
              </div>
              <Progress value={pct} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-[12px] bg-corner-red/10 px-3 py-2.5 text-sm text-corner-red">
              <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" />
              <span>{error}. Текущая база не изменилась.</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" className="pill" disabled={busy} onClick={() => setOpen(false)}>
              Закрыть
            </button>
            <button type="button" className="btn-blue" disabled={busy} onClick={run}>
              <Icon name={busy ? "Loader2" : "Download"} size={16} className={busy ? "animate-spin" : ""} />
              {busy ? "Обновляю…" : "Обновить"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
