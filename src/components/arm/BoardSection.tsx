import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { openBoardWindow, useBoardFocus } from "@/lib/boardSync";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import BoardView from "./BoardView";

export default function BoardSection() {
  const { tournament } = useStore();
  const [focus, setFocus] = useBoardFocus();
  const tables = Math.max(1, tournament.tables);

  const open = async () => {
    try {
      await openBoardWindow();
    } catch (e) {
      toast({ title: "Окно табло не открылось", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="win flex-row flex-wrap items-center gap-2 px-3 py-2">
        <span className="mr-1 text-sm text-panel-muted">Показывать на табло:</span>
        {tables > 1 && (
          <button className={cn("pill", focus === "all" && "pill-on")} onClick={() => setFocus("all")}>
            <Icon name="LayoutGrid" size={15} /> Все столы ({tables})
          </button>
        )}
        {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
          <button key={t} className={cn("pill", (focus === t || (tables === 1 && t === 1)) && "pill-on")} onClick={() => setFocus(t)}>
            Стол {t}
          </button>
        ))}
        <span
          className="ml-auto hidden cursor-help items-center gap-1 text-xs text-panel-muted xl:inline-flex"
          title="Перетащите окно табло на проектор или второй монитор и нажмите «Полный экран» (или клавишу F). Выбор стола здесь сразу меняется и на табло. На самом табло тоже можно нажать на любой стол — он развернётся на весь экран."
        >
          <Icon name="Info" size={14} /> проектор / второй монитор, клавиша F — полный экран
        </span>
        <button className="btn-blue !py-2.5 xl:ml-0 ml-auto" onClick={open}>
          <Icon name="ExternalLink" size={17} /> Открыть табло в отдельном окне
        </button>
      </div>
      <BoardView focus={focus} onFocus={setFocus} />
    </div>
  );
}
