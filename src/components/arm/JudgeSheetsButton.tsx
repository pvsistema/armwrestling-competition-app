import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Выгрузка стартовых листов и хода схваток для судей на столы. */
export default function JudgeSheetsButton({ currentKey }: { currentKey: string | null }) {
  const { tournament, brackets, matches, amap } = useStore();
  const classMap = useClassMap();
  const [scope, setScope] = useState<"all" | "current" | number>("all");
  const [busy, setBusy] = useState(false);
  const tables = Math.max(1, tournament.tables);

  if (!brackets.length) return null;

  const run = async () => {
    const list =
      scope === "all"
        ? brackets
        : scope === "current"
          ? brackets.filter((b) => b.key === currentKey)
          : brackets.filter((b) => b.table === scope);
    if (!list.length) {
      toast({ title: "Нечего выгружать", description: "Для выбранного варианта нет проведённых жеребьёвок." });
      return;
    }
    setBusy(true);
    try {
      const m = await import("@/lib/judgeSheets");
      const suffix = scope === "all" ? "все" : scope === "current" ? "категория" : `стол-${scope}`;
      await m.exportJudgeSheets({ tournament, brackets, matches, amap, classMap }, list, `Листы судей — ${suffix}`);
      toast({ title: "Листы для судей сохранены", description: `${list.length} ${list.length === 1 ? "категория" : "категорий"}, каждая на отдельной странице` });
    } catch (e) {
      toast({ title: "Не удалось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const opts: { v: "all" | "current" | number; label: string }[] = [
    { v: "all", label: "Все" },
    ...(currentKey && brackets.some((b) => b.key === currentKey) ? [{ v: "current" as const, label: "Эта категория" }] : []),
    ...(tables > 1 ? Array.from({ length: tables }, (_, i) => ({ v: i + 1, label: `Стол ${i + 1}` })) : []),
  ];

  return (
    <div className="win gap-2 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon name="ClipboardList" size={17} className="text-primary" /> Листы для судей на столы
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button key={String(o.v)} className={cn("pill !px-3 !py-1 text-xs", scope === o.v && "pill-on")} onClick={() => setScope(o.v)}>
            {o.label}
          </button>
        ))}
      </div>
      <button className="btn-blue w-full" onClick={run} disabled={busy}>
        <Icon name={busy ? "Loader2" : "FileDown"} size={16} className={busy ? "animate-spin" : ""} /> Скачать PDF
      </button>
      <p className="text-[11px] leading-snug text-panel-muted">
        Стартовый лист и ход схваток — каждая категория на своей странице. Проведённые схватки уже вписаны, для остальных — пустые строки, чтобы судья заполнил от руки.
      </p>
    </div>
  );
}
