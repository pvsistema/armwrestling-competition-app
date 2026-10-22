import { useCallback, useEffect, useState } from "react";

export type StreamKind = "youtube" | "rutube" | "vk" | "twitch" | "hls" | "video" | "mjpeg" | "iframe";

export interface Stream {
  id: string;
  title: string;
  url: string;
  muted?: boolean;
}

export const KIND_LABEL: Record<StreamKind, string> = {
  youtube: "YouTube",
  rutube: "RUTUBE",
  vk: "VK Видео",
  twitch: "Twitch",
  hls: "HLS-поток (.m3u8)",
  video: "Видеофайл / MP4",
  mjpeg: "IP-камера (MJPEG / снимок)",
  iframe: "Встроенная страница",
};

/** Определяет тип ссылки и превращает её в адрес для встраивания. */
export function parseStream(raw: string, muted = true): { kind: StreamKind; src: string } {
  const url = raw.trim();
  const m = (re: RegExp) => url.match(re);
  const mute = muted ? 1 : 0;
  let r: RegExpMatchArray | null;

  if ((r = m(/<iframe[^>]+src=["']([^"']+)["']/i))) return parseStream(r[1], muted).kind === "iframe" ? { kind: "iframe", src: r[1] } : parseStream(r[1], muted);

  if ((r = m(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i)))
    return { kind: "youtube", src: `https://www.youtube.com/embed/${r[1]}?autoplay=1&mute=${mute}&playsinline=1&rel=0` };

  if ((r = m(/rutube\.ru\/(?:video|live\/video|play\/embed|video\/private)\/([\da-f]{32})/i)))
    return { kind: "rutube", src: `https://rutube.ru/play/embed/${r[1]}?autoplay=1&mute=${mute}` };

  if ((r = m(/vk(?:video)?\.(?:com|ru)\/video(-?\d+)_(\d+)/i)))
    return { kind: "vk", src: `https://vkvideo.ru/video_ext.php?oid=${r[1]}&id=${r[2]}&hd=2&autoplay=1` };
  if (m(/vk(?:video)?\.(?:com|ru)\/video_ext\.php/i)) return { kind: "vk", src: url };

  if ((r = m(/twitch\.tv\/(?!videos)([\w]+)/i)))
    return { kind: "twitch", src: `https://player.twitch.tv/?channel=${r[1]}&parent=${location.hostname}&muted=${muted}` };

  if (m(/\.m3u8(\?|$)/i)) return { kind: "hls", src: url };
  if (m(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return { kind: "video", src: url };
  if (m(/(mjpe?g|snapshot|\.cgi|\/video\.cgi|action=stream|\.jpe?g(\?|$)|\/shot\.jpg)/i)) return { kind: "mjpeg", src: url };
  return { kind: "iframe", src: url };
}

const KEY = "armsport-streams";
const LKEY = "armsport-streams-layout";
const SKEY = "armsport-streams-main";
export type Layout = 1 | 2 | 4 | 6;

function read(): Stream[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

const subs = new Set<() => void>();
const ping = () => subs.forEach((f) => f());
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === LKEY || e.key === SKEY) ping();
  });

/** Камеры и трансляции — общие для главного окна и окна показа. */
export function useStreams() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  const list = read();
  const layout = (Number(localStorage.getItem(LKEY)) || 4) as Layout;
  const main = localStorage.getItem(SKEY) || null;
  const save = useCallback((l: Stream[]) => {
    localStorage.setItem(KEY, JSON.stringify(l));
    ping();
  }, []);
  const setLayout = useCallback((l: Layout) => {
    localStorage.setItem(LKEY, String(l));
    ping();
  }, []);
  const setMain = useCallback((id: string | null) => {
    if (id) localStorage.setItem(SKEY, id);
    else localStorage.removeItem(SKEY);
    ping();
  }, []);
  return { list, save, layout, setLayout, main, setMain };
}

export const sid = () => Math.random().toString(36).slice(2, 10);
