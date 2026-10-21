import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { ProtocolPart, buildProtocol } from "@/lib/protocolModel";
import { handsInOrder } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { savedText, warmFolder } from "@/lib/saveFolder";
import FolderButton from "./FolderButton";

type Fmt = "pdf" | "docx" | "xlsx";

export default function ExportButtons({ onlyDone }: { onlyDone: boolean }) {
  const store = useStore();
  const classMap = useClassMap();
  const [busy, setBusy] = useState<Fmt | null>(null);
  const [part, setPart] = useState<ProtocolPart>("full");
  const hands = handsInOrder(store.tournament);
  const parts: { v: ProtocolPart; label: string; hint: string }[] = [
    ...hands.map((h) => ({
      v: h as ProtocolPart,
      label: h === "left" ? "Левая рука" : "Правая рука",
      hint: `Места по всем категориям в борьбе ${h === "left" ? "левой" : "правой"} рукой`,
    })),
    { v: "biathlon", label: "Общий", hint: "Итог двоеборья (сумма рук), командный зачёт, судьи" },
    { v: "full", label: "Полный", hint: "Левая, правая, общий и командный — одним файлом" },
  ];

  const run = async (fmt: Fmt) => {
    const doc = buildProtocol(store.exportData(), classMap, { onlyDone, part });
    if (!doc.sections.length) {
      toast({ title: "Нечего выгружать", description: "Сначала проведите жеребьёвку и схватки." });
      return;
    }
    setBusy(fmt);
    try {
      await warmFolder();
      const m = await import("@/lib/exportProtocol");
      const logo = store.tournament.showLogo ?? true;
      const r = fmt === "pdf" ? await m.exportPdf(doc, logo) : fmt === "docx" ? await m.exportWord(doc, logo) : await m.exportExcel(doc);
      toast({ title: "Протокол сохранён", description: r ? savedText(r) : `${doc.fileBase}.${fmt}` });
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
      <div className="flex rounded-full border border-line bg-surface p-0.5">
        {parts.map((p) => (
          <button
            key={p.v}
            title={p.hint}
            onClick={() => setPart(p.v)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              part === p.v ? "bg-primary text-primary-foreground" : "text-panel-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {btn("pdf", "PDF", "FileText")}
      {btn("docx", "Word", "FileType")}
      {btn("xlsx", "Excel", "FileSpreadsheet")}
      <FolderButton />
    </div>
  );
}
