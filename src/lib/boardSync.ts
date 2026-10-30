import { useCallback, useEffect, useState } from "react";

const FKEY = "armsport-board-focus";
export type BoardFocus = number | "all" | "team";

function read(): BoardFocus {
  const v = localStorage.getItem(FKEY);
  if (v === "team") return "team";
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : "all";
}

/** Выбранный на табло стол — общий для главного окна и окна табло. */
export function useBoardFocus(): [BoardFocus, (v: BoardFocus) => void] {
  const [v, setV] = useState<BoardFocus>(read);
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === FKEY) setV(read());
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);
  const set = useCallback((n: BoardFocus) => {
    localStorage.setItem(FKEY, String(n));
    setV(n);
  }, []);
  return [v, set];
}

export const isBoardWindow = () => new URLSearchParams(window.location.search).has("board");

/** Запущено в настольной программе (оболочка C# / WebView2). */
export const isDesktop = () => typeof navigator !== "undefined" && navigator.userAgent.includes("ArmsportDesktop");

export async function openBoardWindow(mode?: "fights" | "cup") {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}?board=${mode ?? 1}`;
  const w = window.open(url, mode ? `armsport-board-${mode}` : "armsport-board", "popup=yes,width=1600,height=900");
  if (isDesktop()) return;
  if (!w) throw new Error("Браузер заблокировал новое окно — разрешите всплывающие окна для этого сайта.");
  w.focus();
}

export async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen?.();
}
