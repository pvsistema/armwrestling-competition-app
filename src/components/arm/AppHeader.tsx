import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { useStore } from "@/lib/store";

export type Section = "home" | "athletes" | "classes" | "bracket" | "judge" | "results" | "board" | "far" | "fights" | "stream";

export const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "home", label: "Главная", icon: "House" },
  { id: "classes", label: "Категории", icon: "Scale" },
  { id: "athletes", label: "Участники", icon: "Users" },
  { id: "bracket", label: "Сетка", icon: "GitFork" },
  { id: "judge", label: "Пульт судьи", icon: "Gavel" },
  { id: "results", label: "Протоколы", icon: "FileText" },
  { id: "board", label: "Табло", icon: "Monitor" },
  { id: "far", label: "Паспорта ФАР", icon: "BookUser" },
  { id: "fights", label: "Армфайты", icon: "Swords" },
  { id: "stream", label: "Трансляция", icon: "Video" },
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
    <header className="relative flex flex-col print:hidden">
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 cursor-pointer items-center gap-3" onClick={() => onSection("home")} title="На главную">
          {showLogo && <Logo className="h-12 w-12 shadow-[0_0_0_2px_hsl(var(--gold)),0_4px_14px_rgba(0,0,0,0.4)]" />}
          <div className="flex flex-col items-center text-center text-[0.9em] font-semibold leading-[1.15]">
            <span>Федерация</span>
            <span>Армрестлинга</span>
            <span>России</span>
          </div>
        </div>
        <div className="ml-auto hidden min-w-0 flex-wrap items-center justify-end gap-2 text-foreground md:flex">{right}</div>
        <button className="pill ml-auto md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Меню">
          <Icon name={open ? "X" : "Menu"} size={18} />
          <span>{SECTIONS.find((s) => s.id === section)?.label}</span>
        </button>
      </div>
      <nav className="-mx-1 mt-2 hidden flex-wrap items-stretch gap-x-0.5 gap-y-1.5 border-t border-white/15 pt-1.5 font-medium md:flex">
        {SECTIONS.filter((s) => s.id !== "home").map((s) => (
          <button
            key={s.id}
            onClick={() => onSection(s.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-[0.93em] transition-colors xl:px-3",
              section === s.id ? "bg-white/10 text-gold" : "text-white/80 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon name={s.icon} size={16} className={section === s.id ? "text-gold" : "text-white/60"} />
            {s.label}
            {section === s.id && <span className="absolute -bottom-1.5 left-3 right-3 h-[3px] rounded-full bg-gold" />}
          </button>
        ))}
      </nav>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 animate-scale-in rounded-lg border border-line bg-panel p-2 text-foreground shadow-2xl md:hidden">
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