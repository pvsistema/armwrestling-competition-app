import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import Logo from "@/components/arm/Logo";
import { LICENSE_URL } from "@/lib/license";
import { cn } from "@/lib/utils";

interface Device {
  id: number;
  device_name: string;
  activated_at: string;
  last_seen: string;
}
interface Lic {
  id: number;
  key: string;
  holder: string;
  contact: string;
  note: string;
  max_devices: number;
  expires_at: string | null;
  blocked: boolean;
  created_at: string;
  state: "ok" | "blocked" | "expired";
  devices: Device[];
}
interface Form {
  holder: string;
  contact: string;
  note: string;
  max_devices: number;
  expires: string;
  blocked: boolean;
}

const PKEY = "armsport-admin-pass";
const EMPTY: Form = { holder: "", contact: "", note: "", max_devices: 1, expires: "", blocked: false };
const STATE: Record<Lic["state"], { t: string; c: string }> = {
  ok: { t: "Активен", c: "bg-emerald-100 text-emerald-800" },
  expired: { t: "Истёк", c: "bg-amber-100 text-amber-800" },
  blocked: { t: "Заблокирован", c: "bg-red-100 text-red-700" },
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("ru-RU") : "—");
const fmtDT = (d: string) => new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const plus = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

async function api(pass: string, action: string, body: Record<string, unknown> = {}) {
  const r = await fetch(LICENSE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Password": pass },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Ошибка сервера");
  return j;
}

function Login({ onOk }: { onOk: (p: string) => void }) {
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      await api(p, "login");
      sessionStorage.setItem(PKEY, p);
      onOk(p);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="navy-band flex min-h-screen items-center justify-center p-4">
      <div className="win w-full max-w-sm gap-4 p-6">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-12" />
          <div>
            <div className="text-lg font-semibold">Админ-панель</div>
            <div className="text-sm text-panel-muted">Ключи активации «Рукоборец»</div>
          </div>
        </div>
        <input
          type="password"
          className="field"
          placeholder="Пароль администратора"
          value={p}
          onChange={(e) => setP(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && p && go()}
          autoFocus
        />
        {err && <div className="rounded-lg bg-corner-red/10 px-3 py-2 text-sm text-corner-red">{err}</div>}
        <button className="btn-blue" disabled={!p || busy} onClick={go}>
          {busy ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="LogIn" size={17} />} Войти
        </button>
      </div>
    </div>
  );
}

