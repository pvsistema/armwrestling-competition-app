import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { KIND_LABEL, Layout, Stream, parseStream, sid, useStreams } from "@/lib/streams";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import StreamPlayer from "./StreamPlayer";
import LiveOverlay from "./LiveOverlay";
import { useStore } from "@/lib/store";

const LAYOUTS: { v: Layout; icon: string; label: string }[] = [
  { v: 1, icon: "Square", label: "1 камера" },
  { v: 2, icon: "Columns2", label: "2 рядом" },
  { v: 4, icon: "Grid2x2", label: "4 (2×2)" },
  { v: 6, icon: "LayoutGrid", label: "6 (3×2)" },
];

const GRID: Record<Layout, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  4: "grid-cols-1 md:grid-cols-2",
  6: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

/** Сетка камер: главная крупно + остальные; или ровная сетка. */
export function StreamWall({ big = false }: { big?: boolean }) {
  const { list, layout, main, setMain, overlay } = useStreams();
  const visible = list.slice(0, layout);
  const hero = main ? list.find((s) => s.id === main) : null;

  if (!list.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[12px] bg-navy p-10 text-center text-white/70">
        <Icon name="Video" size={40} className="text-gold" />
        Камеры не добавлены
      </div>
    );

  if (hero)
    return (
      <div className={cn("grid flex-1 gap-2", big ? "h-full grid-cols-[1fr_22%]" : "lg:grid-cols-[1fr_240px]")}>
        <Tile s={hero} big={big} onClick={() => setMain(null)} hero>
          <LiveOverlay o={overlay} />
        </Tile>
        <div className={cn("flex gap-2", big ? "flex-col" : "flex-row overflow-x-auto lg:flex-col")}>
          {list
            .filter((s) => s.id !== hero.id)
            .slice(0, 5)
            .map((s) => (
              <Tile key={s.id} s={s} big={big} small onClick={() => setMain(s.id)} />
            ))}
        </div>
      </div>
    );

  return (
    <div className={cn("grid flex-1 gap-2", GRID[layout], big && "h-full auto-rows-fr")}>
      {visible.map((s, i) => (
        <Tile key={s.id} s={s} big={big} onClick={() => list.length > 1 && setMain(s.id)}>
          {i === 0 && <LiveOverlay o={overlay} />}
        </Tile>
      ))}
    </div>
  );
}

function Tile({ s, big, small, hero, onClick, children }: { s: Stream; big: boolean; small?: boolean; hero?: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-[10px] border-2 border-navy bg-black", small ? "aspect-video w-56 shrink-0 lg:w-auto" : !big && "aspect-video", hero && "border-gold")}>
      <StreamPlayer s={s} className="absolute inset-0" muted={small ? true : undefined} />
      {children}
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
        <span className="h-2 w-2 animate-pulse rounded-full bg-corner-red" />
        {s.title}
      </div>
      <button
        onClick={onClick}
        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
        title={hero ? "Вернуть сетку" : "Сделать главной"}
      >
        <Icon name={hero ? "Minimize2" : "Maximize2"} size={15} />
      </button>
    </div>
  );
}

