import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { PCard, cardValid, fmtDate, loadCards, onCardsChange, requestCardRegister, today } from "@/lib/participantCards";
import { cn } from "@/lib/utils";
import ParticipantCard from "./ParticipantCard";

/** Список карточек участников (спортсмены без паспорта ФАР). */
export default function CardsList({ q, onRegistered }: { q: string; onRegistered: () => void }) {
  const { athletes } = useStore();
  const [cards, setCards] = useState<PCard[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [only, setOnly] = useState<"all" | "valid" | "expired">("all");

  useEffect(() => {
    const load = () => loadCards().then((m) => setCards([...m.values()]));
    load();
    return onCardsChange(load);
  }, []);

  const inT = useMemo(() => new Set(athletes.map((a) => a.card?.id).filter(Boolean)), [athletes]);
  const now = today();
  const list = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/ё/g, "е");
    return cards
      .filter((c) => (only === "valid" ? cardValid(c, now) : only === "expired" ? !cardValid(c, now) : true))
      .filter((c) => !s || `${c.name} ${c.id} ${c.region} ${c.city ?? ""}`.toLowerCase().replace(/ё/g, "е").includes(s))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [cards, q, only, now]);

  const card = open ? cards.find((c) => c.id === open) : null;
  if (card)
    return (
      <div className="flex flex-col gap-3">
        <button className="pill self-start" onClick={() => setOpen(null)}>
          <Icon name="ArrowLeft" size={15} /> К списку карточек
        </button>
        <ParticipantCard
          c={card}
          inTournament={inT.has(card.id)}
          onRegister={() => {
            requestCardRegister(card.id);
            onRegistered();
          }}
          onRemoved={() => setOpen(null)}
        />
      </div>
    );

  const valid = cards.filter((c) => cardValid(c, now)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Все (${cards.length})`],
            ["valid", `Действуют (${valid})`],
            ["expired", `Истекли (${cards.length - valid})`],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={cn("pill !py-1.5 text-sm", only === k && "pill-on")} onClick={() => setOnly(k)}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-panel-muted">Выдаются при регистрации спортсменов без паспорта ФАР · хранятся на этом компьютере</span>
      </div>
      {!list.length && (
        <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-panel-muted">
          {cards.length
            ? "Никого не найдено."
            : "Карточек пока нет. Они выдаются при регистрации участника без паспорта ФАР — отметка «Выдать карточку участника» в форме регистрации."}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const ok = cardValid(c, now);
          return (
            <button
              key={c.id}
              onClick={() => setOpen(c.id)}
              className="flex items-center gap-3 rounded-[12px] border border-line bg-panel p-2.5 text-left transition hover:border-copper hover:shadow-sm"
            >
              <span className="flex h-12 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface">
                {c.photo ? <img src={c.photo} alt="" className="h-full w-full object-cover" /> : <Icon name="UserRound" size={20} className="text-panel-muted/60" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-panel-muted">
                  <span className="font-mono">№ {c.id}</span> · {c.region || "—"}
                </span>
                <span className={cn("block text-xs font-medium", ok ? "text-primary" : "text-corner-red")}>
                  {ok ? `до ${fmtDate(c.to)}` : `истекла ${fmtDate(c.to)}`}
                  {inT.has(c.id) && <span className="ml-1.5 font-normal text-panel-muted">· в турнире</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
