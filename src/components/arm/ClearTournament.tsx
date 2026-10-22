import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { saveTournamentFile } from "@/lib/tournamentFile";
import { savedText } from "@/lib/saveFolder";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  onDone?: () => void;
  className?: string;
  label?: string;
}

/** Очистка турнира: все вкладки становятся пустыми для нового турнира. */
export default function ClearTournament({ onDone, className, label = "Очистить турнир" }: Props) {
  const store = useStore();
  const { athletes, brackets, matches, groups, tournament, clearTournament } = store;
  const [open, setOpen] = useState(false);
  const [backup, setBackup] = useState(true);
  const [keepGroups, setKeepGroups] = useState(false);
  const [keepStaff, setKeepStaff] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = matches.filter((m) => m.winner).length;
  const empty = !athletes.length && !brackets.length && !groups.length && !tournament.name;

  const run = async () => {
    setBusy(true);
    try {
      let saved = "";
      if (backup && !empty) {
        const r = await saveTournamentFile(store.exportData());
        saved = savedText(r);
      }
      clearTournament({ groups: keepGroups, staff: keepStaff });
      setOpen(false);
      toast({
        title: "Турнир очищен — можно начинать новый",
        description: saved ? `Копия прежнего турнира: ${saved}` : undefined,
      });
      onDone?.();
    } catch (e) {
      toast({ title: "Не удалось сохранить копию", description: `${(e as Error).message}. Турнир не очищен.`, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const Opt = ({ on, set, title, hint }: { on: boolean; set: (v: boolean) => void; title: string; hint: string }) => (
    <button
      type="button"
      onClick={() => set(!on)}
      className={cn(
        "flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
        on ? "border-primary bg-primary/10" : "border-line hover:bg-surface",
      )}
    >
      <Icon name={on ? "SquareCheck" : "Square"} size={17} className="mt-0.5 shrink-0 text-primary" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-panel-muted">{hint}</span>
      </span>
    </button>
  );

  return (
    <>
      <button className={cn("pill", className)} onClick={() => setOpen(true)}>
        <Icon name="Eraser" size={15} /> {label}
      </button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Очистить турнир?</DialogTitle>
            <DialogDescription>
              Все вкладки станут пустыми: название и даты, категории, участники, сетки, результаты схваток, протоколы, судьи, таймеры.
            </DialogDescription>
          </DialogHeader>

          {!empty && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["участников", athletes.length],
                ["сеток", brackets.length],
                ["схваток", done],
              ].map(([l, v]) => (
                <div key={l} className="rounded-[12px] bg-surface px-2 py-2">
                  <div className="text-xl font-semibold">{v}</div>
                  <div className="text-xs text-panel-muted">{l}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!empty && (
              <Opt
                on={backup}
                set={setBackup}
                title="Сохранить копию текущего турнира"
                hint="Файл турнира в папку «Копии турнира» — его можно открыть позже кнопкой «Открыть турнир»."
              />
            )}
            <Opt
              on={keepGroups}
              set={setKeepGroups}
              title="Оставить возрастные и весовые категории"
              hint="Если следующий турнир с теми же категориями."
            />
            <Opt
              on={keepStaff}
              set={setKeepStaff}
              title="Оставить судей и настройки"
              hint="Главный судья, секретарь, судейская коллегия, число столов, система, очки, переключатели ФАР."
            />
          </div>

          {!backup && !empty && (
            <div className="flex items-start gap-2 rounded-[12px] bg-corner-red/10 px-3 py-2.5 text-sm text-corner-red">
              <Icon name="TriangleAlert" size={16} className="mt-0.5 shrink-0" />
              Без копии данные текущего турнира будет не вернуть.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button className="pill" disabled={busy} onClick={() => setOpen(false)}>
              Отмена
            </button>
            <button className="btn-blue !bg-corner-red hover:!brightness-110" disabled={busy} onClick={run}>
              <Icon name={busy ? "Loader2" : "Eraser"} size={16} className={busy ? "animate-spin" : ""} />
              Очистить
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
