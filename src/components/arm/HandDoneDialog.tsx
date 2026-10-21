import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClassMap, useStore } from "@/lib/store";
import { Hand, firstHandOf } from "@/lib/arm";
import { tableFirstLeft, handStage } from "@/lib/queue";
import HandProtocolActions from "./HandProtocolActions";

type Offer = { hand: Hand; table?: number };

const gen = (h: Hand) => (h === "left" ? "левой" : "правой");
const nom = (h: Hand) => (h === "left" ? "Левая" : "Правая");

/**
 * Когда стол заканчивает первую руку (или она закончена на всех столах),
 * предлагает сразу напечатать или сохранить протокол этой руки.
 */
export default function HandDoneDialog() {
  const { matches, brackets, tournament } = useStore();
  const classMap = useClassMap();
  const hand = firstHandOf(tournament);
  const tables = Math.max(1, tournament.tables);
  const [offer, setOffer] = useState<Offer | null>(null);
  const prev = useRef<Record<string, boolean> | null>(null);

  useEffect(() => {
    const now: Record<string, boolean> = {};
    for (let t = 1; t <= tables; t++) {
      const s = tableFirstLeft(matches, t, tournament);
      now[`t${t}`] = s.total > 0 && s.left === 0;
    }
    const st = handStage(matches, tournament);
    now.all = st.firstTotal > 0 && st.firstLeft === 0;
    const was = prev.current;
    prev.current = now;
    if (!was) return;
    if (now.all && !was.all) {
      setOffer({ hand });
      return;
    }
    for (let t = 1; t <= tables; t++) if (now[`t${t}`] && !was[`t${t}`]) setOffer({ hand, table: t });
  }, [matches, tournament, tables, hand]);

  if (!offer) return null;
  const cats = brackets
    .filter((b) => b.hand === offer.hand && b.done && (offer.table == null || b.table === offer.table))
    .map((b) => classMap[b.classKey])
    .filter(Boolean)
    .map((c) => `${c.groupName} ${c.label}`);
  const all = offer.table == null;

  return (
    <Dialog open onOpenChange={(o) => !o && setOffer(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Icon name="CircleCheck" size={22} className="text-primary" />
            {all ? `${nom(offer.hand)} рука завершена на всех столах` : `Стол ${offer.table}: ${nom(offer.hand).toLowerCase()} рука завершена`}
          </DialogTitle>
          <DialogDescription>
            {all
              ? `Протокол борьбы ${gen(offer.hand)} рукой по всем категориям готов.`
              : `Протокол борьбы ${gen(offer.hand)} рукой по категориям этого стола готов. Пока его печатают, можно вызывать первую пару второй руки.`}
          </DialogDescription>
        </DialogHeader>
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <span key={c} className="rounded-full bg-surface px-2.5 py-1 text-xs">
                {c}
              </span>
            ))}
          </div>
        )}
        <HandProtocolActions hand={offer.hand} table={offer.table} onDone={() => setOffer(null)} />
        {!all && tables > 1 && (
          <button className="self-start text-xs text-panel-muted underline" onClick={() => setOffer({ hand: offer.hand })}>
            Протокол {gen(offer.hand)} руки по всем столам (что уже завершено)
          </button>
        )}
        <button className="pill self-end" onClick={() => setOffer(null)}>
          Позже
        </button>
      </DialogContent>
    </Dialog>
  );
}
