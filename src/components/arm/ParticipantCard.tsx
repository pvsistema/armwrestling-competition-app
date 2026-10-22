import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { DISTRICT_FULL, RANKS } from "@/lib/arm";
import { PCard, cardValid, fmtDate, photoFromFile, removeCard, renewCard, today, updateCard } from "@/lib/participantCards";
import { farFlagUrl } from "@/lib/farPassports";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { printCards } from "@/lib/printCards";
import { savedText } from "@/lib/saveFolder";

const SEX = { M: "муж.", F: "жен." } as const;

function Flag({ region }: { region: string }) {
  const [err, setErr] = useState(false);
  if (!region || err) return null;
  return <img src={farFlagUrl(region)} alt={region} referrerPolicy="no-referrer" onError={() => setErr(true)} className="h-full w-full object-cover" />;
}

interface Props {
  c: PCard;
  /** Привязан к участнику текущего турнира. */
  inTournament?: boolean;
  onRegister?: () => void;
  onRemoved?: () => void;
}

/** Карточка участника — как паспорт ФАР, но действует с даты выдачи до 31 декабря. */
export default function ParticipantCard({ c, inTournament, onRegister, onRemoved }: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [rank, setRank] = useState(c.rank ?? "");
  const valid = cardValid(c);
  const expired = !valid;
  const thisYear = c.to.slice(0, 4) === today().slice(0, 4);
  const parts = c.name.split(" ");

  const rows: [string, string, boolean?][] = [
    ["Фамилия", parts[0] ?? ""],
    ["Имя", parts[1] ?? ""],
    ["Отчество", parts.slice(2).join(" ")],
    ["Пол", SEX[c.gender]],
    ["Карточка участника", c.id, true],
    ["Звание / Разряд", c.rank ?? ""],
    ["Команда / Регион РФ", c.region],
    ["Город", c.city ?? ""],
    ["Округ РФ", c.district ? (DISTRICT_FULL[c.district] ?? c.district) : ""],
    ["Дата рождения", c.birthDate ? fmtDate(c.birthDate) : String(c.birthYear), true],
    ["Выдана", fmtDate(c.from), true],
    ["Действует до", fmtDate(c.to), true],
  ];

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      await updateCard(c.id, { photo: await photoFromFile(f) });
    } catch (err) {
      toast({ title: "Фото не загружено", description: (err as Error).message, variant: "destructive" });
    }
  };

  const renew = async () => {
    const r = await renewCard(c.id);
    if (r) toast({ title: `Карточка ${r.id} продлена`, description: `Действует до ${fmtDate(r.to)}.` });
  };

  const [busy, setBusy] = useState(false);
  const print = async (save: boolean) => {
    setBusy(true);
    try {
      const r = await printCards([c], { save });
      if (r) toast({ title: "Карточка сохранена в PDF", description: savedText(r) });
    } catch (err) {
      toast({ title: "Не удалось подготовить печать", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Удалить карточку ${c.id} (${c.name})? У участников турнира останется только номер.`)) return;
    await removeCard(c.id);
    onRemoved?.();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cat">Карточка участника</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              valid ? "bg-primary/10 text-primary" : "bg-corner-red/10 text-corner-red",
            )}
          >
            <Icon name={valid ? "CircleCheck" : "CircleAlert"} size={13} />
            {valid ? `действует до ${fmtDate(c.to)}` : `срок истёк ${fmtDate(c.to)}`}
          </span>
        </div>
        <h2 className="mt-1 text-[clamp(22px,2.4vw,32px)] font-medium leading-tight tracking-tight">{c.name}</h2>
        <dl className="mt-4 grid grid-cols-[170px_1fr] overflow-hidden rounded-[12px] border border-line text-sm">
          {rows.map(([k, v, mono]) => (
            <div key={k} className="contents">
              <dt className="border-b border-line bg-surface px-3 py-2 text-panel-muted">{k}</dt>
              <dd
                className={cn(
                  "border-b border-line px-3 py-2 font-medium",
                  mono && "font-mono",
                  !v && "text-panel-muted",
                  k === "Действует до" && expired && "text-corner-red",
                )}
              >
                {k === "Звание / Разряд" && edit ? (
                  <select
                    className="h-8 rounded-[8px] border border-line bg-surface px-2"
                    value={rank}
                    onChange={(e) => {
                      setRank(e.target.value);
                      updateCard(c.id, { rank: e.target.value || undefined });
                      setEdit(false);
                    }}
                  >
                    <option value="">—</option>
                    {RANKS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  v || "—"
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-panel-muted">
          Выдаётся спортсменам без паспорта ФАР. Действует с даты выдачи по 31 декабря того же года, затем её можно продлить на новый год.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {onRegister && (
            <button className="btn-blue" onClick={onRegister} disabled={inTournament || expired}>
              <Icon name={inTournament ? "UserCheck" : "UserPlus"} size={16} />
              {inTournament ? "Уже в списке участников" : expired ? "Сначала продлите карточку" : "Зарегистрировать на турнир"}
            </button>
          )}
          {(!thisYear || expired) && (
            <button className="btn-gold" onClick={renew}>
              <Icon name="CalendarClock" size={16} /> Продлить до 31.12.{today().slice(0, 4)}
            </button>
          )}
          <button className="pill" onClick={() => print(false)} disabled={busy}>
            <Icon name={busy ? "Loader2" : "Printer"} size={15} className={busy ? "animate-spin" : ""} /> Печать карточки
          </button>
          <button className="pill" onClick={() => print(true)} disabled={busy} title="Сохранить PDF в папку «Карточки участников»">
            <Icon name="FileDown" size={15} /> PDF
          </button>
          <button className="pill" onClick={() => setEdit(!edit)}>
            <Icon name="Medal" size={15} /> Изменить звание
          </button>
          <button className="pill text-corner-red" onClick={remove}>
            <Icon name="Trash2" size={15} /> Удалить
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="cat text-center">Фотография и флаг</span>
        <button
          type="button"
          onClick={() => file.current?.click()}
          className="group relative flex aspect-[10/11] w-full items-center justify-center overflow-hidden rounded-[12px] border border-line bg-surface"
          title="Загрузить или заменить фото"
        >
          {c.photo ? (
            <img src={c.photo} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-3 text-center text-xs text-panel-muted">
              <Icon name="ImagePlus" size={30} className="opacity-60" />
              Нажмите, чтобы загрузить фото
            </span>
          )}
          {c.photo && (
            <span className="absolute inset-x-0 bottom-0 bg-navy/70 py-1.5 text-xs text-white opacity-0 transition group-hover:opacity-100">
              Заменить фото
            </span>
          )}
        </button>
        <input ref={file} type="file" accept="image/*" capture="user" className="hidden" onChange={onPhoto} />
        <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-[12px] border border-line bg-surface">
          <Icon name="Flag" size={22} className="absolute text-panel-muted/50" />
          <div className="relative h-full w-full">
            <Flag region={c.region} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-panel-muted">
          <Logo className="h-7 w-7" /> Федерация армрестлинга России
        </div>
      </div>
    </div>
  );
}
