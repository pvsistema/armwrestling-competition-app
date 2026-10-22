import { Overlay } from "@/lib/streams";
import { useBarData } from "@/lib/overlayBar";
import OverlayBar from "./OverlayBar";

/** Плашка поверх видео в программе — те же данные, что уходят в OBS. */
export default function LiveOverlay({ o }: { o: Overlay }) {
  const bar = useBarData(o);
  if (!bar) return null;
  return <OverlayBar bar={bar} size={o.size} pos={o.pos} />;
}
