import Index from "@/pages/Index";
import Board from "@/pages/Board";
import ObsOverlay from "@/pages/ObsOverlay";

// Рендерится только в браузере (ssr: false): режим выбирается по query-параметрам, как раньше.
export default function HomeEntry() {
  const q = new URLSearchParams(window.location.search);
  if (q.has("overlay")) return <ObsOverlay />;
  if (q.has("board")) return <Board />;
  return <Index />;
}
