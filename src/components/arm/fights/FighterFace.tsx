import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { farPhotoUrl } from "@/lib/farPassports";
import { flagUrl } from "@/lib/flags";
import { Fighter, countryFlag } from "@/lib/fights";
import { cn } from "@/lib/utils";

/** Фото бойца: загруженное вручную или из паспорта ФАР. */
export function FighterPhoto({ f, className, corner }: { f: Fighter; className?: string; corner?: "blue" | "red" }) {
  const src = f.photo || (f.farId ? farPhotoUrl(f.farId) : "");
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-surface",
        corner === "blue" && "border-[3px] border-corner-blue",
        corner === "red" && "border-[3px] border-corner-red",
        className,
      )}
    >
      {src && !err ? (
        <img src={src} alt={f.name} referrerPolicy="no-referrer" onError={() => setErr(true)} className="h-full w-full object-cover" />
      ) : (
        <Icon name="UserRound" size={40} className="text-panel-muted/50" />
      )}
    </div>
  );
}

/** Флаг: субъект РФ (встроенный) или страна. */
export function FighterFlag({ region, className }: { region: string; className?: string }) {
  const src = flagUrl(region) ?? countryFlag(region);
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  if (!src || err) return null;
  return <img src={src} alt={region} title={region} onError={() => setErr(true)} className={cn("shrink-0 rounded-[3px] border border-line object-cover shadow-sm", className)} />;
}
