import { useRef } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { readTournamentFile, saveTournamentFile } from "@/lib/tournamentFile";
import { toast } from "@/hooks/use-toast";
import { savedText, warmFolder } from "@/lib/saveFolder";
import FolderButton from "./FolderButton";

export default function TournamentFileButtons() {
  const { exportData, importData } = useStore();
  const input = useRef<HTMLInputElement>(null);

  const onSave = async () => {
    await warmFolder();
    const r = await saveTournamentFile(exportData());
    toast({ title: "Турнир сохранён в файл", description: `${savedText(r)}. Перенесите файл на другой компьютер и откройте его там.` });
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

  const onTest = async () => {
    if (!confirm("Загрузить тестовый турнир на 20 участников для проверки? Текущие данные на этом компьютере будут заменены — сначала сохраните их в файл, если нужно.")) return;
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}test-tournament.json`, { cache: "no-store" });
      const blob = await r.blob();
      const data = await readTournamentFile(new File([blob], "test.json"));
      importData(data);
      toast({ title: "Тестовый турнир загружен", description: "Неявка, 2 фола, травма, равенство, п. 2.7–2.9 (два 2-х и два 3-х места), олимпийская и круговая системы." });
    } catch (err) {
      toast({ title: "Не удалось загрузить тест", description: (err as Error).message, variant: "destructive" });
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
      <button className="pill" onClick={onTest} title="Турнир с готовыми спорными случаями для проверки программы">
        <Icon name="FlaskConical" size={15} /> Тестовый турнир
      </button>
      <FolderButton />
      <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
    </>
  );
}
