import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { fmtDateRange } from "@/lib/protocolModel";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import ClearTournament from "./ClearTournament";
import RecentTournaments from "./RecentTournaments";
import type { Section } from "./AppHeader";

const STEPS: { id: Section; title: string; text: string; icon: string }[] = [
  { id: "classes", title: "Категории", text: "Возрастные и весовые категории, система, порядок рук", icon: "Scale" },
  { id: "athletes", title: "Участники", text: "Регистрация, взвешивание и автораспределение", icon: "Users" },
  { id: "bracket", title: "Сетка", text: "Жеребьёвка и сетки по категориям", icon: "GitFork" },
  { id: "judge", title: "Пульт судьи", text: "Схватки, фолы, вызов к столу", icon: "Gavel" },
  { id: "results", title: "Протоколы", text: "PDF, Word, Excel по образцу ФАР", icon: "FileText" },
  { id: "board", title: "Табло", text: "Экран для зрителей и участников", icon: "Monitor" },
];

function Flag({ className }: { className?: string }) {
  return (
    <div className={cn("flag-wave relative overflow-hidden rounded-[6px] shadow-xl ring-1 ring-black/10", className)}>
      <div className="h-1/3 bg-[hsl(var(--flag-white))]" />
      <div className="h-1/3 bg-[hsl(var(--flag-blue))]" />
      <div className="h-1/3 bg-[hsl(var(--flag-red))]" />
      <div className="flag-sheen pointer-events-none absolute inset-0" />
    </div>
  );
}

export default function HomeSection({ onSection }: { onSection: (s: Section) => void }) {
  const { tournament: t, athletes, brackets, matches, groups } = useStore();
  const done = matches.filter((m) => m.winner).length;
  const started = athletes.length > 0;
  const next: Section = !groups.length ? "classes" : !started ? "athletes" : !brackets.length ? "bracket" : done < matches.length ? "judge" : "results";
  const nextLabel = !groups.length ? "Выбрать категории" : !started ? "Начать регистрацию" : !brackets.length ? "Провести жеребьёвку" : done < matches.length ? "Продолжить турнир" : "Открыть протоколы";
  const when = [t.place, fmtDateRange(t.date, t.dateEnd)].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="navy-band relative overflow-hidden rounded-stage border-2 border-gold/60 px-6 py-10 text-white shadow-xl md:px-12 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-copper/40 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-gold/40 blur-2xl" />
              <Logo hq className="relative h-44 w-44 shadow-2xl ring-4 ring-gold md:h-56 md:w-56" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-gold/50 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white backdrop-blur">
              <span className="flex h-5 w-7 flex-col overflow-hidden rounded-[3px] ring-1 ring-black/10">
                <span className="flex-1 bg-[hsl(var(--flag-white))]" />
                <span className="flex-1 bg-[hsl(var(--flag-blue))]" />
                <span className="flex-1 bg-[hsl(var(--flag-red))]" />
              </span>
              Российское ПО
            </div>
            <h1 className="gold-text pb-2 text-[clamp(44px,6.5vw,88px)] font-bold leading-[0.95] tracking-[-0.035em] drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
              Рукоборец
            </h1>
            <p className="max-w-xl text-lg text-white/80 md:text-xl">
              Программа для проведения соревнований по армрестлингу — от взвешивания до итоговых протоколов по правилам ФАР.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-3 lg:justify-start">
              <button className="btn-gold !px-6 !py-3 text-base" onClick={() => onSection(next)}>
                <Icon name="Play" size={18} /> {nextLabel}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 font-medium text-white transition hover:bg-white/20"
                onClick={() => onSection("board")}
              >
                <Icon name="Monitor" size={17} /> Табло
              </button>
              <ClearTournament
                className="!border-white/30 !bg-white/10 !px-5 !py-3 !text-white hover:!bg-white/20"
                onDone={() => onSection("classes")}
              />
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-start">
                <div className="relative h-56 w-1.5 rounded-full bg-gradient-to-b from-[hsl(45_85%_72%)] to-[hsl(36_60%_38%)] shadow">
                  <span className="absolute -left-1 -top-2 h-3.5 w-3.5 rounded-full bg-gold shadow" />
                </div>
                <Flag className="-ml-0.5 mt-1 h-28 w-44" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_2fr]">
        <div className="win gap-3 border-t-4 border-t-gold p-5">
          <div className="cat">ТЕКУЩИЙ ТУРНИР</div>
          <div className="text-xl font-semibold leading-snug">{t.name || "Название не задано"}</div>
          {when && (
            <div className="flex items-center gap-2 text-sm text-panel-muted">
              <Icon name="MapPin" size={15} /> {when}
            </div>
          )}
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            {[
              [athletes.length, "участников"],
              [brackets.length, "сеток"],
              [`${done}/${matches.length}`, "схваток"],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-lg bg-navy px-2 py-3 text-white">
                <div className="font-mono text-2xl font-semibold text-gold">{v}</div>
                <div className="text-xs text-white/70">{l}</div>
              </div>
            ))}
          </div>
          <button className="pill mt-auto self-start" onClick={() => onSection("classes")}>
            <Icon name="Settings2" size={15} /> Настройки турнира
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onSection(s.id)}
              className="group flex flex-col gap-2 rounded-lg border border-line bg-panel p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-gold ring-2 ring-gold/40 transition group-hover:bg-gold group-hover:text-navy">
                  <Icon name={s.icon} size={19} />
                </span>
                <span className="font-mono text-xs text-panel-muted">0{i + 1}</span>
              </div>
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm leading-snug text-panel-muted">{s.text}</div>
            </button>
          ))}
        </div>
      </section>

      <RecentTournaments onOpened={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </div>
  );
}
