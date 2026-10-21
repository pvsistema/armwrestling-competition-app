import { useState } from "react";
import AppHeader, { Section } from "@/components/arm/AppHeader";
import JudgePanel from "@/components/arm/JudgePanel";
import AthletesSection from "@/components/arm/AthletesSection";
import ClassesSection from "@/components/arm/ClassesSection";
import BracketSection from "@/components/arm/BracketSection";
import ResultsSection from "@/components/arm/ResultsSection";
import BoardSection from "@/components/arm/BoardSection";
import Icon from "@/components/ui/icon";
import { StoreProvider, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Shell() {
  const [section, setSection] = useState<Section>("judge");
  const [table, setTable] = useState<number | "all">("all");
  const { tournament, resetDemo, resetEmpty } = useStore();

  const tables: (number | "all")[] = ["all", ...Array.from({ length: tournament.tables }, (_, i) => i + 1)];

  const right = (
    <>
      {section === "judge" && (
        <div className="flex rounded-full bg-foreground/10 p-1">
          {tables.map((t) => (
            <button
              key={String(t)}
              onClick={() => setTable(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.9em] font-medium transition-colors",
                table === t ? "bg-foreground text-background" : "hover:bg-foreground/10",
              )}
            >
              {t === "all" ? "Все столы" : `Стол ${t}`}
            </button>
          ))}
        </div>
      )}
      <button className="pill" onClick={() => setSection("results")}>
        <Icon name="Printer" size={16} /> Печать
      </button>
    </>
  );

  return (
    <div className="min-h-screen p-2 pb-6 sm:px-3 print:bg-white print:p-0">
      <div className="flex min-h-[calc(100vh-32px)] flex-col gap-4 rounded-stage bg-background px-4 pb-7 pt-5 text-foreground sm:px-10 print:min-h-0 print:rounded-none print:bg-white print:p-0 print:text-black">
        <AppHeader section={section} onSection={setSection} right={right} />
        <main className="flex flex-1 flex-col gap-4">
          {section === "judge" && <JudgePanel table={table} onGoBracket={() => setSection("bracket")} />}
          {section === "athletes" && <AthletesSection />}
          {section === "classes" && <ClassesSection />}
          {section === "bracket" && <BracketSection />}
          {section === "results" && <ResultsSection />}
          {section === "board" && <BoardSection />}
          {section === "athletes" && (
            <div className="flex flex-wrap gap-2">
              <button className="pill" onClick={() => confirm("Загрузить пример турнира заново? Текущие данные будут заменены.") && resetDemo()}>
                <Icon name="Sparkles" size={15} /> Загрузить пример
              </button>
              <button className="pill" onClick={() => confirm("Начать новый турнир с пустым списком?") && resetEmpty()}>
                <Icon name="FilePlus" size={15} /> Новый турнир
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function Index() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}