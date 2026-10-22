import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FarPassport, farPhotoUrl, loadFar, onFarChange } from "@/lib/farPassports";
import FarCard from "./FarCard";

/** Фото из паспорта ФАР на пульте судьи: сверка, что за стол вышел заявленный спортсмен. */
export default function FarPhotoCheck({ farId, name, corner }: { farId?: string; name: string; corner: "blue" | "red" }) {
  const [p, setP] = useState<FarPassport | null>(null);
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setState("load");
    setP(null);
    if (!farId) return;
    const find = () => loadFar().then((b) => setP(b.byId.get(farId) ?? null), () => setP(null));
    find();
    return onFarChange((b) => setP(b.byId.get(farId) ?? null));
  }, [farId]);

  if (!farId) {
    return (
      <div
        className="flex h-[76px] w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-dashed border-line text-center text-[9px] leading-tight text-panel-muted"
        title="У участника не указан паспорт ФАР — сверьте по документу"
      >
        <Icon name="UserRound" size={20} className="opacity-50" />
        нет паспорта ФАР
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Фото из паспорта ФАР — нажмите, чтобы увеличить и сверить"
        className={cn(
          "group relative h-[76px] w-[64px] shrink-0 overflow-hidden rounded-[10px] border-2 bg-surface",
          corner === "blue" ? "border-corner-blue/60" : "border-corner-red/60",
        )}
      >
        {state !== "ok" && (
          <span className="absolute inset-0 flex items-center justify-center text-panel-muted">
            <Icon name={state === "load" ? "Loader2" : "ImageOff"} size={18} className={state === "load" ? "animate-spin" : "opacity-60"} />
          </span>
        )}
        <img
          key={farId}
          src={farPhotoUrl(farId)}
          alt={name}
          referrerPolicy="no-referrer"
          onLoad={() => setState("ok")}
          onError={() => setState("err")}
          className={cn("h-full w-full object-cover", state !== "ok" && "invisible")}
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/55 py-px text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Icon name="ZoomIn" size={10} /> сверить
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto">
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <Icon name="ScanFace" size={18} className="text-primary" />
            Сверка спортсмена: {corner === "blue" ? "синий" : "красный"} угол
          </DialogTitle>
          {p ? (
            <FarCard p={p} />
          ) : (
            <p className="text-sm text-panel-muted">Паспорт № {farId} не найден в базе ФАР. Обновите базу или сверьте по документу.</p>
          )}
          <div className="flex justify-end">
            <button className="btn-blue" onClick={() => setOpen(false)}>
              <Icon name="Check" size={16} /> Спортсмен совпадает
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
