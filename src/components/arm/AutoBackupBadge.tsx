import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { BACKUP_EVERY_MIN, useAutoBackup } from "@/lib/autoBackup";
import { folderSupported, pickFolder } from "@/lib/saveFolder";
import { cn } from "@/lib/utils";

const ago = (t: number, now: number) => {
  const m = Math.floor((now - t) / 60000);
  return m < 1 ? "только что" : `${m} мин назад`;
};

/** Значок автокопии в шапке: когда сохранено, куда, включить/выключить. */
export default function AutoBackupBadge() {
  const { exportData } = useStore();
  const { status, toggle, allow, saveNow } = useAutoBackup(exportData());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!folderSupported()) return null;

  const ok = status.on && status.folder === "ok" && !status.error;
  const warn = status.on && (status.folder !== "ok" || !!status.error);
  const text = !status.on
    ? "Автокопия выкл."
    : status.folder === "none"
      ? "Нет папки"
      : status.folder === "ask"
        ? "Нужен доступ"
        : status.lastAt
          ? `Копия ${ago(status.lastAt, now)}`
          : "Автокопия вкл.";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn("pill relative shrink-0 !px-3", warn && "!border-corner-red text-corner-red")}
          title={`Автокопия турнира: ${text}`}
          aria-label={`Автокопия турнира: ${text}`}
        >
          <Icon name={ok ? "ShieldCheck" : warn ? "ShieldAlert" : "Shield"} size={18} className={ok ? "text-primary" : ""} />
          {warn && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-corner-red" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3 text-sm">
        <div className="flex items-center justify-between font-medium">
          Автокопия турнира <span className={cn("text-xs font-normal", warn ? "text-corner-red" : "text-panel-muted")}>{text}</span>
        </div>
        <p className="text-xs leading-relaxed text-panel-muted">
          Каждые {BACKUP_EVERY_MIN} минут, если что-то изменилось, программа сохраняет копию в подпапку «Копии турнира». Хранятся последние 48 копий (12 часов). Открыть копию — «Открыть файл» в разделе «Участники».
        </p>
        {status.lastPath && (
          <div className="rounded-md bg-surface px-3 py-2 text-xs">
            Последняя: {status.lastAt ? ago(status.lastAt, now) : ""}
            <div className="mt-0.5 break-all text-panel-muted">{status.lastPath}</div>
          </div>
        )}
        {status.error && <div className="text-xs text-corner-red">Ошибка: {status.error}</div>}
        {status.on && status.folder === "none" && (
          <button className="btn-blue" onClick={() => pickFolder().then(allow).catch(() => undefined)}>
            <Icon name="FolderCog" size={16} /> Выбрать папку турнира
          </button>
        )}
        {status.on && status.folder === "ask" && (
          <button className="btn-blue" onClick={allow}>
            <Icon name="FolderCheck" size={16} /> Разрешить запись в папку
          </button>
        )}
        {status.on && status.folder === "ok" && (
          <button className="pill" onClick={saveNow}>
            <Icon name="Save" size={15} /> Сохранить копию сейчас
          </button>
        )}
        {status.folder !== "none" && (
          <button className="pill" onClick={() => window.dispatchEvent(new Event("armsport-open-restore"))}>
            <Icon name="History" size={15} /> Восстановить из копии…
          </button>
        )}
        <button className={cn("pill justify-start", status.on && "pill-on")} onClick={() => toggle(!status.on)}>
          <Icon name={status.on ? "SquareCheck" : "Square"} size={15} /> Автокопия каждые {BACKUP_EVERY_MIN} минут
        </button>
      </PopoverContent>
    </Popover>
  );
}
