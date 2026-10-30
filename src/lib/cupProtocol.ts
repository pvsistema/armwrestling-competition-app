import { HAND_LABEL } from "./arm";
import { ProtocolDoc, Section, fmtDateRange } from "./protocolModel";
import {
  CupState,
  ROUND_NAME,
  bracketOf,
  bracketTable,
  finalTable,
  fmtW,
  groupName,
  lineupOf,
  meetingState,
  memberOf,
  otherHand,
  slotLabel,
  teamName,
} from "./teamCup";

/** Протокол командного кубка: итоговые места, таблицы групп, протокол каждой встречи. */
export function buildCupProtocol(cup: CupState): ProtocolDoc {
  const s = cup.settings;
  const final = finalTable(cup);
  const summary: Section = {
    title: "Итоговые места команд",
    group: "Итоги",
    fontSize: 10,
    boldBody: false,
    flagCol: 1,
    columns: [
      { title: "Место", width: 7, align: "center" },
      { title: "Команда", width: 30 },
      { title: "Встреч", width: 8, align: "center" },
      { title: "В / Н / П", width: 12, align: "center" },
      { title: "Пары", width: 10, align: "center" },
      { title: "Поединки", width: 10, align: "center" },
      { title: "Примечание", width: 23 },
    ],
    rows: final.map((r) => [String(r.place), teamName(cup, r.id), String(r.played), `${r.w} / ${r.d} / ${r.l}`, `${r.pf}:${r.pa}`, `${r.bf}:${r.ba}`, r.note ?? ""]),
    notes: [
      `Система: ${s.system === "groups" ? "группы + плей-офф" : s.system === "roundrobin" ? "круговая" : s.system === "olympic" ? "олимпийская" : "до двух поражений"}. В каждой весовой пара борется обеими руками, при 1:1 рука третьего поединка — по жребию. Встреча — по числу выигранных пар, при равенстве — у кого меньше суммарный вес выставленных спортсменов.`,
    ],
  };

  const rrSections: Section[] = cup.brackets
    .filter((b) => b.system === "roundrobin")
    .map((b) => ({
      title: groupName(b.key) || "Круговая таблица",
      group: "Таблицы",
      fontSize: 9,
      columns: [
        { title: "Место", width: 7, align: "center" },
        { title: "Команда", width: 30 },
        { title: "Очки", width: 8, align: "center" },
        { title: "В / Н / П", width: 12, align: "center" },
        { title: "Пары", width: 10, align: "center" },
        { title: "Поединки", width: 10, align: "center" },
        { title: "Примечание", width: 23 },
      ],
      rows: bracketTable(cup, b).map((r) => [String(r.place), teamName(cup, r.id), String(r.points), `${r.w} / ${r.d} / ${r.l}`, `${r.pf}:${r.pa}`, `${r.bf}:${r.ba}`, r.note ?? ""]),
      notes: [`Очки за встречу: победа — ${s.pts.win}, ничья — ${s.pts.draw}, поражение — ${s.pts.loss}. При равенстве очков: личная встреча, разница выигранных пар, число выигранных пар, разница поединков.`],
    }));

  const fh = s.firstHand;
  const sh = otherHand(fh);
  const meetings: Section[] = [...cup.matches]
    .filter((m) => m.winner || meetingState(cup, m, true).started)
    .sort((x, y) => x.order - y.order)
    .map((m, i) => {
      const ms = meetingState(cup, m, bracketOf(cup, m)?.system === "roundrobin");
      const la = lineupOf(cup, m, "a");
      const lb = lineupOf(cup, m, "b");
      const mark = (v: string | null | undefined) => (v === "a" ? "С" : v === "b" ? "К" : "");
      return {
        title: `Встреча № ${i + 1}. ${teamName(cup, m.a)} (синий угол) — ${teamName(cup, m.b)} (красный угол). ${ROUND_NAME(m, cup)}`,
        group: "Протоколы встреч",
        fontSize: 9,
        columns: [
          { title: "Вес", width: 8, align: "center" },
          { title: "Синий угол", width: 24 },
          { title: "Вес, кг", width: 7, align: "center" },
          { title: HAND_LABEL[fh], width: 7, align: "center" },
          { title: HAND_LABEL[sh], width: 7, align: "center" },
          { title: "Третий", width: 10, align: "center" },
          { title: "Красный угол", width: 24 },
          { title: "Вес, кг", width: 7, align: "center" },
          { title: "Пара", width: 8, align: "center" },
        ],
        rows: s.slots.map((sl) => {
          const p = ms.pairs[sl.id];
          const r = cup.meetings[m.id]?.res[sl.id] ?? {};
          const ma = memberOf(cup, m.a, la[sl.id]);
          const mb = memberOf(cup, m.b, lb[sl.id]);
          return [
            slotLabel(s.slots, sl),
            ma?.name ?? "—",
            ma ? fmtW(ma.weight) : "",
            mark(r[fh]),
            mark(r[sh]),
            r.coin ? `${HAND_LABEL[r.coin]} ${mark(r.third)}`.trim() : "",
            mb?.name ?? "—",
            mb ? fmtW(mb.weight) : "",
            p.void ? "—" : p.winner ? (p.walkover ? `${mark(p.winner)} б/б` : mark(p.winner)) : "",
          ];
        }),
        notes: [
          `Счёт по парам ${ms.score.a}:${ms.score.b}, поединков ${ms.bouts.a}:${ms.bouts.b}. Суммарный вес: ${fmtW(ms.weight.a)} — ${fmtW(ms.weight.b)} кг. ` +
            (ms.winner === "draw"
              ? "Ничья."
              : ms.winner
                ? `Победитель: ${teamName(cup, ms.winner === "a" ? m.a : m.b)}${ms.how === "weight" ? " (по меньшему суммарному весу)" : ms.how === "manual" ? " (решение ГСК)" : ""}.`
                : "Встреча не завершена."),
          "С — победа синего угла, К — красного, б/б — без борьбы (соперник не выставлен).",
        ],
      } as Section;
    });

  const title = s.name || "Командный кубок";
  return {
    title: "ПРОТОКОЛ",
    subtitle: title,
    placeDate: [s.place, fmtDateRange(s.date)].filter(Boolean).join(", "),
    officials: [
      ["Главный судья", s.chiefJudge || ""],
      ["Главный секретарь", s.secretary || ""],
    ],
    info: [`Команд: ${cup.teams.length}. Состав: ${s.slots.map((x) => slotLabel(s.slots, x)).join(", ")}.`],
    sections: [summary, ...rrSections, ...meetings],
    fileBase: `Протокол ${title}`.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80),
    folder: "Командный кубок",
  };
}
