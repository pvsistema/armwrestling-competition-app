import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { readTournamentFile, saveTournamentFile } from "@/lib/tournamentFile";
import { toast } from "@/hooks/use-toast";

export default function TournamentFileButtons() {
  const { exportData, importData } = useStore();
  const input = useRef<HTMLInputElement>(null);

  const onSave = () => {
    saveTournamentFile(exportData());
    toast({ title: "Турнир сохранён в файл", description: "Перенесите файл на другой компьютер и откройте его там." });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const data = await readTournamentFile(file);
      if (!confirm(`Открыть турнир «${data.tournament.name || "без названия"}»? Текущие данные на этом компьютере будут заменены.`)) return;
      importData(data);
      toast({
        title: "Турнир загружен",
        description: `Участников: ${data.athletes.length}, схваток проведено: ${data.matches.filter((m) => m.winner).length}`,
      });
    } catch (err) {
      toast({ title: "Не удалось открыть файл", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <>
      <button className="pill" onClick={onSave}>
        <Icon name="Download" size={15} /> Сохранить в файл
      </button>
      <button className="pill" onClick={() => input.current?.click()}>
        <Icon name="FolderOpen" size={15} /> Открыть из файла
      </button>
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
    </>
  );
}
