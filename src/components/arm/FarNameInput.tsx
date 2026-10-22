import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { FarBase, FarPassport, fmtFarBirth, loadFar, onFarChange, searchFar } from "@/lib/farPassports";
import { PCard, cardValid, fmtDate, loadCards, onCardsChange, searchCards } from "@/lib/participantCards";

interface Props {
  value: string;
  farId?: string;
  onChange: (v: string) => void;
  onPick: (p: FarPassport) => void;
  onClearFar: () => void;
  cardId?: string;
  onPickCard?: (c: PCard) => void;
}

/** Поле «Фамилия Имя» с подсказками из базы паспортов ФАР. */
export default function FarNameInput({ value, farId, onChange, onPick, onClearFar, cardId, onPickCard }: Props) {
  const [cards, setCards] = useState<Map<string, PCard> | null>(null);
  useEffect(() => {
    const load = () => loadCards().then((m) => setCards(new Map(m)));
    load();
    return onCardsChange(load);
  }, []);
  const [base, setBase] = useState<FarBase | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFar().then(setBase, () => setFailed(true));
    return onFarChange((b) => {
      setBase(b);
      setFailed(false);
    });
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const linked = !!farId || !!cardId;
  const hits = base && open && !linked ? searchFar(base, value, 6) : [];
  const cardHits = cards && open && !linked && onPickCard ? searchCards(cards, value, 4) : [];
  const all: ({ t: "far"; p: FarPassport } | { t: "card"; c: PCard })[] = [
    ...cardHits.map((c) => ({ t: "card" as const, c })),
    ...hits.map((p) => ({ t: "far" as const, p })),
  ];

  const pick = (i: number) => {
    const x = all[i];
    if (!x) return;
    if (x.t === "far") onPick(x.p);
    else onPickCard?.(x.c);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        className="field pr-10"
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          if (linked) onClearFar();
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!all.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, all.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(hi);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={base ? "Начните вводить фамилию или № паспорта" : "Волков Артём"}
      />
      <span
        className={cn("absolute right-3 top-1/2 -translate-y-1/2", linked ? (farId ? "text-primary" : "text-copper") : "text-panel-muted/60")}
        title={
          farId
            ? `Паспорт ФАР № ${farId}`
            : cardId
              ? `Карточка участника № ${cardId}`
            : failed
              ? "База паспортов ФАР недоступна"
              : base
                ? `База паспортов ФАР: ${base.list.length} чел., обновлена ${fmtFarBirth(base.updated)}`
                : "Загрузка базы ФАР…"
        }
      >
        <Icon name={farId ? "BadgeCheck" : cardId ? "IdCard" : base ? "BookUser" : failed ? "BookX" : "Loader2"} size={18} className={!base && !failed ? "animate-spin" : ""} />
      </span>
      {all.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[14px] border border-line bg-panel shadow-xl">
          {all.map((x, i) => {
            const head =
              i === 0 || all[i - 1].t !== x.t ? (
                <div key={`h${x.t}`} className="border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase text-panel-muted">
                  {x.t === "far" ? "База паспортов ФАР" : "Карточки участников"}
                </div>
              ) : null;
            const name = x.t === "far" ? x.p.name : x.c.name;
            const sub =
              x.t === "far"
                ? [x.p.birthDate && fmtFarBirth(x.p.birthDate), x.p.rank, x.p.region].filter(Boolean).join(" · ")
                : [x.c.birthDate ? fmtDate(x.c.birthDate) : x.c.birthYear, x.c.rank, x.c.region].filter(Boolean).join(" · ");
            const id = x.t === "far" ? x.p.id : x.c.id;
            const bad = x.t === "card" && !cardValid(x.c);
            return [
              head,
              <button
                type="button"
                key={id}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(i)}
                className={cn("block w-full px-3 py-2 text-left", i === hi ? "bg-primary/10" : "hover:bg-surface")}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {x.t === "card" && <Icon name="IdCard" size={14} className="text-copper" />}
                  {name}
                </div>
                <div className="font-mono text-[11px] text-panel-muted">
                  {sub}
                  <span className="ml-1 opacity-60">№ {id}</span>
                  {bad && <span className="ml-1 text-corner-red">· срок истёк</span>}
                </div>
              </button>,
            ];
          })}
        </div>
      )}
    </div>
  );
}
