import { Fight, FightNight, HAND_SHORT, Side, fightState, formatLabel } from "./fights";
import { ProtocolDoc, Section, fmtDateRange } from "./protocolModel";

const sideName = (f: Fight, s: Side) => f[s].name;

/** Итоговый протокол вечера армфайтов: счёт каждого боя и разбивка по раундам. */
export function buildFightProtocol(n: FightNight): ProtocolDoc {
  const fights = n.fights.filter((f) => f.blue.name && f.red.name);
  const summary: Section = {
    title: "Счёт каждого боя",
    group: "Итоги боёв",
    fontSize: 9,
    columns: [
      { title: "№", width: 4, align: "center" },
      { title: "Бой", width: 14 },
      { title: "Синий угол", width: 22 },
      { title: "Страна / регион", width: 13 },
      { title: "Счёт", width: 8, align: "center" },
      { title: "Красный угол", width: 22 },
      { title: "Страна / регион", width: 13 },
      { title: "Победитель", width: 20 },
    ],
    rows: fights.map((f, i) => {
      const st = fightState(f);
      const kind = [f.title ? "Титульный" : f.main ? "Главный" : "Супербой", f.category, HAND_SHORT[f.hand].toLowerCase(), formatLabel(f.bestOf)].join("\n");
      return [
        String(i + 1),
        kind,
        sideName(f, "blue") + (f.blue.note ? `\n${f.blue.note}` : ""),
        f.blue.region,
        st.started || st.winner ? `${st.score.blue} : ${st.score.red}` : "—",
        sideName(f, "red") + (f.red.note ? `\n${f.red.note}` : ""),
        f.red.region,
        st.winner ? `${sideName(f, st.winner)}${st.forfeit ? `\n(${st.forfeit.reason})` : ""}` : st.started ? "бой не завершён" : "не проводился",
      ];
    }),
    notes: ["Счёт — выигранные раунды синего и красного угла. Разбивка по раундам — на следующих листах: «2 фола соперника» — раунд присуждён из-за двух фолов, «с ремнём» — раунд проведён с ремнём после срыва."],
  };

  const details: Section[] = fights
    .filter((f) => fightState(f).rounds.length || fightState(f).forfeit)
    .map((f) => {
      const st = fightState(f);
      const idx = fights.indexOf(f) + 1;
      return {
        title: `Бой № ${idx}. ${f.blue.name} (синий) — ${f.red.name} (красный). ${[f.title ? "Титульный бой" : f.main ? "Главный бой" : "Супербой", f.category, HAND_SHORT[f.hand].toLowerCase(), formatLabel(f.bestOf)].join(", ")}`,
        group: "Разбивка по раундам",
        fontSize: 9,
        columns: [
          { title: "Раунд", width: 6, align: "center" },
          { title: "Победитель раунда", width: 26 },
          { title: "Угол", width: 9, align: "center" },
          { title: "Как", width: 16, align: "center" },
          { title: "Фолы синего", width: 8, align: "center" },
          { title: "Фолы красного", width: 8, align: "center" },
          { title: "Срывы", width: 7, align: "center" },
          { title: "Счёт после раунда", width: 10, align: "center" },
        ],
        rows: st.rounds.map((r, i) => {
          const sc = st.rounds.slice(0, i + 1).reduce((a, x) => ({ ...a, [x.w]: a[x.w] + 1 }), { blue: 0, red: 0 } as Record<Side, number>);
          return [
            String(r.n),
            sideName(f, r.w),
            r.w === "blue" ? "синий" : "красный",
            [r.how === "fouls" ? "2 фола соперника" : "прижатие", r.strap ? "с ремнём" : ""].filter(Boolean).join(", "),
            String(r.fouls.blue),
            String(r.fouls.red),
            r.slips ? String(r.slips) : "",
            `${sc.blue} : ${sc.red}`,
          ];
        }),
        notes: [
          st.winner
            ? `Итог: победитель — ${sideName(f, st.winner)}, счёт ${st.score.blue} : ${st.score.red}${st.forfeit ? ` (${st.forfeit.reason})` : ""}.`
            : "Бой не завершён.",
        ],
      } as Section;
    });

  const officials: [string, string][] = [
    ["Главный судья", n.chiefJudge || ""],
    ["Главный секретарь", n.secretary || ""],
  ];
  const title = n.name || "Вечер армфайтов";
  return {
    title: "ПРОТОКОЛ",
    subtitle: title,
    placeDate: [n.place, fmtDateRange(n.date)].filter(Boolean).join(", "),
    officials,
    info: [`Боёв: ${fights.length}, проведено: ${fights.filter((f) => fightState(f).winner).length}. Отдых между раундами — ${n.restRound} с, после фола — ${n.restFoul} с.`],
    sections: [summary, ...details],
    fileBase: `Протокол армфайтов ${title}`.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80),
    folder: "Армфайты",
  };
}