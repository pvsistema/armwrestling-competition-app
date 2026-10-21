import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { fmtDateRange } from "@/lib/protocolModel";

const ID = "armsport-print-footer";
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");

/** Внизу каждого печатного листа: название турнира, место, даты и номер листа. */
export default function PrintFooter() {
  const { tournament: t } = useStore();
  const line = [t.name || "Соревнования по армрестлингу", [t.place, fmtDateRange(t.date, t.dateEnd)].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    let el = document.getElementById(ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = ID;
      document.head.appendChild(el);
    }
    el.textContent = `@media print { @page { @bottom-left { content: "${esc(line)}"; font: 8pt "Times New Roman", serif; color: #333; vertical-align: top; padding-top: 3mm; border-top: 0.3mm solid #999; } @bottom-right { content: "Лист " counter(page) " из " counter(pages); font: 8pt "Times New Roman", serif; color: #333; vertical-align: top; padding-top: 3mm; border-top: 0.3mm solid #999; } } }`;
  }, [line]);

  return null;
}
