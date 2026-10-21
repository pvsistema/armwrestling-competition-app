import { useCallback, useEffect, useState } from "react";

const FKEY = "armsport-board-focus";
export type BoardFocus = number | "all";

function read(): BoardFocus {
  const v = localStorage.getItem(FKEY);
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

const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isBoardWindow = () => new URLSearchParams(window.location.search).has("board");

export async function openBoardWindow() {
  if (isTauri()) {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const ex = await WebviewWindow.getByLabel("board");
    if (ex) {
      await ex.unminimize().catch(() => {});
      await ex.setFocus();
      return;
    }
    new WebviewWindow("board", {
      url: "index.html?board=1",
      title: "Табло — Армспорт",
      width: 1600,
      height: 900,
      center: true,
    });
    return;
  }
  const url = `${window.location.origin}${import.meta.env.BASE_URL}?board=1`;
  const w = window.open(url, "armsport-board", "popup=yes,width=1600,height=900");
  if (!w) throw new Error("Браузер заблокировал новое окно — разрешите всплывающие окна для этого сайта.");
  w.focus();
}

export async function toggleFullscreen() {
  if (isTauri()) {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const w = getCurrentWindow();
    await w.setFullscreen(!(await w.isFullscreen()));
    return;
  }
  if (document.fullscreenElement) await document.exitFullscreen();
  else await document.documentElement.requestFullscreen?.();
}
