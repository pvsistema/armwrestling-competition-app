import { useEffect, useState } from "react";
import { LICENSE_URL, SERVER_PUB } from "./license";
import { desktopVersion } from "./boardSync";

export interface Release {
  version: string;
  notes: string;
  mandatory: boolean;
  published_at: string | null;
  file_name: string;
  size: number;
  url: string;
  kind?: "cdn" | "yadisk" | "";
  sha256?: string;
  sig?: string;
}

const CKEY = "rukoborec-update-check";
const SKIP = "rukoborec-update-skip";
const EVERY = 6 * 3600 * 1000;

export function cmpVer(a: string, b: string) {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

let inflight: Promise<Release | null> | null = null;
export function fetchLatest(): Promise<Release | null> {
  inflight ??= load().finally(() => setTimeout(() => (inflight = null), 5000));
  return inflight;
}

async function load(): Promise<Release | null> {
  const r = await fetch(LICENSE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "latest" }) });
  if (!r.ok) throw new Error("Сервер обновлений недоступен");
  return ((await r.json()) as { release: Release | null }).release;
}

const b64 = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

/** Подпись сервера на версию, SHA-256 и размер файла. */
export async function verifyRelease(r: Release): Promise<boolean> {
  if (!r.sig || !r.sha256 || !r.url || !crypto?.subtle) return false;
  try {
    const key = await crypto.subtle.importKey("spki", b64(SERVER_PUB), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64(r.sig), new TextEncoder().encode(`rukoborec-update|${r.version}|${r.sha256}|${r.size}`));
  } catch {
    return false;
  }
}

/** В браузере: Хранилище — скачивание напрямую, Яндекс Диск — открыть страницу файла. */
export async function downloadRelease(r: Release) {
  if (r.kind === "cdn") {
    const a = document.createElement("a");
    a.href = r.url;
    a.download = r.file_name || `Rukoborec-Setup-${r.version}.exe`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  window.open(r.url, "_blank", "noopener");
}

type WebView = { postMessage: (m: unknown) => void; addEventListener: (t: "message", f: (e: { data: unknown }) => void) => void; removeEventListener: (t: "message", f: (e: { data: unknown }) => void) => void };
export const webview = (): WebView | null => (window as unknown as { chrome?: { webview?: WebView } }).chrome?.webview ?? null;

/** Последняя опубликованная версия: проверка при запуске и раз в 6 часов (кэш на компьютере). */
export function useUpdate() {
  const [rel, setRel] = useState<Release | null>(null);
  const [skipped, setSkipped] = useState<string | null>(null);
  const [cur, setCur] = useState<string | null>(null);
  useEffect(() => {
    setCur(desktopVersion());
    setSkipped(localStorage.getItem(SKIP));
    let cached: { at: number; rel: Release | null } | null = null;
    try {
      cached = JSON.parse(localStorage.getItem(CKEY) || "null");
    } catch {
      cached = null;
    }
    if (cached) setRel(cached.rel);
    const check = () =>
      fetchLatest()
        .then((r) => {
          localStorage.setItem(CKEY, JSON.stringify({ at: Date.now(), rel: r }));
          setRel(r);
        })
        .catch(() => {});
    if (!cached || Date.now() - cached.at > EVERY) check();
    const t = setInterval(check, EVERY);
    return () => clearInterval(t);
  }, []);
  const isNew = !!rel && (!cur || cmpVer(rel.version, cur) > 0);
  return {
    rel,
    current: cur,
    desktop: !!cur,
    available: isNew && !!cur,
    hidden: !!rel && skipped === rel.version && !rel.mandatory,
    skip: () => {
      if (!rel) return;
      localStorage.setItem(SKIP, rel.version);
      setSkipped(rel.version);
    },
  };
}