/** Раздел «Трансляция»: ссылки на онлайн-трансляции и IP-камеры с разных ракурсов. */
export default function StreamSection() {
  const { list, save, layout, setLayout, main, setMain, overlay, setOverlay } = useStreams();
  const { tournament } = useStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const kind = url.trim() ? parseStream(url).kind : null;

  useEffect(() => {
    if (main && !list.some((s) => s.id === main)) setMain(null);
  }, [main, list, setMain]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = url.trim();
    if (!u) return;
    if (/^rtsp:\/\//i.test(u)) {
      toast({ title: "RTSP браузер не показывает", description: "Включите в настройках камеры HTTP/MJPEG или HLS-поток либо используйте ссылку с YouTube / RUTUBE / VK. Подробнее — «Как подключить камеру».", variant: "destructive" });
      setHelp(true);
      return;
    }
    if (!/^(https?:)?\/\//i.test(u) && !/<iframe/i.test(u)) {
      toast({ title: "Нужна ссылка, начинающаяся с http:// или https://", variant: "destructive" });
      return;
    }
    if (location.protocol === "https:" && /^http:\/\//i.test(u))
      toast({ title: "Камера по http:// может не показаться", description: "Браузер блокирует http-видео на защищённом сайте. В настольной программе или по https-ссылке работает." });
    const t = title.trim() || `Камера ${list.length + 1}`;
    if (editId) save(list.map((s) => (s.id === editId ? { ...s, title: t, url: u } : s)));
    else save([...list, { id: sid(), title: t, url: u, muted: true }]);
    setTitle("");
    setUrl("");
    setEditId(null);
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const a = [...list];
    [a[i], a[j]] = [a[j], a[i]];
    save(a);
  };

  const open = () => {
    const w = window.open(`${location.origin}${import.meta.env.BASE_URL}?board=stream`, "armsport-stream", "popup=yes,width=1600,height=900");
    if (!w) toast({ title: "Браузер заблокировал окно", description: "Разрешите всплывающие окна для этого сайта.", variant: "destructive" });
  };

  return (
    <div className="grid flex-1 gap-3 xl:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-3 rounded-lg bg-frame p-2.5">
        <div className="win flex-1">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>камеры и трансляции</b>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <form onSubmit={submit} className="flex flex-col gap-2">
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название: «Стол 1», «Общий план», «Судейская»" />
              <textarea
                className="field !h-20 resize-none py-2 font-mono text-xs"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ссылка: YouTube, RUTUBE, VK Видео, Twitch, .m3u8, адрес IP-камеры (http://192.168.1.64/…) или код <iframe>"
              />
              {kind && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Icon name="CircleCheck" size={14} /> Распознано: {KIND_LABEL[kind]}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn-blue flex-1" disabled={!url.trim()}>
                  <Icon name={editId ? "Check" : "Plus"} size={17} /> {editId ? "Сохранить" : "Добавить камеру"}
                </button>
                {editId && (
                  <button
                    type="button"
                    className="pill"
                    onClick={() => {
                      setEditId(null);
                      setTitle("");
                      setUrl("");
                    }}
                  >
                    Отмена
                  </button>
                )}
              </div>
            </form>

            <div className="flex flex-col gap-1.5">
              {list.map((s, i) => (
                <div key={s.id} className={cn("group flex items-center gap-2 rounded-[10px] border px-2.5 py-2", main === s.id ? "border-gold bg-gold/10" : "border-line")}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-[11px] text-gold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="truncate font-mono text-[10px] text-panel-muted">{KIND_LABEL[parseStream(s.url).kind]}</div>
                  </div>
                  <button className="rounded p-1 hover:bg-surface" title={s.muted === false ? "Выключить звук" : "Включить звук"} onClick={() => save(list.map((x) => (x.id === s.id ? { ...x, muted: x.muted === false } : x)))}>
                    <Icon name={s.muted === false ? "Volume2" : "VolumeX"} size={15} className={s.muted === false ? "text-primary" : "text-panel-muted"} />
                  </button>
                  <button className="rounded p-1 hover:bg-surface" title={main === s.id ? "Вернуть сетку" : "Главная камера (крупно)"} onClick={() => setMain(main === s.id ? null : s.id)}>
                    <Icon name="Star" size={15} className={main === s.id ? "fill-gold text-gold" : "text-panel-muted"} />
                  </button>
                  <span className="flex opacity-60 group-hover:opacity-100">
                    <button className="rounded p-1 hover:bg-surface" onClick={() => move(i, -1)} title="Выше">
                      <Icon name="ChevronUp" size={14} />
                    </button>
                    <button className="rounded p-1 hover:bg-surface" onClick={() => move(i, 1)} title="Ниже">
                      <Icon name="ChevronDown" size={14} />
                    </button>
                    <button
                      className="rounded p-1 hover:bg-surface"
                      title="Изменить"
                      onClick={() => {
                        setEditId(s.id);
                        setTitle(s.title);
                        setUrl(s.url);
                      }}
                    >
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button className="rounded p-1 text-corner-red hover:bg-surface" title="Удалить" onClick={() => save(list.filter((x) => x.id !== s.id))}>
                      <Icon name="Trash2" size={14} />
                    </button>
                  </span>
                </div>
              ))}
              {!list.length && <p className="py-3 text-center text-sm text-panel-muted">Пока нет камер. Добавьте ссылку на трансляцию или IP-камеру.</p>}
            </div>

            <button className="pill self-start !py-1.5 text-sm" onClick={() => setHelp(!help)}>
              <Icon name="CircleHelp" size={15} /> Как подключить камеру
            </button>
            {help && (
              <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-surface p-3 text-xs leading-relaxed">
                <p>
                  <b>Онлайн-трансляция.</b> Вставьте обычную ссылку на эфир или видео с YouTube, RUTUBE, VK Видео или Twitch — программа сама сделает плеер.
                </p>
                <p>
                  <b>IP-камера.</b> Нужна ссылка, которую понимает браузер:
                </p>
                <ul className="list-disc pl-4">
                  <li>
                    MJPEG-поток, например <code className="font-mono">http://192.168.1.64/video.mjpg</code> или <code className="font-mono">…/cgi-bin/mjpg/video.cgi</code>;
                  </li>
                  <li>снимок JPEG (обновляется раз в секунду), например <code className="font-mono">…/snapshot.jpg</code>;</li>
                  <li>HLS-поток <code className="font-mono">.m3u8</code> — у многих камер и регистраторов есть в настройках.</li>
                </ul>
                <p>
                  Поток <b>rtsp://</b> браузер напрямую не показывает: включите в камере MJPEG/HLS, или запустите эфир с камеры через OBS на YouTube / RUTUBE / VK и вставьте ссылку на эфир.
                </p>
                <p>Компьютер должен быть в одной сети с камерой. Логин и пароль камеры можно указать в ссылке: http://логин:пароль@192.168.1.64/…</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="win flex-row flex-wrap items-center gap-2 px-3 py-2">
          <span className="text-sm text-panel-muted">Раскладка:</span>
          {LAYOUTS.map((l) => (
            <button
              key={l.v}
              className={cn("pill !py-1.5", layout === l.v && !main && "pill-on")}
              onClick={() => {
                setLayout(l.v);
                setMain(null);
              }}
            >
              <Icon name={l.icon} size={15} /> {l.label}
            </button>
          ))}
          <span className="hidden text-xs text-panel-muted xl:inline">★ — главная камера крупно, остальные сбоку</span>
          <button className="btn-blue ml-auto !py-2" onClick={open} disabled={!list.length}>
            <Icon name="ExternalLink" size={16} /> Показ в отдельном окне
          </button>
        </div>
        <div className="win flex-row flex-wrap items-center gap-2 px-3 py-2">
          <Icon name="Captions" size={17} className="text-primary" />
          <span className="text-sm font-medium">Плашка со счётом:</span>
          {(
            [
              ["off", "Выкл."],
              ["auto", "Авто"],
              ["tournament", "Турнир"],
              ["fights", "Армфайты"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={cn("pill !px-3 !py-1 text-sm", overlay.mode === k && "pill-on")}
              onClick={() => setOverlay({ mode: k })}
              title={
                k === "auto"
                  ? "Идёт армфайт — показывает его счёт, иначе текущую схватку турнира"
                  : k === "tournament"
                    ? "Текущая схватка и победитель из пульта судьи турнира"
                    : k === "fights"
                      ? "Бой, выбранный в разделе «Армфайты»: счёт по раундам, фолы, таймер"
                      : "Без плашки"
              }
            >
              {l}
            </button>
          ))}
          {overlay.mode !== "off" && (
            <>
              {overlay.mode !== "fights" && tournament.tables > 1 && (
                <select className="h-8 rounded-full border border-line bg-surface px-3 text-sm" value={overlay.table} onChange={(e) => setOverlay({ table: +e.target.value })} title="Схватки какого стола показывать">
                  {Array.from({ length: tournament.tables }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Стол {i + 1}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex rounded-full border border-line bg-surface p-0.5">
                {(
                  [
                    ["top", "ArrowUpToLine", "Сверху"],
                    ["bottom", "ArrowDownToLine", "Снизу"],
                  ] as const
                ).map(([k, ic, t]) => (
                  <button key={k} title={t} onClick={() => setOverlay({ pos: k })} className={cn("rounded-full px-2.5 py-1", overlay.pos === k ? "bg-primary text-primary-foreground" : "text-panel-muted")}>
                    <Icon name={ic} size={14} />
                  </button>
                ))}
              </div>
              <div className="flex rounded-full border border-line bg-surface p-0.5 text-xs font-semibold">
                {(
                  [
                    ["s", "S"],
                    ["m", "M"],
                    ["l", "L"],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} title="Размер плашки" onClick={() => setOverlay({ size: k })} className={cn("rounded-full px-2.5 py-1", overlay.size === k ? "bg-primary text-primary-foreground" : "text-panel-muted")}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="hidden text-xs text-panel-muted 2xl:inline">показывается на главной (или первой) камере</span>
            </>
          )}
        </div>
        <StreamWall />
      </div>
    </div>
  );
}
