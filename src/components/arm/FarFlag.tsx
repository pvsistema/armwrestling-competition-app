import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FarBase, loadFar, onFarChange } from "@/lib/farPassports";
import { flagUrl } from "@/lib/flags";

let shared: FarBase | null = null;

function useFarBase() {
  const [b, setB] = useState<FarBase | null>(shared);
  useEffect(() => {
    if (!shared) loadFar().then((x) => setB((shared = x)), () => {});
    return onFarChange((x) => setB((shared = x)));
  }, []);
  return b;
}

/** Флаг субъекта РФ: по региону из паспорта ФАР, иначе по команде. Флаги встроены — работают без интернета. */
export default function FarFlag({ farId, club, className }: { farId?: string; club?: string; className?: string }) {
  const base = useFarBase();
  const region = (farId && base?.byId.get(farId)?.region) || club;
  return <Flag team={region} className={className} />;
}

export function Flag({ team, className }: { team?: string; className?: string }) {
  const src = flagUrl(team);
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return null;
  return (
    <img
      key={src}
      src={src}
      alt={team}
      title={team}
      onError={() => setFailed(src)}
      className={cn("shrink-0 rounded-[3px] border border-line object-cover shadow-sm", className)}
    />
  );
}
