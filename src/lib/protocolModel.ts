import {
  Athlete,
  Bracket,
  DISTRICT_FULL,
  HAND_LABEL,
  Judge,
  JUDGE_CATEGORIES,
  JUDGE_ROLES,
  WeightClass,
  biathlon,
  fmtBirth,
  places,
  pointsFor,
  tMode,
  tPoints,
  teamStandings,
} from "./arm";
import type { State } from "./store";

export type Align = "left" | "center" | "right";
export interface Column {
  title: string;
  width: number;
  align?: Align;
}
export interface Section {
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: string[][];
  notes?: string[];
  newPage?: boolean;
  fontSize?: number;
  boldBody?: boolean;
}
export interface ProtocolDoc {
  title: string;
  subtitle: string;
  placeDate: string;
  officials: [string, string][];
  info: string[];
  requirements?: string;
  sections: Section[];
  fileBase: string;
}

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

export function fmtDateRange(from?: string, to?: string) {
  const p = (s?: string) => {
    const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y: +m[1], m: +m[2], d: m[3] } : null;
  };
  const a = p(from);
  const b = p(to);
  if (!a) return "";
  if (!b || (a.y === b.y && a.m === b.m && a.d === b.d)) return `${a.d} ${MONTHS[a.m - 1]} ${a.y} г.`;
  if (a.y === b.y && a.m === b.m) return `${a.d}-${b.d} ${MONTHS[a.m - 1]} ${a.y} г.`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} - ${b.d} ${MONTHS[b.m - 1]} ${a.y} г.`;
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} г. - ${b.d} ${MONTHS[b.m - 1]} ${b.y} г.`;
}

const kg = (w: number | null | undefined) => (w == null ? "" : w.toFixed(2));
const sex = (a?: Athlete) => (a?.gender === "F" ? "жен." : "муж.");
const placeLabel = (rows: { place: number }[], i: number) => String(rows[i].place);

function classTitle(c: WeightClass | undefined) {
  if (!c) return "";
  if (c.abs) return `${c.groupName} — абсолютное первенство`;
  const w = c.limit == null ? `${c.prev}+ кг` : `${c.limit} кг`;
  return `${c.groupName} — весовая категория ${w}`;
}