function LicForm({ init, onSave, onCancel, edit }: { init: Form; onSave: (f: Form) => Promise<void>; onCancel: () => void; edit?: boolean }) {
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const terms: [string, string][] = [
    ["Бессрочно", ""],
    ["1 месяц", plus(1)],
    ["3 месяца", plus(3)],
    ["6 месяцев", plus(6)],
    ["1 год", plus(12)],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Кому выдан
          <input className="field" placeholder="ФИО или организация" value={f.holder} onChange={(e) => set({ holder: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Контакт
          <input className="field" placeholder="Телефон или почта" value={f.contact} onChange={(e) => set({ contact: e.target.value })} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Компьютеров
          <input
            type="number"
            min={1}
            max={100}
            className="field w-28"
            value={f.max_devices}
            onChange={(e) => set({ max_devices: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Действует до
          <input type="date" className="field w-44" value={f.expires} onChange={(e) => set({ expires: e.target.value })} />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {terms.map(([t, d]) => (
            <button key={t} type="button" className={cn("pill !px-3 !py-1.5 text-xs", f.expires === d && "pill-on")} onClick={() => set({ expires: d })}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1 text-xs text-panel-muted">
        Заметка
        <textarea className="field min-h-[60px]" placeholder="Например: оплата 12.10, счёт № 15" value={f.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      {edit && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.blocked} onChange={(e) => set({ blocked: e.target.checked })} /> Заблокировать ключ
        </label>
      )}
      <div className="flex gap-2">
        <button
          className="btn-blue"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onSave(f);
            setBusy(false);
          }}
        >
          <Icon name={edit ? "Save" : "KeyRound"} size={17} /> {edit ? "Сохранить" : "Выдать ключ"}
        </button>
        <button className="pill" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const [pass, setPass] = useState(() => sessionStorage.getItem(PKEY) || "");
  const [list, setList] = useState<Lic[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Админ-панель — Рукоборец";
  }, []);

  const call = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      try {
        setErr("");
        return await api(pass, action, body);
      } catch (e) {
        const m = (e as Error).message;
        if (m === "Неверный пароль") {
          sessionStorage.removeItem(PKEY);
          setPass("");
        }
        setErr(m);
        throw e;
      }
    },
    [pass],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await call("list");
      setList(r.licenses);
    } catch {
      /* ошибка показана */
    }
    setLoading(false);
  }, [call]);

  useEffect(() => {
    if (pass) load();
  }, [pass, load]);

  const copy = (k: string) => {
    navigator.clipboard.writeText(k);
    setCopied(k);
    setTimeout(() => setCopied(null), 1500);
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((l) => !s || [l.key, l.holder, l.contact, l.note].some((x) => x.toLowerCase().includes(s)));
  }, [list, q]);

  const stats = useMemo(
    () => ({
      total: list.length,
      ok: list.filter((l) => l.state === "ok").length,
      devices: list.reduce((n, l) => n + l.devices.length, 0),
    }),
    [list],
  );

  if (!pass) return <Login onOk={setPass} />;

  return (
    <div className="min-h-screen bg-background">
      <div className="navy-band border-b-2 border-gold/70 text-white">
        <div className="tricolor" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo className="h-10 w-10" />
          <div className="mr-auto">
            <div className="font-semibold">Админ-панель</div>
            <div className="text-xs text-white/70">Ключи активации полной версии</div>
          </div>
          <a href="/" className="pill">
            <Icon name="ArrowLeft" size={15} /> В программу
          </a>
          <button
            className="pill"
            onClick={() => {
              sessionStorage.removeItem(PKEY);
              setPass("");
            }}
          >
            <Icon name="LogOut" size={15} /> Выйти
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Ключей выдано", stats.total, "KeyRound"],
            ["Действующих", stats.ok, "BadgeCheck"],
            ["Компьютеров активировано", stats.devices, "Monitor"],
          ].map(([t, v, i]) => (
            <div key={t as string} className="win flex-row items-center gap-3 px-4 py-3">
              <Icon name={i as string} size={22} className="text-gold" />
              <div>
                <div className="text-2xl font-semibold">{v}</div>
                <div className="text-xs text-panel-muted">{t}</div>
              </div>
            </div>
          ))}
        </div>

        {err && <div className="rounded-lg bg-corner-red/10 px-4 py-2 text-sm text-corner-red">{err}</div>}

        {fresh && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-gold bg-gold/10 px-4 py-3">
            <Icon name="PartyPopper" size={20} className="text-gold" />
            <span>Новый ключ:</span>
            <span className="font-mono text-lg font-semibold tracking-wider">{fresh}</span>
            <button className="pill !py-1.5" onClick={() => copy(fresh)}>
              <Icon name={copied === fresh ? "Check" : "Copy"} size={15} /> {copied === fresh ? "Скопирован" : "Копировать"}
            </button>
            <button className="ml-auto text-panel-muted hover:text-foreground" onClick={() => setFresh(null)}>
              <Icon name="X" size={18} />
            </button>
          </div>
        )}

        {creating ? (
          <div className="win gap-3 p-4">
            <div className="text-lg font-semibold">Новый ключ</div>
            <LicForm
              init={EMPTY}
              onCancel={() => setCreating(false)}
              onSave={async (f) => {
                try {
                  const r = await call("create", f as unknown as Record<string, unknown>);
                  setFresh(r.key);
                  setCreating(false);
                  load();
                } catch {
                  /* ошибка показана */
                }
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-gold" onClick={() => setCreating(true)}>
              <Icon name="Plus" size={18} /> Выдать ключ
            </button>
            <input className="field ml-auto w-full max-w-xs" placeholder="Поиск: ключ, имя, контакт" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="pill" onClick={load} title="Обновить">
              <Icon name="RefreshCw" size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {shown.map((l) =>
            editId === l.id ? (
              <div key={l.id} className="win gap-3 p-4">
                <div className="font-mono font-semibold">{l.key}</div>
                <LicForm
                  edit
                  init={{ holder: l.holder, contact: l.contact, note: l.note, max_devices: l.max_devices, expires: l.expires_at?.slice(0, 10) ?? "", blocked: l.blocked }}
                  onCancel={() => setEditId(null)}
                  onSave={async (f) => {
                    try {
                      await call("update", { id: l.id, ...f });
                      setEditId(null);
                      load();
                    } catch {
                      /* ошибка показана */
                    }
                  }}
                />
              </div>
            ) : (
              <div key={l.id} className="win gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button className="flex items-center gap-1.5 font-mono font-semibold tracking-wider hover:text-primary" onClick={() => copy(l.key)} title="Копировать ключ">
                    {l.key} <Icon name={copied === l.key ? "Check" : "Copy"} size={14} className="text-panel-muted" />
                  </button>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATE[l.state].c)}>{STATE[l.state].t}</span>
                  <span className="font-medium">{l.holder || <span className="text-panel-muted">без имени</span>}</span>
                  {l.contact && <span className="text-sm text-panel-muted">{l.contact}</span>}
                  <div className="ml-auto flex gap-1.5">
                    <button className="pill !px-3 !py-1.5 text-xs" onClick={() => setEditId(l.id)}>
                      <Icon name="Pencil" size={14} /> Изменить
                    </button>
                    <button
                      className="pill !px-3 !py-1.5 text-xs hover:!border-corner-red hover:!text-corner-red"
                      onClick={async () => {
                        if (!confirm(`Удалить ключ ${l.key}? Все компьютеры с ним перейдут в демо-режим.`)) return;
                        await call("delete", { id: l.id }).catch(() => {});
                        load();
                      }}
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-panel-muted">
                  <span>
                    Компьютеры:{" "}
                    <b className={cn("text-foreground", l.devices.length >= l.max_devices && "text-amber-700")}>
                      {l.devices.length} из {l.max_devices}
                    </b>
                  </span>
                  <span>
                    Действует: <b className="text-foreground">{l.expires_at ? `до ${fmt(l.expires_at)}` : "бессрочно"}</b>
                  </span>
                  <span>Выдан: {fmt(l.created_at)}</span>
                </div>
                {l.note && <div className="text-sm italic text-foreground/70">{l.note}</div>}
                {l.devices.length > 0 && (
                  <div className="flex flex-col divide-y divide-line rounded-lg bg-surface text-sm">
                    {l.devices.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5">
                        <Icon name="Monitor" size={15} className="text-panel-muted" />
                        <span className="font-medium">{d.device_name || "Компьютер"}</span>
                        <span className="text-xs text-panel-muted">активирован {fmtDT(d.activated_at)}</span>
                        <span className="text-xs text-panel-muted">последний вход {fmtDT(d.last_seen)}</span>
                        <button
                          className="ml-auto text-xs text-corner-red hover:underline"
                          onClick={async () => {
                            if (!confirm("Отвязать этот компьютер? Место освободится, программа на нём перейдёт в демо-режим.")) return;
                            await call("release", { device_id: d.id }).catch(() => {});
                            load();
                          }}
                        >
                          Отвязать
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {!shown.length && !loading && (
            <div className="win items-center p-10 text-center text-panel-muted">{list.length ? "Ничего не найдено" : "Ключей пока нет — нажмите «Выдать ключ»"}</div>
          )}
        </div>
      </div>
    </div>
  );
}
