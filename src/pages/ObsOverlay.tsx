import { useEffect, useState } from "react";
import OverlayBar from "@/components/arm/stream/OverlayBar";
import { BarData, OVERLAY_API } from "@/lib/overlayBar";

/** Страница для OBS: только плашка на прозрачном фоне. Данные приходят с сервера по ключу. */
export default function ObsOverlay() {
  const q = new URLSearchParams(window.location.search);
  const key = q.get("overlay") ?? "";
  const pos = q.get("pos") === "top" ? "top" : "bottom";
  const size = (["s", "m", "l"].includes(q.get("size") ?? "") ? q.get("size") : "m") as "s" | "m" | "l";
  const [bar, setBar] = useState<BarData | null>(null);

  useEffect(() => {
    document.title = "Плашка для OBS — Рукоборец";
    const s = document.createElement("style");
    s.textContent = "html,body,#root{background:transparent!important;background-image:none!important;overflow:hidden}";
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    if (!key || !OVERLAY_API) return;
    let stop = false;
    let t = 0;
    const tick = async () => {
      try {
        const r = await fetch(`${OVERLAY_API}?key=${encodeURIComponent(key)}`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (!stop) setBar(d.bar ?? null);
        }
      } catch {
        /* нет связи — оставляем последнюю плашку */
      }
      if (!stop) t = window.setTimeout(tick, 1000);
    };
    tick();
    return () => {
      stop = true;
      window.clearTimeout(t);
    };
  }, [key]);

  if (!bar) return null;
  return (
    <div className="fixed inset-0">
      <OverlayBar bar={bar} size={size} pos={pos} />
    </div>
  );
}
