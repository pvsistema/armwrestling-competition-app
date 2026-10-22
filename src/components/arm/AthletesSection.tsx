import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { useClassMap, useStore } from "@/lib/store";
import { AgeGroup, Athlete, DISTRICTS, Gender, HAND_LABEL, Hand, OUT_LABEL, OutReason, RANKS, Tournament, PARA_HINT, PARA_LABEL, ParaClass, adultClassOf, adultGroupFor, adultOn, classOf, groupOf, fmtBirth, fmtKg, isAdmitted, tournamentYear } from "@/lib/arm";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import FarNameInput from "./FarNameInput";
import FarUpdateButton from "./FarUpdateButton";
import { FAR_REGISTER_EVENT, FarPassport, fmtFarBirth, loadFar, matchFar, takeFarRegister } from "@/lib/farPassports";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import FarCard from "./FarCard";
import ParticipantCard from "./ParticipantCard";
import { CARD_REGISTER_EVENT, PCard, cardRef, cardValid, fmtDate, issueCard, loadCards, onCardsChange, takeCardRegister } from "@/lib/participantCards";

const EMPTY = {
  name: "",
  gender: "M" as Gender,
  birthYear: "",
  weight: "",
  club: "",
  city: "",
  rank: "",
  district: "",
  hands: ["left", "right"] as Hand[],
  para: "" as ParaClass | "",
  adult: false,
  farId: "",
  cardId: "",
  issue: true,
};

