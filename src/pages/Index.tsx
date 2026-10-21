import { useState } from "react";
import AppHeader, { Section } from "@/components/arm/AppHeader";
import JudgePanel from "@/components/arm/JudgePanel";
import AthletesSection from "@/components/arm/AthletesSection";
import ClassesSection from "@/components/arm/ClassesSection";
import BracketSection from "@/components/arm/BracketSection";
import ResultsSection from "@/components/arm/ResultsSection";
import BoardSection from "@/components/arm/BoardSection";
import TournamentFileButtons from "@/components/arm/TournamentFileButtons";
import HelpSheet from "@/components/arm/HelpSheet";
import HomeSection from "@/components/arm/HomeSection";
import NeedGroups from "@/components/arm/NeedGroups";
import AutoBackupBadge from "@/components/arm/AutoBackupBadge";
import RestoreBackup from "@/components/arm/RestoreBackup";
import PrintFooter from "@/components/arm/PrintFooter";
import HandDoneDialog from "@/components/arm/HandDoneDialog";
import ImportAthletes from "@/components/arm/ImportAthletes";
import StallAlert from "@/components/arm/StallAlert";
import Icon from "@/components/ui/icon";
import { StoreProvider, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Shell() {
  const [section, setSection] = useState<Section>("home");
  const [table, setTable] = useState<number | "all">("all");
  const { tournament, groups, resetEmpty } = useStore();
  const locked = !groups.length && (section === "athletes" || section === "bracket" || section === "judge");

  const tables: (number | "all")[] = ["all", ...Array.from({ length: tournament.tables }, (_, i) => i + 1)];

  const right = (
    <>
      {section === "judge" && (
        <div className="flex rounded-full border border-line bg-surface p-1 text-foreground">
          {tables.map((t) => (
            <button
              key={String(t)}
              onClick={() => setTable(t)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.9em] font-medium transition-colors",
                table === t ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              {t === "all" ? "Все столы" : `Стол ${t}`}
            </button>
          ))}
        </div>
      )}
      <AutoBackupBadge />
      <HelpSheet />
      <button className="pill" onClick={() => setSection("results")}>
        <Icon name="Printer" size={16} /> Печать
      </button>
    </>
  );

  return (
    <div className="min-h-screen px-1 pb-0.5 pt-1 sm:px-1.5 print:bg-white print:p-0">
      <div className="flex min-h-[calc(100vh-24px)] flex-col gap-3 overflow-hidden rounded-[14px] border border-line bg-background px-2 pb-3 pt-0 text-foreground shadow-sm sm:px-4 print:min-h-0 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
        <div className="navy-band -mx-2 border-b-2 border-gold/70 px-3 pb-2 text-white sm:-mx-4 sm:px-5 print:hidden">
          <div className="tricolor -mx-3 mb-2 sm:-mx-5" />
          <AppHeader section={section} onSection={setSection} right={right} />
        </div>
        <main className="flex flex-1 flex-col gap-3">
          <PrintFooter />
          <RestoreBackup />
          <HandDoneDialog />
          <StallAlert
            onGoJudge={(t) => {
              setTable(t);
              setSection("judge");
            }}
          />
          {locked && <NeedGroups onGo={() => setSection("classes")} onDone={() => setSection("athletes")} />}
          {section === "judge" && !locked && <JudgePanel table={table} onGoBracket={() => setSection("bracket")} />}
          {section === "home" && <HomeSection onSection={setSection} />}
          {section === "athletes" && !locked && <AthletesSection />}
          {section === "classes" && <ClassesSection onNext={() => setSection("athletes")} />}
          {section === "bracket" && !locked && <BracketSection />}
          {section === "results" && <ResultsSection />}
          {section === "board" && <BoardSection />}
          {section === "athletes" && !locked && (
            <div className="flex flex-wrap gap-2">
              <ImportAthletes />
              <TournamentFileButtons />
              <button className="pill" onClick={() => confirm("Начать новый турнир с пустым списком?") && resetEmpty()}>
                <Icon name="FilePlus" size={15} /> Новый турнир
              </button>
            </div>
          )}
        </main>
      </div>
      <footer className="flex justify-end px-3 pt-0.5 text-xs font-semibold text-gold print:hidden">
        Разработал: Ипатов Сергей Геннадьевич
      </footer>
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