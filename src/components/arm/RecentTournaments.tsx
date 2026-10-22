import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { ArchiveMeta, listArchive, loadArchived, onArchiveChange, removeArchived } from "@/lib/archive";
import { fmtDateRange } from "@/lib/protocolModel";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const d = new Date(t);
  const today = new Date();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `сегодня в ${time}`;
  const y = new Date(today.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return `вчера в ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};

const norm = (x: string) => x.toLowerCase().replace(/ё/g, "е");
const yearOf = (m: ArchiveMeta) => (m.date?.slice(0, 4) || String(new Date(m.updatedAt).getFullYear()));

/** Последние турниры на этом компьютере — открываются одним нажатием. */
export default function RecentTournaments({ onOpened }: { onOpened?: () => void }) {
  const { tournament, importData } = useStore();
  const [list, setList] = useState<ArchiveMeta[]>([]);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string | null>(null);

  const refresh = useCallback(() => listArchive().then(setList, () => setList([])), []);
  useEffect(() => {
    refresh();
    return onArchiveChange(refresh);
  }, [refresh]);

  const others = list.filter((x) => x.id !== tournament.uid);
  if (!others.length) return null;
  const years = [...new Set(others.map(yearOf))].sort((a, b) => b.localeCompare(a));
  const words = norm(q).split(/\s+/).filter(Boolean);
  const filtering = words.length > 0 || !!year;
  const found = others.filter((m) => {
    if (year && yearOf(m) !== year) return false;
    const hay = norm(`${m.name} ${m.place} ${m.date} ${m.dateEnd ?? ""} ${fmtDateRange(m.date, m.dateEnd)}`);
    return words.every((w) => hay.includes(w));
  });
  const shown = all || filtering ? found : found.slice(0, 6);
  const searchable = others.length > 3;

  const open = async (m: ArchiveMeta) => {
    setBusy(m.id);
    try {
      const data = await loadArchived(m.id);
      if (!data) throw new Error("Турнир не найден");
      importData(data);
      toast({ title: `Открыт турнир «${m.name || "без названия"}»`, description: "Прежний турнир сохранён в списке последних." });
      onOpened?.();
    } catch (e) {
      toast({ title: "Не удалось открыть турнир", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (m: ArchiveMeta) => {
    if (!confirm(`Убрать «${m.name || "без названия"}» из списка последних турниров? Файлы копий на диске останутся.`)) return;
    await removeArchived(m.id);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Последние турниры</h2>
        <span className="text-xs text-panel-muted">хранятся на этом компьютере</span>
      </div>
      {searchable && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:max-w-md">
            <Icon name="Search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-panel-muted" />
            <input
              className="field !pl-10 !pr-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Название или город"
            />
            {q && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-panel-muted hover:bg-surface" onClick={() => setQ("")} title="Очистить">
                <Icon name="X" size={15} />
              </button>
            )}
          </div>
          {years.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button className={cn("pill !py-1.5 text-sm", !year && "pill-on")} onClick={() => setYear(null)}>
                Все годы
              </button>
              {years.map((y) => (
                <button key={y} className={cn("pill !py-1.5 font-mono text-sm", year === y && "pill-on")} onClick={() => setYear(year === y ? null : y)}>
                  {y}
                </button>
              ))}
            </div>
          )}
          {filtering && <span className="text-sm text-panel-muted">найдено: {found.length}</span>}
        </div>
      )}
      {filtering && !found.length && (
        <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-panel-muted">
          Ничего не найдено.{" "}
          <button
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => {
              setQ("");
              setYear(null);
            }}
          >
            Сбросить поиск
          </button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => {
          const when = [m.place, fmtDateRange(m.date, m.dateEnd)].filter(Boolean).join(" · ");
          const finished = m.total > 0 && m.done >= m.total;
          return (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => !busy && open(m)}
              onKeyDown={(e) => e.key === "Enter" && !busy && open(m)}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-2 rounded-lg border border-line bg-panel p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md",
                busy === m.id && "opacity-60",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-gold ring-2 ring-gold/40 transition group-hover:bg-gold group-hover:text-navy">
                  <Icon name={busy === m.id ? "Loader2" : finished ? "Trophy" : "FolderOpen"} size={18} className={busy === m.id ? "animate-spin" : ""} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-semibold leading-snug">{m.name || "Турнир без названия"}</div>
                  {when && <div className="truncate text-sm text-panel-muted">{when}</div>}
                </div>
                <button
                  className="-mr-1 -mt-1 rounded-full p-1.5 text-panel-muted opacity-0 transition hover:bg-surface hover:text-corner-red group-hover:opacity-100"
                  title="Убрать из списка"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(m);
                  }}
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-panel-muted">
                <span className="inline-flex items-center gap-1">
                  <Icon name="Users" size={13} /> {m.athletes}
                </span>
                {m.total > 0 && (
                  <span className={cn("inline-flex items-center gap-1", finished && "font-medium text-primary")}>
                    <Icon name="Swords" size={13} fallback="Gavel" /> {finished ? "завершён" : `${m.done}/${m.total}`}
                  </span>
                )}
                <span className="ml-auto">изменён {ago(m.updatedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!filtering && others.length > 6 && (
        <button className="pill self-start" onClick={() => setAll(!all)}>
          <Icon name={all ? "ChevronUp" : "ChevronDown"} size={15} /> {all ? "Свернуть" : `Показать все (${others.length})`}
        </button>
      )}
    </section>
  );
}
