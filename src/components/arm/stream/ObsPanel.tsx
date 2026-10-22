import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { newObsKey, obsKey, obsOn, obsUrl, setObsOn, usePublishOverlay } from "@/lib/overlayBar";
import { useStreams } from "@/lib/streams";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EVT = "armsport-obs-toggle";
function useObsOn(): [boolean, (v: boolean) => void] {
  const [on, set] = useState(obsOn);
  useEffect(() => {
    const f = () => set(obsOn());
    window.addEventListener(EVT, f);
    return () => window.removeEventListener(EVT, f);
  }, []);
  return [
    on,
    (v) => {
      setObsOn(v);
      window.dispatchEvent(new Event(EVT));
    },
  ];
}

/** Невидимый передатчик: работает в главном окне на любой вкладке, пока включён «Эфир в OBS». */
export function ObsPublisher() {
  const [on] = useObsOn();
  usePublishOverlay(on);
  return null;
}

/** Блок «Плашка для OBS»: ссылка для «Браузера» в OBS и включение передачи. */
export default function ObsPanel() {
  const { overlay } = useStreams();
  const [on, setOn] = useObsOn();
  const [key, setKey] = useState(obsKey);
  const url = obsUrl(key, overlay);
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Ссылка скопирована", description: "Вставьте её в OBS: Источники → + → Браузер → URL." });
    } catch {
      toast({ title: "Скопируйте ссылку вручную", description: url });
    }
  };

  return (
    <div className="win gap-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="Radio" size={17} className={on ? "text-corner-red" : "text-primary"} />
        <span className="text-sm font-medium">Плашка для OBS (эфир на YouTube / RUTUBE / VK)</span>
        <button
          className={cn("pill !py-1.5 text-sm", on && "!border-corner-red !bg-corner-red !text-white")}
          onClick={() => {
            setOn(!on);
            if (!on) toast({ title: "Плашка передаётся в OBS", description: "Работает, пока программа открыта — на любой вкладке." });
          }}
        >
          <span className={cn("h-2 w-2 rounded-full", on ? "animate-pulse bg-white" : "bg-panel-muted")} />
          {on ? "В эфире — выключить" : "Включить передачу"}
        </button>
        <button className="ml-auto text-xs text-panel-muted underline-offset-2 hover:underline" onClick={() => setOpen(!open)}>
          {open ? "скрыть инструкцию" : "как добавить в OBS"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="field !h-9 min-w-0 flex-1 font-mono text-xs" />
        <button className="btn-blue !py-2" onClick={copy}>
          <Icon name="Copy" size={15} /> Копировать
        </button>
        <a className="pill !py-2" href={url} target="_blank" rel="noreferrer" title="Открыть плашку для проверки">
          <Icon name="ExternalLink" size={15} />
        </a>
        <button
          className="pill !py-2"
          title="Новая ссылка — старая перестанет работать"
          onClick={() => {
            if (confirm("Создать новую ссылку? Старая ссылка в OBS перестанет показывать плашку.")) setKey(newObsKey());
          }}
        >
          <Icon name="RefreshCw" size={15} />
        </button>
      </div>
      {open && (
        <ol className="list-decimal space-y-1 rounded-[10px] bg-surface p-3 pl-7 text-xs leading-relaxed">
          <li>Нажмите «Включить передачу» и «Копировать».</li>
          <li>
            В OBS: <b>Источники → + → Браузер</b>. Вставьте ссылку в поле <b>URL</b>, ширина <b>1920</b>, высота <b>1080</b>. Галочку «Управлять звуком через OBS» можно не ставить.
          </li>
          <li>Источник «Браузер» должен стоять в списке выше камеры — тогда плашка будет поверх видео. Фон прозрачный.</li>
          <li>Положение (сверху/снизу) и размер (S/M/L) — кнопками выше; после смены скопируйте ссылку заново или поправьте её в OBS.</li>
          <li>Счёт обновляется раз в секунду, пока здесь открыта программа и включена передача. OBS может работать на другом компьютере.</li>
        </ol>
      )}
    </div>
  );
}
