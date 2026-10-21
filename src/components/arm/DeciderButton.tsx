import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { HAND_LABEL, Hand, hasDecider } from "@/lib/arm";
import { toast } from "@/hooks/use-toast";

/** Назначение решающего поединка при полном равенстве (п. 2.6): рука — по жребию. */
export default function DeciderButton({ classKey, x, y }: { classKey: string; x: string; y: string }) {
  const { matches, addDecider, amap } = useStore();
  if (hasDecider(matches, classKey, x, y))
    return <span className="ml-2 text-xs text-primary print:hidden">решающий поединок назначен — ждёт на пульте судьи</span>;
  return (
    <button
      className="pill ml-2 !px-3 !py-1 text-xs print:hidden"
      onClick={() => {
        const h = addDecider(classKey, x, y) as Hand | null;
        toast({
          title: "Решающий поединок назначен",
          description: `${amap[x]?.name ?? ""} — ${amap[y]?.name ?? ""}${h ? `, ${HAND_LABEL[h]} рука (по жребию)` : ""}. Пара встала в очередь своего стола.`,
        });
      }}
    >
      <Icon name="Swords" size={13} /> Назначить решающий поединок
    </button>
  );
}
