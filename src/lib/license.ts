import { useSyncExternalStore } from "react";
import func2url from "../../backend/func2url.json";

export const LICENSE_URL = (func2url as Record<string, string>).license;
export const DEMO_ATHLETES = 10;
export const DEMO_TABLES = 1;

const LKEY = "armsport-license";
const DKEY = "armsport-device";
const OFFLINE_DAYS = 30;

export interface License {
  key: string;
  holder: string;
  expires: string | null;
  checkedAt: number;
}

type Reason = "not_found" | "blocked" | "expired" | "limit" | "device_released" | "bad_request" | "network";

export const REASON_TEXT: Record<Reason, string> = {
  not_found: "Ключ не найден. Проверьте, правильно ли он введён.",
  blocked: "Ключ заблокирован. Обратитесь к продавцу программы.",
  expired: "Срок действия ключа закончился.",
  limit: "Ключ уже активирован на максимальном числе компьютеров.",
  device_released: "Этот компьютер отвязан от ключа. Введите ключ заново.",
  bad_request: "Ключ введён неверно.",
  network: "Нет связи с сервером активации. Проверьте интернет.",
};

function read(): License | null {
  try {
    const raw = localStorage.getItem(LKEY);
    return raw ? (JSON.parse(raw) as License) : null;
  } catch {
    return null;
  }
}

let current = read();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function save(l: License | null) {
  current = l;
  if (l) localStorage.setItem(LKEY, JSON.stringify(l));
  else localStorage.removeItem(LKEY);
  emit();
}

if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === LKEY) {
      current = read();
      emit();
    }
  });

const today = () => new Date().toISOString().slice(0, 10);

export function isFull(l: License | null = current) {
  if (!l) return false;
  if (l.expires && l.expires < today()) return false;
  return Date.now() - l.checkedAt < OFFLINE_DAYS * 86400000;
}

export function useLicense() {
  const lic = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
  return { license: lic, full: isFull(lic), demo: !isFull(lic) };
}

export const isDemo = () => !isFull();

export function deviceId() {
  let id = localStorage.getItem(DKEY);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DKEY, id);
  }
  return id;
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "Компьютер";
  const br = /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "";
  return [os, br].filter(Boolean).join(", ");
}

async function call(action: "activate" | "check", key: string) {
  const r = await fetch(LICENSE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, key, device: deviceId(), name: deviceName() }),
  });
  return (await r.json()) as { ok: boolean; reason?: Reason; key?: string; holder?: string; expires?: string | null };
}

export async function activate(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await call("activate", key);
    if (!r.ok) return { ok: false, error: REASON_TEXT[r.reason ?? "not_found"] };
    save({ key: r.key!, holder: r.holder ?? "", expires: r.expires ?? null, checkedAt: Date.now() });
    return { ok: true };
  } catch {
    return { ok: false, error: REASON_TEXT.network };
  }
}

/** Проверка ключа при запуске: если сервер отозвал ключ — программа переходит в демо-режим. */
export async function recheck() {
  const l = current;
  if (!l) return;
  try {
    const r = await call("check", l.key);
    if (r.ok) save({ ...l, holder: r.holder ?? l.holder, expires: r.expires ?? null, checkedAt: Date.now() });
    else if (r.reason !== "bad_request") save(null);
  } catch {
    /* нет сети — работаем по сохранённой проверке */
  }
}

export function deactivateLocal() {
  save(null);
}

type Upsell = (reason: string) => void;
let upsell: Upsell = () => {};
export const onUpsell = (f: Upsell) => {
  upsell = f;
};
/** Показать окно «Полная версия» с объяснением, что упёрлось в ограничение демо. */
export const askUpgrade = (reason: string) => upsell(reason);

export const DEMO_MARK = "ДЕМОВЕРСИЯ";

/** Диагональная надпись «ДЕМОВЕРСИЯ» на каждой странице PDF. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pdfDemoMark(pdf: any, font = "NS") {
  if (!isDemo()) return;
  const n = pdf.getNumberOfPages();
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p);
    const gs = pdf.GState ? new pdf.GState({ opacity: 0.13 }) : null;
    if (gs) pdf.setGState(gs);
    pdf.setFont(font, "bold");
    pdf.setFontSize(Math.min(W, H) / 3.2);
    pdf.setTextColor(200, 30, 30);
    pdf.text(DEMO_MARK, W / 2, H / 2, { align: "center", baseline: "middle", angle: 30 });
    if (gs) pdf.setGState(new pdf.GState({ opacity: 1 }));
    pdf.setTextColor(0);
  }
}
