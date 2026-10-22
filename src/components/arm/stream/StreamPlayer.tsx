import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Stream, parseStream } from "@/lib/streams";
import { cn } from "@/lib/utils";

function Hls({ src, muted }: { src: string; muted: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setErr("");
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
      return;
    }
    let hls: import("hls.js").default | null = null;
    import("hls.js").then(({ default: H }) => {
      if (!H.isSupported()) return setErr("Браузер не поддерживает HLS");
      hls = new H({ liveDurationInfinity: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(H.Events.ERROR, (_e, d) => {
        if (d.fatal) setErr("Поток недоступен — проверьте ссылку и что камера в сети");
      });
    });
    return () => hls?.destroy();
  }, [src]);
  return (
    <>
      <video ref={ref} autoPlay muted={muted} playsInline controls className="h-full w-full bg-black object-contain" />
      {err && <Err text={err} />}
    </>
  );
}

/** Снимок IP-камеры: MJPEG-поток показывается как есть, одиночный JPEG обновляется раз в секунду. */
function Mjpeg({ src }: { src: string }) {
  const still = /\.jpe?g(\?|$)|snapshot|shot\.jpg/i.test(src) && !/mjpe?g|stream/i.test(src);
  const [t, setT] = useState(Date.now());
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!still) return;
    const i = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(i);
  }, [still]);
  const url = still ? `${src}${src.includes("?") ? "&" : "?"}_t=${t}` : src;
  return (
    <>
      <img src={url} alt="" onError={() => setErr(true)} onLoad={() => setErr(false)} className="h-full w-full bg-black object-contain" />
      {err && <Err text="Камера не отвечает. Проверьте адрес, логин/пароль и что компьютер в той же сети." />}
    </>
  );
}

function Err({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-sm text-white/80">
      <Icon name="VideoOff" size={28} className="text-white/50" />
      {text}
    </div>
  );
}

export default function StreamPlayer({ s, className, muted: forceMuted }: { s: Stream; className?: string; muted?: boolean }) {
  const muted = forceMuted ?? s.muted ?? true;
  const { kind, src } = parseStream(s.url, muted);
  return (
    <div className={cn("relative overflow-hidden bg-black", className)}>
      {kind === "hls" ? (
        <Hls src={src} muted={muted} />
      ) : kind === "video" ? (
        <video src={src} autoPlay muted={muted} loop playsInline controls className="h-full w-full object-contain" />
      ) : kind === "mjpeg" ? (
        <Mjpeg src={src} />
      ) : (
        <iframe
          key={src}
          src={src}
          title={s.title}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
