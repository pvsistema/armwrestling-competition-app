import { useCallback, useEffect, useState } from "react";
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
  mandatory: boolean;
  published: boolean;
  created_at: string;
  published_at: string | null;
}

const kindOf = (u: string): "cdn" | "yadisk" | "" => {
  try {
    const h = new URL(u.trim()).hostname.toLowerCase();
    if (!u.trim().startsWith("https://")) return "";
    if (h === "cdn.poehali.dev") return "cdn";
    if (["yadi.sk", "disk.yandex.ru", "disk.yandex.com", "disk.360.yandex.ru"].includes(h) || h.endsWith(".yadi.sk")) return "yadisk";
  } catch {
    /* не ссылка */
  }
  return "";
};
const KIND_LABEL = { cdn: "Хранилище poehali.dev", yadisk: "Яндекс Диск" } as const;

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
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

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

  const kind = kindOf(url);

  const onUrl = (v: string) => {
    setUrl(v);
    const m = decodeURIComponent(v).match(/(\d+\.\d+(?:\.\d+){0,2})(?=[^/]*$)/);
    if (m && !version) setVersion(m[1]);
  };

  const publish = async (on: boolean) => {
    if (!/^\d+(\.\d+){0,3}$/.test(version.trim())) return setErr("Номер версии в формате 1.0.1");
    if (!kind) return setErr("Вставьте ссылку из Хранилища (https://cdn.poehali.dev/…) или публичную ссылку Яндекс Диска");
    if (list.some((r) => r.version === version.trim())) return setErr(`Версия ${version} уже есть — удалите её или укажите другой номер`);
    if (latest && cmpVer(version.trim(), latest.version) <= 0 && !confirm(`Опубликованная версия ${latest.version} новее или такая же. Всё равно добавить ${version}?`)) return;
    setErr("");
    try {
      const body: Record<string, unknown> = { version: version.trim(), notes, mandatory, url: url.trim(), publish: on };
      if (kind === "cdn") {
        setBusy("Скачиваю файл из Хранилища, чтобы посчитать контрольную сумму…");
        const res = await fetch(url.trim(), { cache: "no-store" });
        if (!res.ok) throw new Error("Файл по ссылке не открывается — проверьте ссылку");
        const buf = await res.arrayBuffer();
        body.sha256 = hex(await crypto.subtle.digest("SHA-256", buf));
        body.size = buf.byteLength;
      } else setBusy("Проверяю файл на Яндекс Диске…");
      await call(pass, "rel_create", body);
      setUrl("");
      setVersion("");
      setNotes("");
      setMandatory(false);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
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
            2. Загрузите <b>desktop\release\Rukoborec-Setup-X.Y.Z.exe</b> в Хранилище проекта (Ядро → Хранилище → Загрузить) и скопируйте ссылку на файл.
            Подойдёт и публичная ссылка Яндекс Диска.<br />
            Программы на компьютерах увидят обновление при запуске (и раз в 6 часов) и установят его в один клик. На сайте появится кнопка «Программа для Windows».
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-panel-muted">Ссылка на файл установщика</span>
            <input
              className={cn("field !h-9", url.trim() && !kind && "!border-corner-red")}
              value={url}
              onChange={(e) => onUrl(e.target.value)}
              placeholder="https://cdn.poehali.dev/…/Rukoborec-Setup-1.0.1.exe"
            />
            <span className={cn("text-xs", url.trim() && !kind ? "text-corner-red" : "text-panel-muted")}>
              {kind ? `Источник: ${KIND_LABEL[kind]}` : url.trim() ? "Нужна ссылка https://cdn.poehali.dev/… или disk.yandex.ru / yadi.sk" : "Хранилище poehali.dev или публичная ссылка Яндекс Диска"}
            </span>
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
          {busy && (
            <div className="flex items-center gap-2 text-xs text-panel-muted">
              <Icon name="Loader2" size={14} className="animate-spin" /> {busy}
            </div>
          )}
          {err && <div className="rounded-lg border border-corner-red/40 bg-corner-red/5 px-3 py-2 text-corner-red">{err}</div>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-blue flex-1" disabled={!!busy || !kind || !version.trim()} onClick={() => publish(true)}>
              <Icon name="Rocket" size={16} /> Опубликовать установщик
            </button>
            <button className="pill" disabled={!!busy || !kind || !version.trim()} onClick={() => publish(false)} title="Сохранить без публикации — опубликуете позже">
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
            const k = kindOf(r.file_url);
            const broken = !k || !r.sha256;
            return (
              <div key={r.id} className={cn("rounded-[12px] border p-3", r.published ? "border-gold/60 bg-gold/5" : "border-line")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-bold">{r.version}</span>
                  <span className={cn("rounded-full px-2 text-xs font-semibold", r.published ? "bg-primary text-primary-foreground" : broken ? "bg-corner-red/10 text-corner-red" : "bg-surface text-panel-muted")}>
                    {r.published ? "опубликована" : broken ? "старый формат — удалите" : "черновик"}
                  </span>
                  {r.mandatory && <span className="rounded-full bg-corner-red/10 px-2 text-xs font-semibold text-corner-red">обязательная</span>}
                  {!!r.sha256 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-600/30 bg-green-50 px-2 text-xs font-semibold text-green-700" title={`SHA-256: ${r.sha256}`}>
                      <Icon name="ShieldCheck" size={12} /> файл подписан
                    </span>
                  )}
                  <span className="ml-auto text-xs text-panel-muted">
                    {k ? `${KIND_LABEL[k]} · ` : ""}
                    <a href={r.file_url} target="_blank" rel="noreferrer" className="underline">
                      {r.file_name || "файл"}
                    </a>
                    {r.file_size ? ` · ${fmtMb(r.file_size)}` : ""}
                  </span>
                </div>
                {r.notes && <div className="mt-1.5 whitespace-pre-line text-sm text-panel-muted">{r.notes}</div>}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-panel-muted">Добавлена {fmtDT(r.created_at)}{r.published_at ? ` · опубликована ${fmtDT(r.published_at)}` : ""}</span>
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
                    <button className="pill !px-2 !py-1 text-xs text-corner-red" onClick={() => act("rel_delete", { id: r.id }, `Удалить версию ${r.version}? Файл в Хранилище или на Яндекс Диске останется.`)}>
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
