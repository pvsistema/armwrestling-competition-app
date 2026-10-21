import { useState } from "react";
import { useStore } from "@/lib/store";

export default function ReweighInput({ id }: { id: string }) {
  const { amap, updateAthlete } = useStore();
  const a = amap[id];
  const [v, setV] = useState(a?.reweigh == null ? "" : String(a.reweigh).replace(".", ","));
  const commit = () => {
    const n = v.trim() ? parseFloat(v.replace(",", ".")) : null;
    if (n != null && (!Number.isFinite(n) || n < 25 || n > 250)) return;
    updateAthlete(id, { reweigh: n });
  };
  return (
    <input
      className="ml-2 w-20 rounded-full border border-destructive/60 bg-surface px-2 py-0.5 text-xs print:hidden"
      inputMode="decimal"
      placeholder="перевз."
      title="Вес при перевзвешивании, Enter — сохранить"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}
