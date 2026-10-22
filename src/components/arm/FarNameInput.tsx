import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { FarBase, FarPassport, fmtFarBirth, loadFar, searchFar } from "@/lib/farPassports";

interface Props {
  value: string;
  farId?: string;
  onChange: (v: string) => void;
  onPick: (p: FarPassport) => void;
  onClearFar: () => void;
}

/** Поле «Фамилия Имя» с подсказками из базы паспортов ФАР. */
export default function FarNameInput({ value, farId, onChange, onPick, onClearFar }: Props) {
  const [base, setBase] = useState<FarBase | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFar().then(setBase, () => setFailed(true));
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const hits = base && open && !farId ? searchFar(base, value) : [];

  const pick = (p: FarPassport) => {
    onPick(p);
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
          if (farId) onClearFar();
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!hits.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(h + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(hits[hi]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={base ? "Начните вводить фамилию или № паспорта" : "Волков Артём"}
      />
      <span
        className={cn("absolute right-3 top-1/2 -translate-y-1/2", farId ? "text-primary" : "text-panel-muted/60")}
        title={
          farId
            ? `Паспорт ФАР № ${farId}`
            : failed
              ? "База паспортов ФАР недоступна"
              : base
                ? `База паспортов ФАР: ${base.list.length} чел., обновлена ${fmtFarBirth(base.updated)}`
                : "Загрузка базы ФАР…"
        }
      >
        <Icon name={farId ? "BadgeCheck" : base ? "BookUser" : failed ? "BookX" : "Loader2"} size={18} className={!base && !failed ? "animate-spin" : ""} />
      </span>
      {hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[14px] border border-line bg-panel shadow-xl">
          <div className="border-b border-line px-3 py-1.5 font-mono text-[10px] uppercase text-panel-muted">База паспортов ФАР</div>
          {hits.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(p)}
              className={cn("block w-full px-3 py-2 text-left", i === hi ? "bg-primary/10" : "hover:bg-surface")}
            >
              <div className="text-sm font-medium">{p.name}</div>
              <div className="font-mono text-[11px] text-panel-muted">
                {[p.birthDate && fmtFarBirth(p.birthDate), p.rank, p.region].filter(Boolean).join(" · ")}
                <span className="ml-1 opacity-60">№ {p.id}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