export default function AthletesSection() {
  const { athletes, groups, tournament, addAthlete, updateAthlete, removeAthlete, withdraw } = useStore();
  const classMap = useClassMap();
  const year = tournamentYear(tournament);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "weighed" | "pending" | "noadmit" | "adult" | "nofar">("all");
  const needAdmit = !!tournament.requireAdmit;
  const notAdmitted = athletes.filter((a) => !isAdmitted(a, tournament)).length;

  const weighed = athletes.filter((a) => a.weight != null).length;
  const inAdult = (a: Athlete) => adultOn(a, tournament) && !!adultGroupFor(a, groups, year);
  const adultCount = athletes.filter(inAdult).length;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return athletes
      .filter((a) =>
        filter === "all"
          ? true
          : filter === "nofar"
            ? !a.farId
            : filter === "weighed"
            ? a.weight != null
            : filter === "noadmit"
              ? !isAdmitted(a, tournament)
              : filter === "adult"
                ? inAdult(a)
                : a.weight == null,
      )
      .filter((a) => !s || `${a.name} ${a.club} ${a.city} ${a.farId ?? ""}`.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes, q, filter, tournament, groups, year]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.name.trim().split(/\s+/).length < 2) er.name = "Фамилия и имя";
    const dm = f.birthYear.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const by = dm ? parseInt(dm[3], 10) : parseInt(f.birthYear, 10);
    const birthDate = dm ? `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}` : undefined;
    if (!by || by < 1930 || by > year - 10) er.birthYear = "Год рождения";
    const w = f.weight ? parseFloat(f.weight.replace(",", ".")) : null;
    if (f.weight && (!w || w < 25 || w > 250)) er.weight = "Вес 25–250 кг";
    if (!f.hands.length) er.hands = "Хотя бы одна рука";
    setErr(er);
    if (Object.keys(er).length) return;
    let card: Athlete["card"];
    if (!f.farId && f.cardId) {
      const c = cards.get(f.cardId);
      if (c) card = cardRef(c);
    } else if (!f.farId && f.issue) {
      const c = await issueCard({
        name: f.name.trim(),
        gender: f.gender,
        birthYear: by,
        birthDate,
        rank: f.rank || undefined,
        region: f.club.trim(),
        city: f.city.trim() || undefined,
        district: f.district || undefined,
      });
      card = cardRef(c);
      toast({ title: `Выдана карточка участника № ${c.id}`, description: `Действует до ${fmtDate(c.to)}.` });
    }
    addAthlete({
      name: f.name.trim(),
      gender: f.gender,
      birthYear: by,
      weight: w,
      club: f.club.trim(),
      city: f.city.trim(),
      hands: f.hands,
      birthDate,
      rank: f.rank || undefined,
      district: f.district || undefined,
      para: f.para || undefined,
      adult: (preview?.canAdult && f.adult) || undefined,
      farId: f.farId || undefined,
      card,
    });
    toast({ title: `Участник добавлен: ${f.name.trim()}`, description: preview?.text ?? "" });
    setF({ ...EMPTY, gender: f.gender, club: f.club, city: f.city, district: f.district, para: f.para, issue: f.issue });
  };

  const preview = useMemo(() => {
    const dm = f.birthYear.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const by = dm ? parseInt(dm[3], 10) : parseInt(f.birthYear, 10);
    if (!by || by < 1930 || by > year - 10) return null;
    const w = f.weight ? parseFloat(f.weight.replace(",", ".")) : null;
    const tmp: Athlete = { id: "", name: "", gender: f.gender, birthYear: by, weight: w && w >= 25 ? w : null, club: "", city: "", hands: f.hands, para: f.para || undefined, adult: f.adult };
    return distribution(tmp, groups, tournament);
  }, [f.birthYear, f.weight, f.gender, f.hands, f.para, f.adult, groups, tournament, year]);

  const [cards, setCards] = useState<Map<string, PCard>>(new Map());
  useEffect(() => {
    const load = () => loadCards().then((m) => setCards(new Map(m)));
    load();
    return onCardsChange(load);
  }, []);
  const [cardOpen, setCardOpen] = useState<string | null>(null);

  const pickCard = (c: PCard) => {
    setF((prev) => ({
      ...prev,
      name: c.name,
      farId: "",
      cardId: c.id,
      gender: c.gender,
      birthYear: c.birthDate ? fmtDate(c.birthDate) : String(c.birthYear),
      club: c.region || prev.club,
      city: c.city || prev.city,
      rank: c.rank && RANKS.includes(c.rank) ? c.rank : prev.rank,
      district: c.district || prev.district,
    }));
    if (!cardValid(c)) toast({ title: `Карточка ${c.id} просрочена`, description: "Откройте её и нажмите «Продлить» — или участник зарегистрируется без действующей карточки.", variant: "destructive" });
  };

  useEffect(() => {
    const take = () => {
      const id = takeCardRegister();
      if (!id) return;
      loadCards().then((m) => {
        const c = m.get(id);
        if (!c) return;
        setF({ ...EMPTY });
        pickCard(c);
        toast({ title: `Карточка участника: ${c.name}`, description: "Проверьте данные, укажите руки и нажмите «Зарегистрировать»." });
      });
    };
    take();
    window.addEventListener(CARD_REGISTER_EVENT, take);
    return () => window.removeEventListener(CARD_REGISTER_EVENT, take);
  }, []);

  const pickFar = (p: FarPassport) =>
    setF((prev) => ({
      ...prev,
      name: p.name,
      farId: p.id,
      cardId: "",
      gender: p.gender || prev.gender,
      birthYear: p.birthDate ? fmtFarBirth(p.birthDate) : prev.birthYear,
      club: p.region || prev.club,
      rank: p.rank && RANKS.includes(p.rank) ? p.rank : prev.rank,
      district: p.district || prev.district,
    }));

  useEffect(() => {
    const take = () => {
      const id = takeFarRegister();
      if (!id) return;
      loadFar().then((b) => {
        const p = b.byId.get(id);
        if (!p) return;
        setF({ ...EMPTY, gender: p.gender || "M" });
        pickFar(p);
        toast({ title: `Из базы ФАР: ${p.name}`, description: "Проверьте данные, укажите руки и нажмите «Зарегистрировать»." });
      });
    };
    take();
    window.addEventListener(FAR_REGISTER_EVENT, take);
    return () => window.removeEventListener(FAR_REGISTER_EVENT, take);
  }, []);

  const [farCard, setFarCard] = useState<FarPassport | null>(null);
  const openFar = (id: string) =>
    loadFar().then(
      (b) => {
        const p = b.byId.get(id);
        if (p) setFarCard(p);
        else toast({ title: `Паспорт № ${id} не найден в базе ФАР`, description: "Обновите базу ФАР или проверьте номер." });
      },
      () => toast({ title: "База ФАР недоступна", variant: "destructive" }),
    );

  const [checking, setChecking] = useState(false);
  const checkFar = async () => {
    setChecking(true);
    try {
      const base = await loadFar();
      let found = 0;
      let filled = 0;
      for (const a of athletes) {
        if (a.farId && base.byId.has(a.farId)) {
          found++;
          continue;
        }
        const m = matchFar(base, a.name, a.birthYear);
        if (!m) continue;
        found++;
        filled++;
        updateAthlete(a.id, {
          farId: m.id,
          rank: a.rank || (RANKS.includes(m.rank) ? m.rank : undefined),
          district: a.district || m.district || undefined,
          club: a.club || m.region,
          birthDate: a.birthDate || (m.birthDate && m.birthDate.startsWith(String(a.birthYear)) ? m.birthDate : undefined),
        });
      }
      const miss = athletes.length - found;
      toast({
        title: `Сверка с базой ФАР: найдено ${found} из ${athletes.length}`,
        description: (filled ? `Добавлены номера паспортов: ${filled}. ` : "") + (miss ? `Нет в базе или ФИО записано иначе: ${miss} — фильтр «Нет паспорта ФАР».` : "Все участники есть в базе."),
      });
    } catch (e) {
      toast({ title: "База ФАР недоступна", description: (e as Error).message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const toggleHand = (h: Hand) =>
    setF((p) => ({ ...p, hands: p.hands.includes(h) ? p.hands.filter((x) => x !== h) : [...p.hands, h] }));

  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[380px_1fr]">
      <Dialog open={!!farCard} onOpenChange={(o) => !o && setFarCard(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto">
          <DialogTitle className="sr-only">Карточка спортсмена ФАР</DialogTitle>
          {farCard && <FarCard p={farCard} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!cardOpen} onOpenChange={(o) => !o && setCardOpen(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-auto">
          <DialogTitle className="sr-only">Карточка участника</DialogTitle>
          {cardOpen && cards.get(cardOpen) ? (
            <ParticipantCard c={cards.get(cardOpen)!} inTournament onRemoved={() => setCardOpen(null)} />
          ) : (
            cardOpen && <p className="text-panel-muted">Карточка № {cardOpen} не найдена на этом компьютере.</p>
          )}
        </DialogContent>
      </Dialog>
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-frame p-2.5">
        <div className="win flex-1">
          <div className="win-bar">
            <i />
            <i />
            <i />
            <b>регистрация</b>
          </div>
          <div className="flex flex-col gap-3 p-5">
            <h2 className="text-2xl font-medium tracking-tight">Новый участник</h2>
            <Field label="Фамилия Имя" error={err.name}>
              <FarNameInput
                value={f.name}
                farId={f.farId}
                onChange={(v) => setF((p) => ({ ...p, name: v }))}
                onPick={pickFar}
                onClearFar={() => setF((p) => ({ ...p, farId: "", cardId: "" }))}
                cardId={f.cardId}
                onPickCard={pickCard}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Пол">
                <div className="flex h-11 rounded-[14px] border border-line bg-surface p-1">
                  {(["M", "F"] as Gender[]).map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setF({ ...f, gender: g })}
                      className={cn(
                        "flex-1 rounded-[10px] text-sm font-medium",
                        f.gender === g ? "bg-primary text-primary-foreground" : "text-panel-muted hover:text-foreground",
                      )}
                    >
                      {g === "M" ? "Муж" : "Жен"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Дата или год рождения" error={err.birthYear}>
                <input className="field" inputMode="numeric" value={f.birthYear} onChange={(e) => setF({ ...f, birthYear: e.target.value })} placeholder="10.01.2011" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Команда / субъект РФ">
                <input className="field" value={f.club} onChange={(e) => setF({ ...f, club: e.target.value })} placeholder="Республика Татарстан" />
              </Field>
              <Field label="Город">
                <input className="field" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Казань" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Спортивное звание">
                <select className="field" value={f.rank} onChange={(e) => setF({ ...f, rank: e.target.value })}>
                  <option value="">—</option>
                  {RANKS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Федеральный округ">
                <select className="field" value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}>
                  <option value="">—</option>
                  {DISTRICTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Пара-армрестлинг (ПОДА)">
              <div className="flex h-11 rounded-[14px] border border-line bg-surface p-1">
                {([["", "Нет"], ["PID", "PID · сидя"], ["PIU", "PIU · стоя"]] as const).map(([k, l]) => (
                  <button
                    type="button"
                    key={k}
                    title={k ? PARA_HINT[k] : "Обычные категории"}
                    onClick={() => setF({ ...f, para: k })}
                    className={cn(
                      "flex-1 rounded-[10px] text-sm font-medium",
                      f.para === k ? (k ? "bg-copper text-white" : "bg-primary text-primary-foreground") : "text-panel-muted hover:text-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Вес на взвешивании, кг (можно позже)" error={err.weight}>
              <input className="field font-mono" inputMode="decimal" value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} placeholder="79,4" />
            </Field>
            {preview && (
              <div className={cn("flex items-start gap-2 rounded-[12px] px-3 py-2.5 text-sm", preview.ok ? "bg-gold-soft text-tip-foreground" : "bg-surface text-panel-muted")}>
                <Icon name={preview.ok ? "Sparkles" : "Info"} size={16} className="mt-0.5 shrink-0" />
                <span>{preview.text}</span>
              </div>
            )}
            {preview?.canAdult && (
              <button
                type="button"
                onClick={() => setF({ ...f, adult: !f.adult })}
                className={cn(
                  "flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  f.adult ? "border-primary bg-primary/10 text-foreground" : "border-line text-panel-muted hover:text-foreground",
                )}
              >
                <Icon name={f.adult ? "SquareCheck" : "Square"} size={17} className="shrink-0 text-primary" />
                Заявить также во взрослую категорию ({preview.adultName})
              </button>
            )}
            <Field label="Руки" error={err.hands}>
              <div className="flex gap-2">
                {(["left", "right"] as Hand[]).map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => toggleHand(h)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors",
                      f.hands.includes(h) ? "border-primary bg-primary/15 text-foreground" : "border-line text-panel-muted",
                    )}
                  >
                    <Icon name={f.hands.includes(h) ? "CheckCircle2" : "Circle"} size={16} />
                    {h === "right" ? "Правая" : "Левая"}
                  </button>
                ))}
              </div>
            </Field>
            {!f.farId &&
              (f.cardId ? (
                <div className="flex items-center gap-2 rounded-[12px] border border-copper/50 bg-copper/10 px-3 py-2.5 text-sm">
                  <Icon name="IdCard" size={17} className="shrink-0 text-copper" />
                  <span>
                    Карточка участника № <b className="font-mono">{f.cardId}</b>
                    {cards.get(f.cardId) && (
                      <span className={cn("ml-1 text-xs", cardValid(cards.get(f.cardId)) ? "text-panel-muted" : "font-semibold text-corner-red")}>
                        {cardValid(cards.get(f.cardId)) ? `до ${fmtDate(cards.get(f.cardId)!.to)}` : "срок истёк"}
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setF({ ...f, issue: !f.issue })}
                  className={cn(
                    "flex items-center gap-2 rounded-[12px] border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                    f.issue ? "border-copper bg-copper/10 text-foreground" : "border-line text-panel-muted hover:text-foreground",
                  )}
                  title="Для спортсменов без паспорта ФАР. Действует с сегодняшнего дня до 31 декабря."
                >
                  <Icon name={f.issue ? "SquareCheck" : "Square"} size={17} className="shrink-0 text-copper" />
                  <span>
                    Нет паспорта ФАР — выдать карточку участника
                    <span className="block text-xs font-normal text-panel-muted">действует до 31.12.{new Date().getFullYear()}</span>
                  </span>
                </button>
              ))}
            <button type="submit" className="btn-blue mt-2 w-full py-3.5">
              <Icon name="UserPlus" size={18} /> Зарегистрировать
            </button>
          </div>
        </div>
      </form>

      <div className="flex min-w-0 flex-col gap-3">
        <div className={cn("grid gap-3", needAdmit ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
          <Stat label="заявлено" value={athletes.length} />
          <Stat label="взвешено" value={weighed} />
          <Stat label="ждут весов" value={athletes.length - weighed} accent={athletes.length - weighed > 0} />
          {needAdmit && <Stat label="не допущены" value={notAdmitted} accent={notAdmitted > 0} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-muted" />
            <input className="field !rounded-full pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по фамилии, команде, городу" />
          </div>
          {(
            [
              ["all", "Все"],
              ["pending", "Без веса"],
              ["weighed", "Взвешены"],
              ...(needAdmit ? [["noadmit", "Без допуска"] as const] : []),
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn("pill", filter === k && "pill-on")}>
              {l}
            </button>
          ))}
          <button
            onClick={() => setFilter(filter === "adult" ? "all" : "adult")}
            className={cn("pill", filter === "adult" && "pill-on")}
            title="Совершеннолетние юниоры, заявленные по желанию и во взрослую категорию"
          >
            <Icon name="Layers" size={15} /> Юниоры во взрослых
            <span className={cn("rounded-full px-1.5 font-mono text-xs", filter === "adult" ? "bg-white/20" : "bg-gold-soft text-tip-foreground")}>{adultCount}</span>
          </button>
          <button
            onClick={() => setFilter(filter === "nofar" ? "all" : "nofar")}
            className={cn("pill", filter === "nofar" && "pill-on")}
            title="Участники без номера паспорта ФАР"
          >
            Нет паспорта ФАР
          </button>
          <button onClick={checkFar} disabled={checking || !athletes.length} className="pill disabled:opacity-50" title="Найти участников в базе паспортов ФАР и дописать номер паспорта, звание, округ">
            <Icon name={checking ? "Loader2" : "BookUser"} size={15} className={checking ? "animate-spin" : ""} /> Сверить с ФАР
          </button>
          <FarUpdateButton />
        </div>

        <div className="win flex-1">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left font-mono text-xs text-panel-muted">
                  <th className="px-4 py-3 font-normal">участник</th>
                  <th className="px-2 py-3 font-normal">д.р. · звание</th>
                  <th className="px-2 py-3 font-normal">команда · город · округ</th>
                  <th className="px-2 py-3 font-normal">вес, кг</th>
                  <th className="px-2 py-3 font-normal">категория</th>
                  <th className="px-2 py-3 font-normal">руки</th>
                  {needAdmit && <th className="px-2 py-3 font-normal">допуск</th>}
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <Row
                    key={a.id}
                    a={a}
                    classLabel={(() => {
                      const c = classOf(a, groups, year, tournament.tolerance ?? 0);
                      return c ? `${classMap[c.key]?.groupName} · ${c.label}` : a.weight == null ? "после взвешивания" : "нет подходящей";
                    })()}
                    adultLabel={(() => {
                      const c = adultClassOf(a, groups, tournament);
                      return c ? `${c.groupName} · ${c.label}` : "";
                    })()}
                    canAdult={!!adultGroupFor(a, groups, year)}
                    adult={adultOn(a, tournament)}
                    hint={weightHint(a, groups, year, tournament)}
                    canAbs={(() => {
                      const c = classOf(a, groups, year, tournament.tolerance ?? 0);
                      return !!groups.find((g) => g.id === c?.groupId)?.absolute;
                    })()}
                    needAdmit={needAdmit}
                    onPatch={(p) => updateAthlete(a.id, p)}
                    onOut={(r) => withdraw(a.id, r)}
                    onFar={openFar}
                    onCard={setCardOpen}
                    onIssue={async () => {
                      const c = await issueCard({
                        name: a.name,
                        gender: a.gender,
                        birthYear: a.birthYear,
                        birthDate: a.birthDate,
                        rank: a.rank,
                        region: a.club,
                        city: a.city || undefined,
                        district: a.district,
                      });
                      updateAthlete(a.id, { card: cardRef(c) });
                      toast({ title: `Выдана карточка участника № ${c.id}`, description: `${a.name}, действует до ${fmtDate(c.to)}.` });
                    }}
                    cardOk={!a.card || cardValid(cards.get(a.card.id) ?? a.card)}
                    onWeight={(w) => updateAthlete(a.id, { weight: w })}
                    onHands={(h) => updateAthlete(a.id, { hands: h })}
                    onRemove={() => removeAthlete(a.id)}
                  />
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-panel-muted">
                      {filter === "adult" ? "Пока никто из юниоров не заявлен во взрослую категорию. Отметьте «+ взрослые» у нужного спортсмена." : "Никого не найдено"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-foreground/70">
          После изменения веса, рук, категории или допуска заново проведите жеребьёвку этой категории в разделе «Сетка».
          {(tournament.tolerance ?? 0) > 0 && ` Провес при допуске в категорию: ${String(tournament.tolerance).replace(".", ",")} кг (п. 8.8).`}
        </p>
      </div>
    </div>
  );
}

/** Куда автоматически попадёт спортсмен. */
function distribution(a: Athlete, groups: AgeGroup[], t: Tournament): { ok: boolean; text: string; canAdult?: boolean; adultName?: string } {
  const year = tournamentYear(t);
  const age = year - a.birthYear;
  const g = groupOf(a, groups, year);
  if (!g)
    return {
      ok: false,
      text: a.para
        ? `ПОДА ${a.para}: нет группы этого класса для возраста ${age} — добавьте набор «Пара-армрестлинг ПОДА» в «Категориях».`
        : `Возраст ${age}: нет подходящей возрастной группы — добавьте её в «Категориях».`,
    };
  const pg = adultGroupFor(a, groups, year);
  const extra = { canAdult: !!pg, adultName: pg?.name };
  const ag = adultOn(a, t) ? pg : null;
  if (a.weight == null)
    return { ok: true, text: `${g.name}${ag ? ` + ${ag.name}` : ""} — весовая категория определится после взвешивания.`, ...extra };
  const c = classOf(a, groups, year, t.tolerance ?? 0);
  const ad = adultClassOf(a, groups, t);
  const parts = [c && `${g.name} ${c.label}`, ad && `${ad.groupName} ${ad.label}`].filter(Boolean);
  return { ok: !!c, text: c ? `Распределён: ${parts.join(" + ")}` : "Нет подходящей весовой категории.", ...extra };
}

/** Подсказка по весу: провес, заявка выше, нет допуска. */
function weightHint(a: Athlete, groups: AgeGroup[], year: number, t: Tournament): string {
  if (a.weight == null) return "";
  const tol = t.tolerance ?? 0;
  const strict = classOf({ ...a, upClass: false }, groups, year, 0);
  const withTol = classOf({ ...a, upClass: false }, groups, year, tol);
  const parts: string[] = [];
  if (strict && withTol && strict.key !== withTol.key && withTol.limit != null)
    parts.push(`провес ${(a.weight - withTol.limit).toFixed(2).replace(".", ",")} кг — допущен`);
  if (a.upClass) parts.push("заявлен на категорию выше");
  if (a.absolute) parts.push("+ абсолютная");
  return parts.join(" · ");
}

function Row({
  a,
  classLabel,
  hint,
  canAbs,
  adultLabel,
  canAdult,
  adult,
  needAdmit,
  onWeight,
  onHands,
  onRemove,
  onPatch,
  onOut,
  onFar,
  onCard,
  onIssue,
  cardOk,
}: {
  a: Athlete;
  classLabel: string;
  hint: string;
  canAbs: boolean;
  adultLabel: string;
  canAdult: boolean;
  adult: boolean;
  needAdmit: boolean;
  onWeight: (w: number | null) => void;
  onHands: (h: Hand[]) => void;
  onRemove: () => void;
  onPatch: (p: Partial<Athlete>) => void;
  onOut: (r: OutReason | null) => void;
  onFar: (id: string) => void;
  onCard: (id: string) => void;
  onIssue: () => void;
  cardOk: boolean;
}) {
  const [w, setW] = useState(a.weight == null ? "" : String(a.weight).replace(".", ","));
  const commit = () => {
    const v = w.trim() ? parseFloat(w.replace(",", ".")) : null;
    if (v != null && (!Number.isFinite(v) || v < 25 || v > 250)) {
      setW(a.weight == null ? "" : String(a.weight).replace(".", ","));
      return;
    }
    if (v !== a.weight) onWeight(v);
  };
  return (
    <tr className={cn("border-b border-line/70 last:border-0 hover:bg-surface/60", a.out && "opacity-60")}>
      <td className="px-4 py-2.5 font-medium">
        {a.name}
        <span className="ml-2 font-mono text-xs text-panel-muted">{a.gender === "M" ? "М" : "Ж"}</span>
        {a.farId && (
          <button
            type="button"
            onClick={() => onFar(a.farId!)}
            className="ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1 align-middle font-mono text-[10px] text-primary hover:bg-primary/10"
            title={`Паспорт ФАР № ${a.farId} — открыть карточку`}
          >
            <Icon name="BadgeCheck" size={12} />
            ФАР
          </button>
        )}
        {!a.farId && a.card && (
          <button
            type="button"
            onClick={() => onCard(a.card!.id)}
            className={cn(
              "ml-1.5 inline-flex items-center gap-0.5 rounded-full px-1 align-middle font-mono text-[10px] hover:bg-copper/10",
              cardOk ? "text-copper" : "text-corner-red",
            )}
            title={`Карточка участника № ${a.card.id}${cardOk ? `, до ${fmtDate(a.card.to)}` : " — срок истёк"} — открыть`}
          >
            <Icon name="IdCard" size={12} />
            {cardOk ? "КАРТ." : "КАРТ. !"}
          </button>
        )}
        {!a.farId && !a.card && (
          <button
            type="button"
            onClick={onIssue}
            className="ml-1.5 inline-flex items-center gap-0.5 rounded-full border border-dashed border-copper/60 px-1.5 align-middle font-mono text-[10px] text-copper hover:bg-copper/10"
            title="Нет паспорта ФАР — выдать карточку участника до 31 декабря"
          >
            <Icon name="Plus" size={11} />
            карточка
          </button>
        )}
        {a.out && (
          <div className="flex items-center gap-2 text-xs font-normal text-corner-red">
            {OUT_LABEL[a.out.reason]}
            <button className="text-panel-muted underline" onClick={() => onOut(null)} title="Вернуть в соревнования (уже засчитанные поражения останутся)">
              вернуть
            </button>
          </div>
        )}
      </td>
      <td className="px-2 py-2.5 font-mono text-panel-muted">
        {fmtBirth(a)}
        {a.rank && <div className="font-sans text-xs">{a.rank}</div>}
        {a.para && (
          <div className="mt-0.5 inline-block rounded-full bg-copper px-1.5 py-px font-sans text-[10px] font-semibold text-white" title={PARA_HINT[a.para]}>
            ПОДА {a.para}
          </div>
        )}
      </td>
      <td className="px-2 py-2.5 text-panel-muted">
        {a.club || "—"} · {a.city || "—"}
        {a.district && <div className="text-xs">{a.district}</div>}
      </td>
      <td className="px-2 py-2.5">
        <input
          value={w}
          onChange={(e) => setW(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="взвесить"
          inputMode="decimal"
          className={cn(
            "h-8 w-24 rounded-full border bg-surface px-3 font-mono text-sm outline-none focus:border-primary",
            a.weight == null ? "border-corner-red/50 placeholder:text-corner-red/70" : "border-line",
          )}
          title={a.weight != null ? `${fmtKg(a.weight)} кг` : "Введите вес и нажмите Enter"}
        />
      </td>
      <td className="px-2 py-2.5 text-panel-muted">
        {classLabel}
        {hint && <div className="text-xs text-primary">{hint}</div>}
        {adultLabel && <div className="text-xs font-medium text-copper">+ {adultLabel}</div>}
        <div className="mt-1 flex flex-wrap gap-1">
          <button
            className={cn("rounded-full px-2 py-0.5 text-[11px]", a.upClass ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted hover:text-foreground")}
            onClick={() => onPatch({ upClass: !a.upClass })}
            title="Заявка на одну категорию выше (п. 8.9 Правил)"
          >
            ↑ выше
          </button>
          <select
            value={a.para ?? ""}
            onChange={(e) => onPatch({ para: (e.target.value || undefined) as ParaClass | undefined })}
            className={cn("h-[20px] rounded-full px-1.5 text-[11px] outline-none", a.para ? "bg-copper text-white" : "bg-surface text-panel-muted")}
            title="Пара-армрестлинг (ПОДА)"
          >
            <option value="">без ПОДА</option>
            {(Object.keys(PARA_LABEL) as ParaClass[]).map((k) => (
              <option key={k} value={k}>
                {PARA_LABEL[k]}
              </option>
            ))}
          </select>
          {canAdult && (
            <button
              className={cn("rounded-full px-2 py-0.5 text-[11px]", adult ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted hover:text-foreground")}
              onClick={() => onPatch({ adult: !adult })}
              title="По желанию: заявить совершеннолетнего юниора также во взрослую категорию"
            >
              + взрослые
            </button>
          )}
          {canAbs && (
            <button
              className={cn("rounded-full px-2 py-0.5 text-[11px]", a.absolute ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted hover:text-foreground")}
              onClick={() => onPatch({ absolute: !a.absolute })}
              title="Участвует также в абсолютном первенстве"
            >
              абсолют
            </button>
          )}
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex gap-1">
          {(["left", "right"] as Hand[]).map((h) => (
            <button
              key={h}
              onClick={() => onHands(a.hands.includes(h) ? a.hands.filter((x) => x !== h) : [...a.hands, h])}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                a.hands.includes(h) ? "bg-primary text-primary-foreground" : "bg-surface text-panel-muted",
              )}
            >
              {HAND_LABEL[h]}
            </button>
          ))}
        </div>
      </td>
      {needAdmit && (
        <td className="px-2 py-2.5">
          <div className="flex gap-1">
            {(
              [
                ["med", "врач", "Допуск врача"],
                ["ins", "страх.", "Страховка"],
                ["mandate", "мандат", "Комиссия по допуску (мандатная)"],
              ] as const
            ).map(([k, l, t]) => {
              const on = !!a.admit?.[k];
              return (
                <button
                  key={k}
                  title={t}
                  onClick={() => onPatch({ admit: { ...(a.admit ?? {}), [k]: !on } })}
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-medium",
                    on ? "bg-tip text-tip-foreground" : "border border-corner-red/40 text-corner-red/80",
                  )}
                >
                  {on ? "✓ " : ""}
                  {l}
                </button>
              );
            })}
          </div>
        </td>
      )}
      <td className="px-2 py-2.5 text-right">
        <button onClick={onRemove} className="rounded-full p-1.5 text-panel-muted hover:bg-destructive/20 hover:text-corner-red" aria-label="Удалить">
          <Icon name="Trash2" size={16} />
        </button>
      </td>
    </tr>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={cn("font-mono text-xs", error ? "text-corner-red" : "text-panel-muted")}>{error || label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-panel px-4 py-3">
      <div className={cn("text-3xl font-medium tracking-tight", accent && "text-corner-red")}>{value}</div>
      <div className="cat mt-0.5">{label}</div>
    </div>
  );
}
