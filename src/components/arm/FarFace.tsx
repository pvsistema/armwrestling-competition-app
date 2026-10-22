import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { farPhotoUrl } from "@/lib/farPassports";

/** Фото спортсмена из паспорта ФАР для табло. Без паспорта или без интернета — ничего не показывает. */
export default function FarFace({ farId, name, corner, className }: { farId?: string; name: string; corner: "blue" | "red"; className?: string }) {
  const [state, setState] = useState<"load" | "ok" | "err">("load");
  useEffect(() => setState("load"), [farId]);
  if (!farId || state === "err") return null;
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[10px] border-[3px] bg-surface shadow-md",
        corner === "blue" ? "border-corner-blue" : "border-corner-red",
        className,
      )}
    >
      {state === "load" && (
        <span className="absolute inset-0 flex items-center justify-center text-panel-muted">
          <Icon name="UserRound" size={22} className="opacity-40" />
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
    </div>
  );
}
