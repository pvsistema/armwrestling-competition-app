import { useSyncExternalStore } from "react";
import func2url from "../../backend/func2url.json";

export const LICENSE_URL = (func2url as Record<string, string>).license;
export const DEMO_ATHLETES = 20;
export const DEMO_TABLES = 1;

const LKEY = "armsport-license";
const DKEY = "armsport-device";

export interface License {
  key: string;
  holder: string;
  expires: string | null;
  checkedAt: number;
  /** Подписанное сервером подтверждение (ключ + компьютер + срок работы без интернета). */
  token?: string;
  until?: number;
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

/** Открытый ключ сервера активации: им проверяется подпись подтверждения. */
const SERVER_PUB = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcZ1yAYZ/vDEXD0E+4MGrhNuap/f7KnckVvOq/KBzwfmDpT/aoPuU+6gMtOBi5+F7FoPijWj1wraMEVGa2a/DXw==";
const TKEY = "armsport-license-t";
const CLOCK_SLACK = 2 * 86400000;

interface Claims {
  k: string;
  d: string;
  h: string;
  e: string | null;
  i: number;
  x: number;
}

function read(): License | null {
  try {
    const raw = localStorage.getItem(LKEY);
    return raw ? (JSON.parse(raw) as License) : null;
  } catch {
    return null;
  }
}

const b64 = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(t + "=".repeat((4 - (t.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

let pub: Promise<CryptoKey> | null = null;
async function verifyToken(token: string, device: string): Promise<Claims | null> {
  try {
    const [p, sig] = token.split(".");
    if (!p || !sig || !crypto?.subtle) return null;
    pub ??= crypto.subtle.importKey("spki", b64(SERVER_PUB), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await pub, b64(sig), new TextEncoder().encode(p));
    if (!ok) return null;
    const c = JSON.parse(new TextDecoder().decode(b64(p))) as Claims;
    return c.d === device ? c : null;
  } catch {
    return null;
  }
}

/** Самое позднее время, которое видела программа: защита от перевода часов назад. */
function clockMark(now = Date.now()) {
  const m = Number(localStorage.getItem(TKEY)) || 0;
  if (now > m) localStorage.setItem(TKEY, String(now));
  return Math.max(m, now);
}

let current: License | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

async function adopt(raw: License | null) {
  const c = raw?.token ? await verifyToken(raw.token, deviceId()) : null;
  if (c) clockMark(Math.max(Date.now(), c.i));
  current = c ? { key: c.k, holder: c.h, expires: c.e, checkedAt: c.i, token: raw!.token, until: c.x } : null;
  emit();
}

function save(l: License | null) {
  if (l) localStorage.setItem(LKEY, JSON.stringify(l));
  else localStorage.removeItem(LKEY);
  return adopt(l);
}

if (typeof window !== "undefined") {
  adopt(read());
  window.addEventListener("storage", (e) => {
    if (e.key === LKEY) adopt(read());
  });
  setInterval(() => {
    clockMark();
    emit();
  }, 10 * 60000);
}

export function isFull(l: License | null = current) {
  if (!l?.until) return false;
  const now = Date.now();
  if (now + CLOCK_SLACK < clockMark(now)) return false;
  if (now + CLOCK_SLACK < l.checkedAt) return false;
  return now < l.until;
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

/** Номер компьютера: в программе для Windows — по оборудованию, в браузере — случайный. */
const hardwareId = () => {
  const h = typeof window !== "undefined" ? (window as unknown as { __armHw?: unknown }).__armHw : undefined;
  return typeof h === "string" && /^[0-9a-f]{32,64}$/.test(h) ? h : null;
};

function legacyId() {
  let id = localStorage.getItem(DKEY);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DKEY, id);
  }
  return id;
}

export function deviceId() {
  return hardwareId() ?? legacyId();
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : /iPhone|iPad/.test(ua) ? "iOS" : "Компьютер";
  const br = /ArmsportDesktop/.test(ua) ? "программа Армспорт" : /YaBrowser/.test(ua) ? "Яндекс Браузер" : /Edg\//.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "";
  return [os, br].filter(Boolean).join(", ");
}

type Answer = { ok: boolean; reason?: Reason; key?: string; holder?: string; expires?: string | null; token?: string };

async function call(action: "activate" | "check" | "rebind", key: string, old?: string) {
  const r = await fetch(LICENSE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, key, device: deviceId(), old, name: deviceName() }),
  });
  return (await r.json()) as Answer;
}

const fromAnswer = (r: Answer, key: string): License => ({ key: r.key ?? key, holder: r.holder ?? "", expires: r.expires ?? null, checkedAt: Date.now(), token: r.token });

export async function activate(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await call("activate", key);
    if (!r.ok) return { ok: false, error: REASON_TEXT[r.reason ?? "not_found"] };
    await save(fromAnswer(r, key));
    if (!current) return { ok: false, error: "Ответ сервера активации не прошёл проверку подлинности." };
    return { ok: true };
  } catch {
    return { ok: false, error: REASON_TEXT.network };
  }
}

/** Проверка ключа при запуске: продлевает подтверждение; если сервер отозвал ключ — демо-режим. */
export async function recheck() {
  const l = read();
  if (!l?.key) return;
  const hw = hardwareId();
  const old = localStorage.getItem(DKEY);
  const moving = !!hw && !!old && old !== hw;
  try {
    const r = moving ? await call("rebind", l.key, old!) : await call("check", l.key);
    if (r.ok) {
      await save(fromAnswer(r, l.key));
      if (moving && current) localStorage.removeItem(DKEY);
    }
    else if (r.reason !== "bad_request") await save(null);
  } catch {
    /* нет сети — работаем по сохранённому подтверждению */
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