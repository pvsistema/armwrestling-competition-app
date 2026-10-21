import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { useStore } from "@/lib/store";

export type Section = "athletes" | "classes" | "bracket" | "judge" | "results" | "board";

export const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "athletes", label: "Участники", icon: "Users" },
  { id: "classes", label: "Категории", icon: "Scale" },
  { id: "bracket", label: "Сетка", icon: "GitFork" },
  { id: "judge", label: "Пульт судьи", icon: "Gavel" },
  { id: "results", label: "Протоколы", icon: "FileText" },
  { id: "board", label: "Табло", icon: "Monitor" },
];

interface Props {
  section: Section;
  onSection: (s: Section) => void;
  right?: React.ReactNode;
}

export default function AppHeader({ section, onSection, right }: Props) {
  const [open, setOpen] = useState(false);
  const { tournament } = useStore();
  const showLogo = tournament.showLogo ?? true;
  return (
    <header className="relative flex items-center gap-7 print:hidden">
      <div className="flex items-center gap-3">
        {showLogo && <Logo className="h-11 w-11 shadow-md" />}
        <div className="flex flex-col items-center text-center text-[0.9em] font-semibold leading-[1.15]">
          <span>Федерация</span>
          <span>Армрестлинга</span>
          <span>России</span>
        </div>
      </div>
      <nav className="hidden items-center gap-[22px] font-medium lg:flex">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSection(s.id)}
            className={cn(
              "relative py-1 transition-opacity",
              section === s.id ? "opacity-100" : "opacity-75 hover:opacity-100",
            )}
          >
            {s.label}
            {section === s.id && (
              <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-corner-red" />
            )}
          </button>
        ))}
      </nav>
      <div className="ml-auto hidden items-center gap-2.5 md:flex">{right}</div>
      <button className="pill ml-auto md:ml-0 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Меню">
        <Icon name={open ? "X" : "Menu"} size={18} />
        <span>{SECTIONS.find((s) => s.id === section)?.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 animate-scale-in rounded-lg border border-line bg-panel p-2 shadow-2xl lg:hidden">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSection(s.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left font-medium",
                section === s.id ? "bg-primary text-primary-foreground" : "hover:bg-surface",
              )}
            >
              <Icon name={s.icon} size={18} />
              {s.label}
            </button>
          ))}
          <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-2 md:hidden">{right}</div>
        </div>
      )}
    </header>
  );
}