import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { buildProtocol } from "@/lib/protocolModel";
import { Hand } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Act = "print" | "pdf" | "docx" | "xlsx";

/** Печать или сохранение протокола одной руки — по столу или по всем столам. */
export default function HandProtocolActions({
  hand,
  table,
  compact,
  onDone,
}: {
  hand: Hand;
  table?: number;
  compact?: boolean;
  onDone?: () => void;
}) {
  const store = useStore();
  const classMap = useClassMap();
  const [busy, setBusy] = useState<Act | null>(null);

  const run = async (act: Act) => {
    const doc = buildProtocol(store.exportData(), classMap, { part: hand, table, onlyDone: true });
    if (!doc.sections.length) {
      toast({ title: "Нечего выгружать", description: "На этой руке ещё нет завершённых категорий." });
      return;
    }
    setBusy(act);
    try {
      const m = await import("@/lib/exportProtocol");
      const logo = store.tournament.showLogo ?? true;
      if (act === "print") await m.exportPdf(doc, logo, { print: true });
      if (act === "pdf") await m.exportPdf(doc, logo);
      if (act === "docx") await m.exportWord(doc, logo);
      if (act === "xlsx") await m.exportExcel(doc);
      toast({
        title: act === "print" ? "Протокол открыт для печати" : "Протокол сохранён",
        description: act === "print" ? doc.fileBase : `${doc.fileBase}.${act}`,
      });
      onDone?.();
    } catch (e) {
      toast({ title: "Не получилось", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const btn = (act: Act, label: string, icon: string, primary = false) => (
    <button
      key={act}
      className={cn(primary ? "btn-blue" : "pill", compact && "!px-3 !py-1.5 text-xs")}
      onClick={() => run(act)}
      disabled={!!busy}
    >
      <Icon name={busy === act ? "Loader2" : icon} size={compact ? 13 : 16} className={busy === act ? "animate-spin" : ""} /> {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {btn("print", "Печать", "Printer", !compact)}
      {btn("pdf", "PDF", "FileText")}
      {btn("docx", "Word", "FileType")}
      {btn("xlsx", "Excel", "FileSpreadsheet")}
    </div>
  );
}
