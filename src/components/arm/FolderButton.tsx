import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FOLDERS, folderSupported, forgetFolder, getFolder, onFolderChange, pickFolder } from "@/lib/saveFolder";
import { toast } from "@/hooks/use-toast";

/** Выбор папки турнира: протоколы и копии раскладываются по подпапкам. */
export default function FolderButton() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const load = () => getFolder().then((h) => setName(h?.name ?? null));
    load();
    return onFolderChange(load);
  }, []);

  if (!folderSupported())
    return (
      <span className="text-xs text-panel-muted" title="Выбор папки работает в Chrome, Edge и Яндекс Браузере, если программа открыта в отдельной вкладке">
        файлы сохраняются в «Загрузки»
      </span>
    );

  const choose = async () => {
    try {
      const h = await pickFolder();
      if (h)
        toast({
          title: `Папка турнира: ${h.name}`,
          description: `Протоколы будут раскладываться по подпапкам: ${Object.values(FOLDERS).join(", ")}.`,
        });
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast({ title: "Папку выбрать не удалось", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (!name)
    return (
      <button className="pill" onClick={choose} title="Один раз выберите папку — дальше все протоколы будут сохраняться туда, по подпапкам">
        <Icon name="FolderCog" size={15} /> Папка турнира
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="pill max-w-[260px]" title="Куда сохраняются протоколы">
          <Icon name="FolderCheck" size={15} className="shrink-0 text-primary" />
          <span className="truncate">Папка: {name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal text-panel-muted">
          Подпапки: {Object.values(FOLDERS).join(", ")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={choose}>
          <Icon name="FolderOpen" size={15} /> Выбрать другую папку
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await forgetFolder();
            toast({ title: "Папка турнира отключена", description: "Файлы снова будут сохраняться в «Загрузки»." });
          }}
        >
          <Icon name="FolderX" size={15} /> Сохранять в «Загрузки»
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
