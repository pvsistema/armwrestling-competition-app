import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { cab } from "@/lib/cabinet";
import { cn } from "@/lib/utils";

interface Rep {
  id: number;
  login: string;
  name: string;
  team: string;
  phone: string;
  active: boolean;
  created_at: string;
  last_login: string | null;
  athletes: number;
  entries: number;
}
interface F {
  login: string;
  password: string;
  name: string;
  team: string;
  phone: string;
  active: boolean;
}
const EMPTY: F = { login: "", password: "", name: "", team: "", phone: "", active: true };

const genPass = () => {
  const al = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => al[b % al.length]).join("");
};

function RepForm({ init, edit, onSave, onCancel }: { init: F; edit?: boolean; onSave: (f: F) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState(init);
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Команда / субъект
          <input className="field" value={f.team} onChange={(e) => set({ team: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          ФИО представителя
          <input className="field" value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Телефон
          <input className="field" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          Логин
          <input className="field font-mono" disabled={edit} value={f.login} onChange={(e) => set({ login: e.target.value.trim().toLowerCase() })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-panel-muted">
          {edit ? "Новый пароль (пусто — не менять)" : "Пароль"}
          <div className="flex gap-1.5">
            <input className="field font-mono" value={f.password} onChange={(e) => set({ password: e.target.value })} />
            <button type="button" className="pill !px-3" title="Придумать пароль" onClick={() => set({ password: genPass() })}>
              <Icon name="Dices" size={15} />
            </button>
          </div>
        </label>
        {edit && (
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" checked={!f.active} onChange={(e) => set({ active: !e.target.checked })} /> Закрыть доступ
          </label>
        )}
      </div>
      <div className="flex gap-2">
        <button className="btn-blue" onClick={() => onSave(f)}>
          <Icon name="Save" size={17} /> {edit ? "Сохранить" : "Создать доступ"}
        </button>
        <button className="pill" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function AdminReps({ pass }: { pass: string }) {
  const [list, setList] = useState<Rep[]>([]);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [fresh, setFresh] = useState<{ login: string; password: string } | null>(null);
  const H = { "X-Admin-Password": pass };

  const load = useCallback(async () => {
    try {
      const r = await cab<{ reps: Rep[] }>("reps_list", {}, { "X-Admin-Password": pass });
      setList(r.reps);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [pass]);

  useEffect(() => {
    load();
  }, [load]);

  const link = `${window.location.origin}/cabinet`;
  const copyText = (f: { login: string; password: string }) =>
    `Кабинет представителя: ${link}\nЛогин: ${f.login}\nПароль: ${f.password}`;

  return (
    <div className="flex flex-col gap-3">
      {err && <div className="rounded-lg bg-corner-red/10 px-4 py-2 text-sm text-corner-red">{err}</div>}
      {fresh && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-gold bg-gold/10 px-4 py-3 text-sm">
          <pre className="mr-auto whitespace-pre-wrap font-mono">{copyText(fresh)}</pre>
          <button className="pill !py-1.5" onClick={() => navigator.clipboard.writeText(copyText(fresh))}>
            <Icon name="Copy" size={15} /> Копировать для отправки
          </button>
          <button className="text-panel-muted" onClick={() => setFresh(null)}>
            <Icon name="X" size={18} />
          </button>
        </div>
      )}
      {creating ? (
        <div className="win gap-3 p-4">
          <div className="text-lg font-semibold">Новый представитель</div>
          <RepForm
            init={{ ...EMPTY, password: genPass() }}
            onCancel={() => setCreating(false)}
            onSave={async (f) => {
              try {
                setErr("");
                await cab("rep_create", { ...f }, H);
                setFresh({ login: f.login, password: f.password });
                setCreating(false);
                load();
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-gold" onClick={() => setCreating(true)}>
            <Icon name="UserPlus" size={18} /> Добавить представителя
          </button>
          <span className="ml-auto text-sm text-panel-muted">
            Ссылка на кабинет: <span className="font-mono text-foreground">{link}</span>
          </span>
        </div>
      )}
      {list.map((r) =>
        editId === r.id ? (
          <div key={r.id} className="win gap-3 p-4">
            <RepForm
              edit
              init={{ login: r.login, password: "", name: r.name, team: r.team, phone: r.phone, active: r.active }}
              onCancel={() => setEditId(null)}
              onSave={async (f) => {
                try {
                  setErr("");
                  await cab("rep_update", { id: r.id, ...f }, H);
                  if (f.password) setFresh({ login: r.login, password: f.password });
                  setEditId(null);
                  load();
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            />
          </div>
        ) : (
          <div key={r.id} className={cn("win flex-row flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3", !r.active && "opacity-60")}>
            <div className="mr-auto">
              <div className="font-medium">
                {r.team || "—"} <span className="font-normal text-panel-muted">· {r.name}</span>
              </div>
              <div className="text-sm text-panel-muted">
                логин <span className="font-mono text-foreground">{r.login}</span>
                {r.phone && ` · ${r.phone}`}
                {r.last_login ? ` · входил ${new Date(r.last_login).toLocaleDateString("ru-RU")}` : " · ещё не входил"}
              </div>
            </div>
            {!r.active && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">доступ закрыт</span>}
            <span className="text-sm">
              спортсменов: <b>{r.athletes}</b> · заявок: <b>{r.entries}</b>
            </span>
            <button className="pill !px-3 !py-1.5 text-xs" onClick={() => setEditId(r.id)}>
              <Icon name="Pencil" size={14} /> Изменить
            </button>
            <button
              className="pill !px-3 !py-1.5 text-xs hover:!text-corner-red"
              onClick={async () => {
                if (!confirm(`Удалить представителя ${r.team} (${r.name}) вместе с его спортсменами и заявками?`)) return;
                await cab("rep_delete", { id: r.id }, H).catch(() => {});
                load();
              }}
            >
              <Icon name="Trash2" size={14} />
            </button>
          </div>
        ),
      )}
      {!list.length && !creating && <div className="win items-center p-10 text-center text-panel-muted">Представителей пока нет</div>}
    </div>
  );
}
