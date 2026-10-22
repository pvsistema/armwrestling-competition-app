import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useStore } from "@/lib/store";
import { PCard, cardValid, fmtDate, loadCards, onCardsChange, requestCardRegister, today } from "@/lib/participantCards";
import { cn } from "@/lib/utils";
import ParticipantCard from "./ParticipantCard";
import { printCards } from "@/lib/printCards";
import { savedText } from "@/lib/saveFolder";
import { toast } from "@/hooks/use-toast";

/** Список карточек участников (спортсмены без паспорта ФАР). */
export default function CardsList({ q, onRegistered }: { q: string; onRegistered: () => void }) {
  const { athletes } = useStore();
  const [cards, setCards] = useState<PCard[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [only, setOnly] = useState<"all" | "valid" | "expired" | "tour">("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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
      .filter((c) => (only === "valid" ? cardValid(c, now) : only === "expired" ? !cardValid(c, now) : only === "tour" ? inT.has(c.id) : true))
      .filter((c) => !s || `${c.name} ${c.id} ${c.region} ${c.city ?? ""}`.toLowerCase().replace(/ё/g, "е").includes(s))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [cards, q, only, now, inT]);

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
  const toPrint = sel.size ? list.filter((c) => sel.has(c.id)) : list;
  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const print = async (save: boolean) => {
    setBusy(true);
    try {
      const r = await printCards(toPrint, { save });
      if (r) toast({ title: `Карточки сохранены в PDF: ${toPrint.length}`, description: savedText(r) });
    } catch (err) {
      toast({ title: "Не удалось подготовить печать", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };
  const sheets = Math.ceil(toPrint.length / 8);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", `Все (${cards.length})`],
            ["valid", `Действуют (${valid})`],
            ["expired", `Истекли (${cards.length - valid})`],
            ["tour", `В этом турнире (${inT.size})`],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={cn("pill !py-1.5 text-sm", only === k && "pill-on")} onClick={() => setOnly(k)}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-xs text-panel-muted">Выдаются при регистрации спортсменов без паспорта ФАР · хранятся на этом компьютере</span>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-line bg-surface px-3 py-2">
          <Icon name="Printer" size={16} className="text-primary" />
          <span className="text-sm">
            {sel.size ? `Выбрано: ${toPrint.length}` : `Все в списке: ${toPrint.length}`} · {sheets} {sheets === 1 ? "лист" : sheets < 5 ? "листа" : "листов"} A4 (по 8 шт.)
          </span>
          {sel.size > 0 && (
            <button className="text-xs text-panel-muted underline" onClick={() => setSel(new Set())}>
              снять выбор
            </button>
          )}
          {!sel.size && <span className="text-xs text-panel-muted">— отметьте галочками, чтобы напечатать только нужные</span>}
          <div className="ml-auto flex gap-2">
            <button className="btn-blue !py-2" onClick={() => print(false)} disabled={busy || !toPrint.length}>
              <Icon name={busy ? "Loader2" : "Printer"} size={16} className={busy ? "animate-spin" : ""} /> Печать
            </button>
            <button className="pill !py-2" onClick={() => print(true)} disabled={busy || !toPrint.length}>
              <Icon name="FileDown" size={15} /> PDF
            </button>
          </div>
        </div>
      )}
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
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => setOpen(c.id)}
              onKeyDown={(e) => e.key === "Enter" && setOpen(c.id)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[12px] border bg-panel p-2.5 text-left transition hover:border-copper hover:shadow-sm",
                sel.has(c.id) ? "border-primary ring-1 ring-primary" : "border-line",
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(c.id);
                }}
                className="shrink-0 text-primary"
                title="Выбрать для печати"
              >
                <Icon name={sel.has(c.id) ? "SquareCheck" : "Square"} size={18} />
              </button>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
