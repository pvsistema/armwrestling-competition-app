import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { downloadRelease, useUpdate, verifyRelease, webview } from "@/lib/updates";

const fmtMb = (b: number) => (b ? `${(b / 1048576).toFixed(1).replace(".", ",")} МБ` : "");

/** Уведомление о новой версии: в программе для Windows — установка в один клик, в браузере — скачать программу. */
export default function UpdateBanner({ place }: { place: "header" | "main" }) {
  const u = useUpdate();
  const [pct, setPct] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const heard = useRef(false);

  useEffect(() => {
    const wv = webview();
    if (!wv) return;
    const on = (e: { data: unknown }) => {
      const d = e.data as { type?: string; state?: string; text?: string; pct?: number };
      if (d?.type !== "update-state") return;
      heard.current = true;
      if (d.state === "progress") setPct(d.pct ?? 0);
      else if (d.state === "error") {
        setPct(null);
        toast({ title: "Обновление не установлено", description: d.text, variant: "destructive" });
      } else if (d.state === "later" || d.state === "ready") setPct(d.state === "ready" ? 100 : null);
    };
    wv.addEventListener("message", on);
    return () => wv.removeEventListener("message", on);
  }, []);

  if (!u.rel) return null;
  const r = u.rel;

  const install = async () => {
    const wv = webview();
    if (u.desktop && wv && r.parts?.length) {
      if (!(await verifyRelease(r))) return toast({ title: "Подпись обновления не прошла проверку", variant: "destructive" });
      setPct(0);
      heard.current = false;
      wv.postMessage({ type: "update", version: r.version, parts: r.parts, sha256: r.sha256, size: r.size, sig: r.sig });
      await new Promise((ok) => setTimeout(ok, 5000));
      if (heard.current) return;
    }
    try {
      setPct(0);
      await downloadRelease(r, setPct);
      toast({ title: `Установщик ${r.version} скачан`, description: "Запустите его из папки «Загрузки» — новая версия встанет поверх старой, турниры сохранятся." });
    } catch (e) {
      toast({ title: "Не удалось скачать", description: (e as Error).message, variant: "destructive" });
    } finally {
      setPct(null);
    }
  };

  if (!u.desktop) {
    if (place !== "header") return null;
    return (
      <button className="pill" onClick={install} disabled={pct != null} title={`Программа для Windows, версия ${r.version}${r.size ? `, ${fmtMb(r.size)}` : ""}`}>
        <Icon name={pct != null ? "Loader2" : "Download"} size={16} className={pct != null ? "animate-spin" : ""} />
        {pct != null ? `${pct}%` : `Программа для Windows ${r.version}`}
      </button>
    );
  }

  if (place !== "main" || !u.available || (u.hidden && !open)) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold bg-gold-soft px-4 py-2.5 text-sm text-tip-foreground print:hidden">
      <Icon name="BellRing" size={18} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <b>Доступна новая версия {r.version}</b>
        <span className="text-tip-foreground/80"> · у вас {u.current}{r.mandatory ? " · обязательное обновление" : ""}</span>
        {r.notes && (
          <button className="ml-2 underline" onClick={() => setOpen(!open)}>
            {open ? "скрыть" : "что нового"}
          </button>
        )}
        {open && r.notes && <div className="mt-1.5 whitespace-pre-line text-xs leading-relaxed">{r.notes}</div>}
      </div>
      <button className="btn-blue !px-4 !py-2" onClick={install} disabled={pct != null}>
        <Icon name={pct != null ? "Loader2" : "Download"} size={16} className={pct != null ? "animate-spin" : ""} />
        {pct == null ? "Обновить" : pct < 100 ? `Скачивание ${pct}%` : "Готово к установке"}
      </button>
      {!r.mandatory && pct == null && (
        <button className="text-xs underline" onClick={u.skip}>
          Пропустить эту версию
        </button>
      )}
    </div>
  );
}
