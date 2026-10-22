import { useState } from "react";
import Icon from "@/components/ui/icon";
import { DISTRICT_FULL } from "@/lib/arm";
import { FarPassport, farFlagUrl, farPhotoUrl, farSiteUrl, fmtFarBirth } from "@/lib/farPassports";
import { cn } from "@/lib/utils";

const SEX = { M: "муж.", F: "жен.", "": "—" } as const;

function Img({ src, alt, className, icon }: { src: string; alt: string; className?: string; icon: string }) {
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-[12px] bg-surface", className)}>
      {state !== "ok" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-xs text-panel-muted">
          <Icon name={state === "load" ? "Loader2" : icon} size={28} className={state === "load" ? "animate-spin" : "opacity-50"} />
          {state === "err" && <span>Нет изображения или нет интернета</span>}
        </div>
      )}
      <img
        key={src}
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setState("ok")}
        onError={() => setState("err")}
        className={cn("h-full w-full object-cover", state !== "ok" && "invisible")}
      />
    </div>
  );
}

interface Props {
  p: FarPassport;
  onRegister?: () => void;
  registered?: boolean;
}

/** Карточка спортсмена из базы паспортов ФАР — как на официальном сайте. */
export default function FarCard({ p, onRegister, registered }: Props) {
  const parts = p.name.split(" ");
  const rows: [string, string, boolean?][] = [
    ["Фамилия", parts[0] ?? ""],
    ["Имя", parts[1] ?? ""],
    ["Отчество", parts.slice(2).join(" ")],
    ["Пол", SEX[p.gender]],
    ["Паспорт ФАР", p.id, true],
    ["ID фотографии", p.id.slice(0, 6), true],
    ["Звание / Разряд", p.rank],
    ["Команда / Регион РФ", p.region],
    ["Округ РФ", DISTRICT_FULL[p.district] ?? p.district],
    ["Дата рождения", fmtFarBirth(p.birthDate), true],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div className="flex flex-col">
        <span className="cat">Карточка спортсмена</span>
        <h2 className="mt-1 text-[clamp(22px,2.4vw,32px)] font-medium leading-tight tracking-tight">{p.name}</h2>
        <dl className="mt-4 grid grid-cols-[150px_1fr] overflow-hidden rounded-[12px] border border-line text-sm">
          {rows.map(([k, v, mono]) => (
            <div key={k} className="contents">
              <dt className="border-b border-line bg-surface px-3 py-2 text-panel-muted last:border-0">{k}</dt>
              <dd className={cn("border-b border-line px-3 py-2 font-medium", mono && "font-mono", !v && "text-panel-muted")}>{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {onRegister && (
            <button className="btn-blue" onClick={onRegister} disabled={registered}>
              <Icon name={registered ? "UserCheck" : "UserPlus"} size={16} />
              {registered ? "Уже в списке участников" : "Зарегистрировать на турнир"}
            </button>
          )}
          <a className="pill" href={farSiteUrl(p.id)} target="_blank" rel="noreferrer">
            <Icon name="ExternalLink" size={15} /> Открыть на сайте ФАР
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="cat text-center">Фотография и флаг</span>
        <Img src={farPhotoUrl(p.id)} alt={p.name} icon="UserRound" className="aspect-[10/11] w-full border border-line" />
        <Img src={farFlagUrl(p.region)} alt={p.region} icon="Flag" className="aspect-[3/2] w-full border border-line" />
      </div>
    </div>
  );
}