export function buildProtocol(s: State, classMap: Record<string, WeightClass>, opts: { onlyDone?: boolean } = {}): ProtocolDoc {
  const t = s.tournament;
  const amap = Object.fromEntries(s.athletes.map((a) => [a.id, a]));
  const pts = tPoints(t);
  const mode = tMode(t);
  const used = s.brackets.filter((b) => !opts.onlyDone || b.done);
  const order = (b: Bracket) => Object.keys(classMap).indexOf(b.classKey);

  const officials: [string, string][] = [];
  const cat = (c?: string) => (c ? `, ${c}` : "");
  officials.push([`Главный судья${cat(t.chiefJudgeCat)}`, t.chiefJudge || ""]);
  officials.push([`Главный секретарь${cat(t.secretaryCat)}`, t.secretary || ""]);
  if (t.deputyJudge || t.deputySecretary) {
    officials.push(["Зам. глав. судьи", t.deputyJudge || ""]);
    officials.push(["Зам. глав. секретаря", t.deputySecretary || ""]);
  }

  const inGrid = new Set(used.flatMap((b) => b.athletes));
  const part = s.athletes.filter((a) => inGrid.has(a.id) || !used.length);
  const men = part.filter((a) => a.gender === "M").length;
  const teams = Array.from(new Set(part.map((a) => a.club.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const info = [
    `Количество участников: ${part.length}; из них мужчин/юношей ${men}, женщин/девушек ${part.length - men}`,
    `Количество команд: ${teams.length}`,
  ];
  if (teams.length) info.push(teams.join(", "));

  const sections: Section[] = [];

  if (mode === "biathlon") {
    const keys = Array.from(new Set(used.map((b) => b.classKey))).sort(
      (a, b) => Object.keys(classMap).indexOf(a) - Object.keys(classMap).indexOf(b),
    );
    keys.forEach((k) => {
      const rows = biathlon(k, used, s.matches, amap, pts);
      sections.push({
        title: classTitle(classMap[k]),
        boldBody: true,
        fontSize: 8,
        columns: [
          { title: "Место по\n«двоеборью»", width: 8.5, align: "center" },
          { title: "Фамилия, имя, отчество", width: 17.5 },
          { title: "Пол, дата рождения", width: 9, align: "center" },
          { title: "Спортивное звание", width: 7, align: "center" },
          { title: "Субъект Российской Федерации", width: 15 },
          { title: "Федеральный округ Российской Федерации", width: 9, align: "center" },
          { title: "Место в борьбе левой рукой", width: 6, align: "center" },
          { title: "Очки", width: 5, align: "center" },
          { title: "Место в борьбе правой рукой", width: 6, align: "center" },
          { title: "Очки", width: 5, align: "center" },
          { title: "Сумма очков", width: 5, align: "center" },
          { title: "Вес спортсмена (кг)", width: 7, align: "center" },
        ],
        rows: rows.map((r, i) => {
          const a = amap[r.id];
          return [
            placeLabel(rows, i),
            a?.name ?? "",
            `${sex(a)}\n${a ? fmtBirth(a) : ""}`,
            a?.rank ?? "",
            a?.club ?? "",
            a?.district ?? "",
            r.left == null ? "" : String(r.left),
            r.left == null ? "" : String(r.leftPts),
            r.right == null ? "" : String(r.right),
            r.right == null ? "" : String(r.rightPts),
            String(r.total),
            kg(a?.weight),
          ];
        }),
        notes: rows.filter((r) => r.note).map((r) => r.note!),
      });
    });
  } else {
    [...used]
      .sort((a, b) => order(a) - order(b) || a.hand.localeCompare(b.hand))
      .forEach((b) => {
        const rows = places(b, s.matches, amap);
        sections.push({
          title: `${classTitle(classMap[b.classKey])}, ${HAND_LABEL[b.hand]} рука`,
          boldBody: true,
          fontSize: 8,
          columns: [
            { title: "Место", width: 6, align: "center" },
            { title: "Фамилия, имя, отчество", width: 22 },
            { title: "Пол, дата рождения", width: 10, align: "center" },
            { title: "Спортивное звание", width: 8, align: "center" },
            { title: "Субъект Российской Федерации", width: 20 },
            { title: "Федеральный округ Российской Федерации", width: 11, align: "center" },
            { title: "Побед / поражений", width: 8, align: "center" },
            { title: "Очки", width: 6, align: "center" },
            { title: "Вес спортсмена (кг)", width: 9, align: "center" },
          ],
          rows: rows.map((r, i) => {
            const a = amap[r.id];
            return [
              placeLabel(rows, i),
              a?.name ?? "",
              `${sex(a)}\n${a ? fmtBirth(a) : ""}`,
              a?.rank ?? "",
              a?.club ?? "",
              a?.district ?? "",
              `${r.wins} / ${r.losses}`,
              b.done ? String(pointsFor(r.place, pts)) : "",
              kg(a?.weight),
            ];
          }),
          notes: rows.filter((r) => r.note).map((r) => r.note!),
        });
      });
  }

  const bestOnly = t.teamBestOnly ?? true;
  for (const by of ["team", "district"] as const) {
    const rows = teamStandings(used, s.matches, amap, pts, { by, mode, bestOnly });
    if (!rows.length) continue;
    sections.push({
      title:
        by === "team"
          ? "Командный зачет среди субъектов Российской Федерации"
          : "Командный зачет среди Федеральных округов Российской Федерации",
      newPage: true,
      fontSize: 11,
      columns: [
        { title: "Место", width: 12, align: "center" },
        { title: by === "team" ? "Субъект Российской Федерации" : "Федеральные округа Российской Федерации", width: 70 },
        { title: "Сумма очков", width: 18, align: "center" },
      ],
      rows: rows.map((r) => [r.placeLabel, by === "district" ? DISTRICT_FULL[r.team] ?? r.team : r.team, String(r.total)]),
    });
  }

  const judges = sortJudges(t.judges ?? []);
  if (judges.length)
    sections.push({
      title: "СПИСОК судейской коллегии",
      newPage: true,
      fontSize: 11,
      columns: [
        { title: "№ п/п", width: 7, align: "center" },
        { title: "ФИО", width: 30 },
        { title: "Должность", width: 22 },
        { title: "Судейская категория", width: 13, align: "center" },
        { title: "Город, субъект РФ", width: 28 },
      ],
      rows: judges.map((j, i) => [`${i + 1}.`, j.name, j.role, j.category, j.city]),
    });

  const placeDate = [t.place, fmtDateRange(t.date, t.dateEnd)].filter(Boolean).join(", ");
  const title = t.name || "Соревнования по армрестлингу";
  return {
    title,
    subtitle: t.ekp || "",
    placeDate,
    officials,
    info,
    requirements: t.requirements,
    sections,
    fileBase: (`Протокол ${title}`).replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80),
  };
}

export function sortJudges(list: Judge[]) {
  const ro = (r: string) => (JUDGE_ROLES.indexOf(r) < 0 ? 99 : JUDGE_ROLES.indexOf(r));
  const co = (c: string) => (JUDGE_CATEGORIES.indexOf(c) < 0 ? 99 : JUDGE_CATEGORIES.indexOf(c));
  return [...list].sort((a, b) => ro(a.role) - ro(b.role) || co(a.category) - co(b.category) || a.name.localeCompare(b.name, "ru"));
}
