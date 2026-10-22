import { useEffect } from "react";
import { StoreProvider } from "@/lib/store";
import { toggleFullscreen, useBoardFocus } from "@/lib/boardSync";
import BoardView from "@/components/arm/BoardView";
import FightBoard from "@/components/arm/fights/FightBoard";
import { useFights } from "@/lib/fights";

function FightsScreen() {
  const { night } = useFights();
  useEffect(() => {
    document.title = "Табло армфайтов — Рукоборец";
    const onKey = (e: KeyboardEvent) => {
      if (["f", "F", "а", "А", "F11"].includes(e.key)) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="flex h-screen flex-col bg-navy p-2" onDoubleClick={() => toggleFullscreen()}>
      <FightBoard night={night} big sound />
    </div>
  );
}

function BoardScreen() {
  const [focus, setFocus] = useBoardFocus();
  useEffect(() => {
    document.title = "Табло — Рукоборец";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А" || e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === "Escape" || e.key === "0") setFocus("all");
      if (["k", "K", "к", "К"].includes(e.key)) setFocus("team");
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 8) setFocus(n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFocus]);
  return <BoardView focus={focus} onFocus={setFocus} fullscreen={() => toggleFullscreen()} standalone />;
}

export default function Board() {
  if (new URLSearchParams(window.location.search).get("board") === "fights") return <FightsScreen />;
  return (
    <StoreProvider>
      <BoardScreen />
    </StoreProvider>
  );
}
