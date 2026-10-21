import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { buildProtocol } from "@/lib/protocolModel";
import { toast } from "@/hooks/use-toast";

type Fmt = "pdf" | "docx" | "xlsx";

export default function ExportButtons({ onlyDone }: { onlyDone: boolean }) {
  const store = useStore();
  const classMap = useClassMap();
  const [busy, setBusy] = useState<Fmt | null>(null);

  const run = async (fmt: Fmt) => {
    const doc = buildProtocol(store.exportData(), classMap, { onlyDone });
    if (!doc.sections.length) {
      toast({ title: "Нечего выгружать", description: "Сначала проведите жеребьёвку и схватки." });
      return;
    }
    setBusy(fmt);
    try {
      const m = await import("@/lib/exportProtocol");
      const logo = store.tournament.showLogo ?? true;
      if (fmt === "pdf") await m.exportPdf(doc, logo);
      if (fmt === "docx") await m.exportWord(doc, logo);
      if (fmt === "xlsx") await m.exportExcel(doc);
      toast({ title: "Протокол сохранён", description: `${doc.fileBase}.${fmt}` });
    } catch (e) {
      toast({ title: "Не удалось сохранить протокол", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const btn = (fmt: Fmt, label: string, icon: string) => (
    <button className="pill" onClick={() => run(fmt)} disabled={!!busy} title={`Скачать весь протокол в ${label}`}>
      <Icon name={busy === fmt ? "Loader2" : icon} size={15} className={busy === fmt ? "animate-spin" : ""} /> {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-panel-muted">Скачать протокол:</span>
      {btn("pdf", "PDF", "FileText")}
      {btn("docx", "Word", "FileType")}
      {btn("xlsx", "Excel", "FileSpreadsheet")}
    </div>
  );
}
