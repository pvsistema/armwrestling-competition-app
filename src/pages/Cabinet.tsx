import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import Logo from "@/components/arm/Logo";
import RepAthletes from "@/components/cabinet/RepAthletes";
import RepEntry from "@/components/cabinet/RepEntry";
import { EntryItem, IntakeTournament, RepAthlete, cab, fmtD, getToken, setToken } from "@/lib/cabinet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Rep {
  id: number;
  login: string;
  name: string;
  team: string;
  phone: string;
}
interface MyEntry {
  intake_id: number;
  items: EntryItem[];
  version: number;
  submitted_at: string;
  imported_version: number;
  open: boolean;
  tournament: string;
  date: string;
}

function Login({ onOk }: { onOk: () => void }) {
  const [login, setLogin] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await cab<{ token: string }>("login", { login, password: pw });
      setToken(r.token);
      onOk();
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
            <div className="text-lg font-semibold">Кабинет представителя</div>
            <div className="text-sm text-panel-muted">Заявки команд на соревнования</div>
          </div>
        </div>
        <input className="field" placeholder="Логин" value={login} onChange={(e) => setLogin(e.target.value)} autoFocus autoComplete="username" />
        <input
          type="password"
          className="field"
          placeholder="Пароль"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login && pw && go()}
          autoComplete="current-password"
        />
        {err && <div className="rounded-lg bg-corner-red/10 px-3 py-2 text-sm text-corner-red">{err}</div>}
        <button className="btn-blue" disabled={!login || !pw || busy} onClick={go}>
          {busy ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="LogIn" size={17} />} Войти
        </button>
        <p className="text-center text-xs text-panel-muted">Логин и пароль выдаёт организатор соревнований</p>
      </div>
    </div>
  );
}

function Password({ onClose }: { onClose: () => void }) {
  const [o, setO] = useState("");
  const [n, setN] = useState("");
  return (
    <div className="win flex-row flex-wrap items-end gap-3 p-4">
      <input type="password" className="field w-48" placeholder="Текущий пароль" value={o} onChange={(e) => setO(e.target.value)} />
      <input type="password" className="field w-48" placeholder="Новый пароль (от 6)" value={n} onChange={(e) => setN(e.target.value)} />
      <button
        className="btn-blue !py-2.5"
        disabled={!o || n.length < 6}
        onClick={async () => {
          try {
            await cab("password", { old: o, new: n });
            toast({ title: "Пароль изменён" });
            onClose();
          } catch (e) {
            toast({ title: "Не изменён", description: (e as Error).message, variant: "destructive" });
          }
        }}
      >
        Сменить пароль
      </button>
      <button className="pill" onClick={onClose}>
        Отмена
      </button>
    </div>
  );
}

export default function Cabinet() {
  const [authed, setAuthed] = useState(!!getToken());
  const [rep, setRep] = useState<Rep | null>(null);
  const [tab, setTab] = useState<"tournaments" | "athletes">("tournaments");
  const [athletes, setAthletes] = useState<RepAthlete[]>([]);
  const [intakes, setIntakes] = useState<IntakeTournament[]>([]);
  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [pwd, setPwd] = useState(false);

  useEffect(() => {
    document.title = "Кабинет представителя — Рукоборец";
  }, []);

  const fail = (e: unknown) => {
    if ((e as { status?: number }).status === 401) {
      setToken("");
      setAuthed(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const [me, a, i] = await Promise.all([
        cab<{ rep: Rep }>("me"),
        cab<{ athletes: RepAthlete[] }>("athletes"),
        cab<{ intakes: IntakeTournament[]; entries: MyEntry[] }>("intakes"),
      ]);
      setRep(me.rep);
      setAthletes(a.athletes);
      setIntakes(i.intakes);
      setEntries(i.entries);
    } catch (e) {
      fail(e);
    }
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const cur = intakes.find((x) => x.id === open);
  const sentFor = (id: number) => entries.find((e) => e.intake_id === id) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="navy-band border-b-2 border-gold/70 text-white">
        <div className="tricolor" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Logo className="h-10 w-10" />
          <div className="mr-auto">
            <div className="font-semibold">{rep?.team || "Кабинет представителя"}</div>
            <div className="text-xs text-white/70">{rep?.name}</div>
          </div>
          <button className="pill" onClick={() => setPwd((v) => !v)}>
            <Icon name="KeyRound" size={15} /> Пароль
          </button>
          <button
            className="pill"
            onClick={async () => {
              await cab("logout").catch(() => {});
              setToken("");
              setAuthed(false);
            }}
          >
            <Icon name="LogOut" size={15} /> Выйти
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5">
        {pwd && <Password onClose={() => setPwd(false)} />}

        {cur ? (
          <RepEntry
            key={cur.id}
            t={cur}
            athletes={athletes}
            sent={sentFor(cur.id)}
            onSent={load}
            onBack={() => {
              setOpen(null);
              load();
            }}
          />
        ) : (
          <>
            <div className="flex gap-2">
              <button className={cn("pill", tab === "tournaments" && "pill-on")} onClick={() => setTab("tournaments")}>
                <Icon name="Trophy" size={16} /> Турниры и заявки
              </button>
              <button className={cn("pill", tab === "athletes" && "pill-on")} onClick={() => setTab("athletes")}>
                <Icon name="Users" size={16} /> Мои спортсмены ({athletes.length})
              </button>
            </div>

            {tab === "athletes" && <RepAthletes list={athletes} team={rep?.team ?? ""} reload={load} />}

            {tab === "tournaments" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold">Открыт приём заявок</h3>
                  {intakes.map((t) => {
                    const s = sentFor(t.id);
                    return (
                      <button key={t.id} className="win flex-row flex-wrap items-center gap-3 px-4 py-3 text-left hover:border-primary/50" onClick={() => setOpen(t.id)}>
                        <Icon name="Trophy" size={22} className="text-gold" />
                        <div className="mr-auto">
                          <div className="font-medium">{t.name || "Турнир"}</div>
                          <div className="text-sm text-panel-muted">
                            {[fmtD(t.date) + (t.dateEnd ? ` – ${fmtD(t.dateEnd)}` : ""), t.place].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        {s ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">Заявка отправлена · {s.items.length} чел.</span>
                        ) : (
                          <span className="rounded-full bg-gold px-3 py-1 text-sm font-medium text-gold-foreground">Подать заявку</span>
                        )}
                        <Icon name="ChevronRight" size={18} className="text-panel-muted" />
                      </button>
                    );
                  })}
                  {!intakes.length && <div className="win items-center p-8 text-center text-panel-muted">Сейчас нет турниров с открытым приёмом заявок</div>}
                </div>

                {entries.some((e) => !e.open) && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">Прошедшие заявки</h3>
                    {entries
                      .filter((e) => !e.open)
                      .map((e) => (
                        <div key={e.intake_id} className="win flex-row flex-wrap items-center gap-3 px-4 py-3 text-sm">
                          <span className="mr-auto font-medium">{e.tournament}</span>
                          <span className="text-panel-muted">{fmtD(e.date)}</span>
                          <span>{e.items.length} чел.</span>
                          <span className="text-panel-muted">приём закрыт</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
