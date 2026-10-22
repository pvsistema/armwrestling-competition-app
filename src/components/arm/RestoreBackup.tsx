import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import type { State } from "@/lib/store";
import { BackupFile, FOLDERS, askFolder, folderReady, listBackups, saveQuiet } from "@/lib/saveFolder";
import { readTournamentFile, tournamentBlob } from "@/lib/tournamentFile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const OPEN_RESTORE = "armsport-open-restore";
const SKIP = "armsport-restore-checked";

type Info = { file: BackupFile; data: State };

const stats = (s: State) => ({
  athletes: s.athletes.length,
  brackets: s.brackets.length,
  done: s.matches.filter((m) => m.winner).length,
});

const when = (t: number) =>
  new Date(t).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const same = (a: State, b: State) =>
  JSON.stringify([a.athletes, a.brackets, a.matches, a.tournament]) === JSON.stringify([b.athletes, b.brackets, b.matches, b.tournament]);

/** После сбоя: сравнивает текущие данные с последней автокопией и предлагает восстановить. */
export default function RestoreBackup() {
  const { exportData, importData } = useStore();
  const [ask, setAsk] = useState(false);
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const [list, setList] = useState<BackupFile[]>([]);
  const [best, setBest] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(
    async (manual: boolean) => {
      const files = await listBackups();
      setList(files);
      if (!files.length) {
        if (manual) setOpen(true);
        return;
      }
      let info: Info | null = null;
      try {
        info = { file: files[0], data: await readTournamentFile(await files[0].read()) };
      } catch {
        info = null;
      }
      setBest(info);
      if (manual) {
        setAuto(false);
        setOpen(true);
        return;
      }
      if (!info) return;
      const cur = exportData();
      if (same(cur, info.data)) return;
      const c = stats(cur);
      const b = stats(info.data);
      const changedAt = Number(localStorage.getItem("armsport-v1:changedAt") || 0);
      const lost = c.athletes === 0 && b.athletes > 0;
      const behind = b.done > c.done || b.brackets > c.brackets || b.athletes > c.athletes;
      const newer = info.file.at > changedAt + 60000;
      const clearedAt = Number(localStorage.getItem("armsport-v1:clearedAt") || 0);
      if (info.file.at < clearedAt) return;
      if (lost || (behind && newer)) {
        setAuto(true);
        setOpen(true);
      }
    },
    [exportData],
  );

  useEffect(() => {
    if (sessionStorage.getItem(SKIP)) return;
    sessionStorage.setItem(SKIP, "1");
    (async () => {
      const r = await folderReady();
      if (r === "ok") check(false);
      else if (r === "ask") setAsk(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = async () => {
      if ((await folderReady()) === "ask" && !(await askFolder())) return;
      check(true);
    };
    window.addEventListener(OPEN_RESTORE, h);
    return () => window.removeEventListener(OPEN_RESTORE, h);
  }, [check]);

  const restore = async (f: BackupFile) => {
    setBusy(true);
    try {
      const data = await readTournamentFile(await f.read());
      const cur = exportData();
      if (cur.athletes.length && !same(cur, data)) {
        const d = new Date();
        const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}-${String(d.getMinutes()).padStart(2, "0")}`;
        await saveQuiet(tournamentBlob(cur), `Перед восстановлением_${stamp}.armsport.json`, FOLDERS.backup).catch(() => null);
      }
      importData(data);
      const s = stats(data);
      toast({
        title: "Турнир восстановлен",
        description: `Копия от ${when(f.at)} · участников ${s.athletes}, проведено схваток ${s.done}`,
      });
      setOpen(false);
    } catch (e) {
      toast({ title: "Не удалось восстановить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const cur = stats(exportData());

  return (
    <>
      {ask && (
        <div className="win flex-row flex-wrap items-center gap-3 border-2 border-primary/40 px-4 py-3 print:hidden">
          <Icon name="ShieldQuestion" size={20} className="text-primary" />
          <span className="flex-1 text-sm">
            Программа перезапускалась. Проверить, нет ли в папке турнира более свежей автокопии?
          </span>
          <button
            className="btn-blue !py-2 text-sm"
            onClick={async () => {
              setAsk(false);
              if (await askFolder()) check(false);
            }}
          >
            <Icon name="FolderSearch" size={15} /> Проверить
          </button>
          <button className="pill !py-2 text-sm" onClick={() => setAsk(false)}>
            Не нужно
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Icon name={auto ? "LifeBuoy" : "History"} size={22} className="text-primary" />
              {auto ? "Найдена более свежая копия турнира" : "Восстановить из копии"}
            </DialogTitle>
            <DialogDescription>
              {auto
                ? "Похоже, программа закрылась со сбоем или данные браузера были очищены. В папке турнира есть копия, где проведено больше."
                : "Выберите копию. Текущие данные перед заменой сохранятся в «Копии турнира» с пометкой «Перед восстановлением»."}
            </DialogDescription>
          </DialogHeader>

          {best && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-line px-3 py-2">
                <div className="cat mb-1">сейчас на компьютере</div>
                <div>Участников: {cur.athletes}</div>
                <div>Категорий: {cur.brackets}</div>
                <div>Схваток: {cur.done}</div>
              </div>
              <div className="rounded-lg border-2 border-primary px-3 py-2">
                <div className="cat mb-1">копия от {when(best.file.at)}</div>
                <div>Участников: {stats(best.data).athletes}</div>
                <div>Категорий: {stats(best.data).brackets}</div>
                <div className="font-semibold">Схваток: {stats(best.data).done}</div>
              </div>
            </div>
          )}

          {!list.length && <div className="text-sm text-panel-muted">В папке «{FOLDERS.backup}» пока нет копий.</div>}

          {best && (
            <button className="btn-blue" disabled={busy} onClick={() => restore(best.file)}>
              <Icon name={busy ? "Loader2" : "RotateCcw"} size={16} className={busy ? "animate-spin" : ""} /> Восстановить копию от {when(best.file.at)}
            </button>
          )}

          {list.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-panel-muted">Другие копии ({list.length - 1})</summary>
              <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-auto">
                {list.slice(1).map((f) => (
                  <button
                    key={f.name}
                    disabled={busy}
                    onClick={() => confirm(`Восстановить копию от ${when(f.at)}?`) && restore(f)}
                    className={cn("flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left hover:bg-surface")}
                  >
                    <span>{when(f.at)}</span>
                    <span className="truncate text-xs text-panel-muted">{f.name.startsWith("Автокопия") ? "авто" : f.name.startsWith("Перед") ? "перед восстановлением" : "вручную"}</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          <button className="pill self-end" onClick={() => setOpen(false)}>
            {auto ? "Оставить текущие данные" : "Закрыть"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
