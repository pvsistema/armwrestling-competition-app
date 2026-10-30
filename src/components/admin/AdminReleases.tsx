import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { LICENSE_URL } from "@/lib/license";
import { cmpVer } from "@/lib/updates";

interface Rel {
  id: number;
  version: string;
  notes: string;
  file_url: string;
  file_name: string;
  file_size: number;
  sha256: string;
  parts: number;
  mandatory: boolean;
  published: boolean;
  created_at: string;
  published_at: string | null;
}

const PART = 2 * 1024 * 1024;

async function call(pass: string, action: string, body: Record<string, unknown> = {}) {
  const r = await fetch(LICENSE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": pass },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Ошибка сервера");
  return j;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const toB64 = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const fmtMb = (b: number) => `${(b / 1048576).toFixed(1).replace(".", ",")} МБ`;
const fmtDT = (d: string | null) =>
  d ? new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Админ-панель: публикация новой версии программы для Windows. */
export default function AdminReleases({ pass }: { pass: string }) {
  const [list, setList] = useState<Rel[]>([]);
  const [err, setErr] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const inp = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setErr("");
      setList((await call(pass, "rel_list")).releases);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [pass]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = list.filter((r) => r.published).sort((a, b) => cmpVer(b.version, a.version))[0];

  const pick = (f: File | null) => {
    setFile(f);
    const m = f?.name.match(/(\d+\.\d+(?:\.\d+){0,2})/);
    if (m && !version) setVersion(m[1]);
  };

  const upload = async (publish: boolean) => {
    if (!file) return setErr("Выберите файл установщика Rukoborec-Setup-….exe");
    if (!/^\d+(\.\d+){0,3}$/.test(version.trim())) return setErr("Номер версии в формате 1.0.1");
    if (list.some((r) => r.version === version.trim())) return setErr(`Версия ${version} уже есть — удалите её или укажите другой номер`);
    if (latest && cmpVer(version.trim(), latest.version) <= 0 && !confirm(`Опубликованная версия ${latest.version} новее или такая же. Всё равно загрузить ${version}?`)) return;
    setErr("");
    setPct(0);
    try {
      const buf = await file.arrayBuffer();
      const sha256 = hex(await crypto.subtle.digest("SHA-256", buf));
      const { id } = await call(pass, "rel_create", { version: version.trim(), notes, mandatory, sha256, size: buf.byteLength, file_name: file.name });
      const n = Math.ceil(buf.byteLength / PART);
      for (let i = 0; i < n; i++) {
        let tries = 0;
        for (;;) {
          try {
            await call(pass, "rel_part", { id, n: i + 1, data: toB64(buf.slice(i * PART, (i + 1) * PART)) });
            break;
          } catch (e) {
            if (++tries >= 3) throw e;
          }
        }
        setPct(Math.round(((i + 1) * 100) / n));
      }
      if (publish) await call(pass, "rel_publish", { id, on: true, mandatory, notes });
      setFile(null);
      setVersion("");
      setNotes("");
      setMandatory(false);
      if (inp.current) inp.current.value = "";
      await load();
    } catch (e) {
      setErr((e as Error).message);
      await load();
    } finally {
      setPct(null);
    }
  };

  const act = async (action: string, body: Record<string, unknown>, ask?: string) => {
    if (ask && !confirm(ask)) return;
    try {
      setErr("");
      await call(pass, action, body);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <div className="win">
        <div className="win-bar">
          <i />
          <i />
          <i />
          <b>новая версия</b>
        </div>
        <div className="flex flex-col gap-3 p-4 text-sm">
          <div className="rounded-lg bg-tip px-3 py-2 text-xs leading-relaxed text-tip-foreground">
            1. В <b>desktop\version.txt</b> поставьте новый номер и соберите <b>build.bat</b>.<br />
            2. Загрузите сюда <b>desktop\release\Rukoborec-Setup-X.Y.Z.exe</b> и опубликуйте.<br />
            Программы на компьютерах увидят обновление при запуске (и раз в 6 часов) и установят его в один клик. На сайте появится кнопка «Программа для Windows».
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-panel-muted">Файл установщика</span>
            <input ref={inp} type="file" accept=".exe,.msi,.zip" className="field !h-auto py-2" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            {file && <span className="text-xs text-panel-muted">{file.name} · {fmtMb(file.size)}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-panel-muted">Номер версии (как в version.txt)</span>
            <input className="field !h-9 font-mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder={latest ? `новее ${latest.version}` : "1.0.1"} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-panel-muted">Что нового (увидят пользователи)</span>
            <textarea className="field min-h-[96px] py-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"— командный кубок\n— исправлена печать протоколов"} />
          </label>
          <button className={cn("pill self-start !px-3 !py-1.5 text-xs", mandatory && "pill-on")} onClick={() => setMandatory(!mandatory)}>
            <Icon name={mandatory ? "SquareCheck" : "Square"} size={14} /> Обязательное (нельзя пропустить)
          </button>
          {pct != null && (
            <div className="flex flex-col gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-panel-muted">Загрузка {pct}% — не закрывайте страницу</span>
            </div>
          )}
          {err && <div className="rounded-lg border border-corner-red/40 bg-corner-red/5 px-3 py-2 text-corner-red">{err}</div>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-blue flex-1" disabled={pct != null || !file} onClick={() => upload(true)}>
              <Icon name="Rocket" size={16} /> Загрузить и опубликовать
            </button>
            <button className="pill" disabled={pct != null || !file} onClick={() => upload(false)} title="Загрузить без публикации — опубликуете позже">
              <Icon name="Upload" size={15} /> Черновик
            </button>
          </div>
        </div>
      </div>

      <div className="win">
        <div className="win-bar">
          <i />
          <i />
          <i />
          <b>версии программы</b>
        </div>
        <div className="flex flex-col gap-2 p-4">
          {latest && (
            <div className="flex items-center gap-2 rounded-lg bg-gold-soft px-3 py-2 text-sm font-medium text-tip-foreground">
              <Icon name="BadgeCheck" size={16} /> Сейчас пользователям предлагается версия {latest.version}
            </div>
          )}
          {!list.length && <div className="py-8 text-center text-sm text-panel-muted">Версий пока нет.</div>}
          {list.map((r) => {
            const broken = !!r.sha256 && r.parts !== Math.ceil(r.file_size / PART);
            return (
              <div key={r.id} className={cn("rounded-[12px] border p-3", r.published ? "border-gold/60 bg-gold/5" : "border-line")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-bold">{r.version}</span>
                  <span className={cn("rounded-full px-2 text-xs font-semibold", r.published ? "bg-primary text-primary-foreground" : broken ? "bg-corner-red/10 text-corner-red" : "bg-surface text-panel-muted")}>
                    {r.published ? "опубликована" : broken ? "загружена не полностью" : "черновик"}
                  </span>
                  {r.mandatory && <span className="rounded-full bg-corner-red/10 px-2 text-xs font-semibold text-corner-red">обязательная</span>}
                  <span className="ml-auto text-xs text-panel-muted">
                    {r.file_name} · {r.file_size ? fmtMb(r.file_size) : "ссылка"}
                  </span>
                </div>
                {r.notes && <div className="mt-1.5 whitespace-pre-line text-sm text-panel-muted">{r.notes}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-panel-muted">Загружена {fmtDT(r.created_at)}{r.published_at ? ` · опубликована ${fmtDT(r.published_at)}` : ""}</span>
                  <span className="ml-auto flex gap-1.5">
                    {!r.published && !broken && (
                      <button className="pill !px-3 !py-1 text-xs" onClick={() => act("rel_publish", { id: r.id, on: true })}>
                        <Icon name="Rocket" size={13} /> Опубликовать
                      </button>
                    )}
                    {r.published && (
                      <button className="pill !px-3 !py-1 text-xs" onClick={() => act("rel_publish", { id: r.id, on: false }, `Снять версию ${r.version} с публикации? Пользователям снова будет предлагаться предыдущая.`)}>
                        <Icon name="EyeOff" size={13} /> Снять
                      </button>
                    )}
                    <button className="pill !px-3 !py-1 text-xs" onClick={() => act("rel_publish", { id: r.id, on: r.published, mandatory: !r.mandatory })}>
                      {r.mandatory ? "Сделать необязательной" : "Сделать обязательной"}
                    </button>
                    <button className="pill !px-2 !py-1 text-xs text-corner-red" onClick={() => act("rel_delete", { id: r.id }, `Удалить версию ${r.version} вместе с файлом?`)}>
                      <Icon name="Trash2" size={13} />
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
