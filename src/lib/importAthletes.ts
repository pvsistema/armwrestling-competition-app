import { Athlete, DISTRICTS, Gender, Hand, RANKS } from "./arm";
import { FarBase, fmtFarBirth, loadFar, matchFar } from "./farPassports";

export type Draft = Omit<Athlete, "id"> & {
  _row: number;
  _errors: string[];
  _dup?: boolean;
  /** Сверка с базой ФАР: by-id — найден по номеру, by-name — найден по ФИО, missing — номер не найден в базе. */
  _far?: "by-id" | "by-name" | "missing";
  /** Поля, заполненные из базы ФАР. */
  _filled?: string[];
  _gExplicit?: boolean;
  /** Для кабинета представителя: тренер и страховой полис. */
  _coach?: string;
  _insNum?: string;
  _insTo?: string;
};

type Col = "far" | "num" | "name" | "surname" | "first" | "patronymic" | "gender" | "birth" | "rank" | "club" | "city" | "district" | "weight" | "hands" | "right" | "left" | "para" | "coach" | "insNum" | "insTo";

const HEADERS: [Col, RegExp][] = [
  ["insTo", /((страх|полис).*(до|срок|действ|оконч))|((срок|действ|оконч).*(страх|полис))/],
  ["insNum", /(полис|страхов)/],
  ["far", /(паспорт|фар|far|штрих.?код|id спортсмена)/],
  ["num", /^(№|n|no|#|п\/п|№ ?п\/п)$/],
  ["name", /(ф\.?\s*и\.?\s*о|фио|фамилия.*имя|участник|спортсмен)/],
  ["surname", /^фамилия$/],
  ["first", /^имя$/],
  ["patronymic", /^отчество$/],
  ["gender", /^(пол|м\/ж)/],
  ["birth", /(дата.*рожд|год.*рожд|г\.?\s*р|д\.?\s*р|рожд)/],
  ["para", /(пода|пара|^класс|pid|piu)/],
  ["rank", /(звани|разряд|квалиф)/],
  ["district", /(округ|фо$)/],
  ["club", /(субъект|команд|клуб|регион|организац|сборная|область)/],
  ["city", /(город|населен)/],
  ["weight", /(вес|масса)/],
  ["right", /^прав/],
  ["left", /^лев/],
  ["hands", /(рук|рука)/],
];

const norm = (s: unknown) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();

function detectCol(h: string): Col | null {
  const t = h.toLowerCase().replace(/ё/g, "е");
  if (!t) return null;
  if (/страх.*(компан|организ|сумм)/.test(t)) return null;
  if (/тренер/.test(t) && !/представ/.test(t)) return "coach";
  if (/место|очки|сумма|тренер|примечан|подпись|виза|врач/.test(t)) return null;
  if (/пол.*дата|дата.*пол/.test(t)) return "birth";
  for (const [c, re] of HEADERS) if (re.test(t)) return c;
  return null;
}

function findHeader(rows: string[][]): { idx: number; map: Partial<Record<Col, number>> } | null {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const map: Partial<Record<Col, number>> = {};
    rows[i].forEach((cell, j) => {
      const c = detectCol(cell);
      if (c && map[c] == null) map[c] = j;
    });
    if (map.name != null || map.surname != null || map.far != null) return { idx: i, map };
  }
  return null;
}

function parseGender(v: string, name: string, fallback?: string): Gender {
  const t = (v || fallback || "").toLowerCase();
  if (/^(ж|f|жен|д)/.test(t) || /жен\./.test(t)) return "F";
  if (/^(м|m|муж|ю)/.test(t) || /муж\./.test(t)) return "M";
  const parts = name.split(/\s+/);
  const pat = parts[2] || "";
  if (/вна$|кызы$/i.test(pat)) return "F";
  if (/вич$|ич$|оглы$|улы$/i.test(pat)) return "M";
  const sur = parts[0] || "";
  if (/(ова|ева|ина|ына|ая|ская|цкая)$/i.test(sur)) return "F";
  return "M";
}

function excelDate(n: number) {
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return d;
}

function parseBirth(v: unknown): { year: number; date?: string } | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    return { year: y, date: `${y}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}` };
  }
  if (typeof v === "number") {
    if (v > 1900 && v < 2100) return { year: Math.round(v) };
    if (v > 3000 && v < 80000) return parseBirth(excelDate(v));
  }
  const s = norm(v);
  let m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return { year: +m[3], date: `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` };
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return { year: +m[1], date: `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` };
  m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2})\b/);
  if (m) {
    const yy = +m[3];
    const y = yy > 40 ? 1900 + yy : 2000 + yy;
    return { year: y, date: `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` };
  }
  m = s.match(/\b(19\d{2}|20\d{2})\b/);
  if (m) return { year: +m[1] };
  return null;
}

function parseRank(v: string): string | undefined {
  const t = v.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  if (/змс|заслуж/.test(t)) return "ЗМС";
  if (/мсмк|междунар/.test(t)) return "МСМК";
  if (/кмс|кандидат/.test(t)) return "КМС";
  if (/^мс$|мастер спорта/.test(t)) return "МС";
  if (/б\/?р|без/.test(t)) return "б/р";
  const m = t.match(/([123])\s*(юн)?/);
  if (m) return `${m[1]} ${m[2] ? "юн. р." : "р."}`;
  const exact = RANKS.find((r) => r.toLowerCase() === t);
  return exact ?? v.trim();
}

function parseDistrict(v: string): string | undefined {
  const t = v.toUpperCase().replace(/\s+/g, "");
  if (!t) return undefined;
  const hit = DISTRICTS.find((d) => d.toUpperCase().replace(/\s+/g, "") === t);
  if (hit) return hit;
  const lc = v.toLowerCase();
  if (/москв/.test(lc)) return "Город Москва";
  if (/петербург/.test(lc)) return "Город Санкт-Петербург";
  if (/северо-?кавк/.test(lc)) return "СКФО";
  if (/северо-?запад/.test(lc)) return "СЗФО";
  if (/централ/.test(lc)) return "ЦФО";
  if (/приволж/.test(lc)) return "ПФО";
  if (/ураль/.test(lc)) return "УФО";
  if (/сибир/.test(lc)) return "СФО";
  if (/дальневост/.test(lc)) return "ДФО";
  if (/южн/.test(lc)) return "ЮФО";
  return v.trim();
}

function parseWeight(v: unknown): number | null {
  if (typeof v === "number") return v >= 25 && v <= 250 ? v : null;
  const s = norm(v).replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 25 && n <= 250 ? n : null;
}

function parseHands(v: string, r: string, l: string, hasRL: boolean): Hand[] {
  if (hasRL) {
    const yes = (x: string) => /^(\+|да|x|х|1|v|✓|прав|лев)/i.test(x.trim());
    const h: Hand[] = [];
    if (yes(r)) h.push("right");
    if (yes(l)) h.push("left");
    if (h.length) return h;
  }
  const t = v.toLowerCase();
  if (!t.trim()) return ["right", "left"];
  const h: Hand[] = [];
  if (/прав|^п$|right|^r$/.test(t)) h.push("right");
  if (/лев|^л$|left|^l$/.test(t)) h.push("left");
  if (/обе|две|2|дв/.test(t)) return ["right", "left"];
  return h.length ? h : ["right", "left"];
}

export function rowsToDrafts(raw: unknown[][], existing: Athlete[]): { drafts: Draft[]; error?: string } {
  const strRows = raw.map((r) => r.map((c) => (c instanceof Date ? c.toISOString() : norm(c))));
  const head = findHeader(strRows);
  if (!head) return { drafts: [], error: "Не нашёл строку заголовков: нужен столбец «ФИО» (или «Фамилия» и «Имя») либо «№ паспорта ФАР»." };
  const { idx, map } = head;
  const get = (row: unknown[], c: Col) => (map[c] != null ? row[map[c]!] : "");
  const gs = (row: unknown[], c: Col) => norm(get(row, c));
  const hasRL = map.right != null || map.left != null;
  const known = new Set(existing.map((a) => a.name.toLowerCase().replace(/\s+/g, " ")));
  const knownFar = new Set(existing.map((a) => a.farId).filter(Boolean));
  const drafts: Draft[] = [];

  for (let i = idx + 1; i < raw.length; i++) {
    const row = raw[i];
    let name = gs(row, "name");
    if (!name && map.surname != null) name = [gs(row, "surname"), gs(row, "first"), gs(row, "patronymic")].filter(Boolean).join(" ");
    name = name.replace(/\s+/g, " ").trim();
    const farId = parseFarId(get(row, "far"));
    if ((!name || !/[а-яёa-z]/i.test(name)) && !farId) continue;
    if (!/[а-яёa-z]/i.test(name)) name = "";
    if (/^(итого|всего|главный|секретар|судья|представитель|тренер)/i.test(name)) continue;

    const birthRaw = get(row, "birth");
    const birthStr = norm(birthRaw);
    const genderInBirth = birthStr.match(/(муж|жен)/i)?.[1];
    const b = parseBirth(birthRaw);
    const errors: string[] = [];
    if (name && name.split(" ").length < 2) errors.push("нет имени");
    if (!name) errors.push("нет ФИО");
    if (!b) errors.push("нет даты рождения");

    const d: Draft = {
      _row: i + 1,
      _errors: errors,
      name,
      gender: parseGender(gs(row, "gender"), name, genderInBirth),
      _gExplicit: !!(gs(row, "gender") || genderInBirth),
      farId: farId || undefined,
      birthYear: b?.year ?? 0,
      birthDate: b?.date,
      weight: parseWeight(get(row, "weight")),
      club: gs(row, "club"),
      city: gs(row, "city"),
      rank: parseRank(gs(row, "rank")),
      district: parseDistrict(gs(row, "district")),
      hands: parseHands(gs(row, "hands"), gs(row, "right"), gs(row, "left"), hasRL),
      _coach: gs(row, "coach") || undefined,
      _insNum: (typeof get(row, "insNum") === "number" ? String(get(row, "insNum")) : gs(row, "insNum")) || undefined,
      _insTo: parseBirth(get(row, "insTo"))?.date,
      para: /pid|сид|коляс/i.test(gs(row, "para")) ? "PID" : /piu|сто/i.test(gs(row, "para")) ? "PIU" : undefined,
    };
    const key = name.toLowerCase();
    if ((name && known.has(key)) || (farId && knownFar.has(farId))) d._dup = true;
    if (name) known.add(key);
    if (farId) knownFar.add(farId);
    drafts.push(d);
  }
  if (!drafts.length) return { drafts, error: "В таблице не найдено ни одного участника под заголовками." };
  return { drafts };
}

function parseFarId(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.round(v));
  const d = norm(v).replace(/[\s-]/g, "");
  return /^\d{6,}$/.test(d) ? d : "";
}

/** Дополняет заявку данными из базы паспортов ФАР: по номеру паспорта, а без номера — по ФИО и году рождения. */
export function enrichFromFar(drafts: Draft[], base: FarBase): Draft[] {
  return drafts.map((d0) => {
    const d: Draft = { ...d0, _errors: [...d0._errors], _filled: [] };
    const fill = (k: string) => d._filled!.push(k);
    const p = d.farId ? base.byId.get(d.farId) : matchFar(base, d.name, d.birthYear || undefined);
    if (!p) {
      if (d.farId) d._far = "missing";
      return d;
    }
    d._far = d.farId ? "by-id" : "by-name";
    d.farId = p.id;
    if (!d.name) {
      d.name = p.name;
      d._errors = d._errors.filter((e) => e !== "нет ФИО" && e !== "нет имени");
      fill("ФИО");
    } else if (d.name.split(" ").length < 3 && p.name.split(" ").length >= 3 && d._far === "by-id") {
      d.name = p.name;
      d._errors = d._errors.filter((e) => e !== "нет имени");
      fill("отчество");
    }
    if (!d._gExplicit && p.gender) {
      if (p.gender !== d.gender) fill("пол");
      d.gender = p.gender;
    }
    if (!d.birthYear && p.birthDate) {
      d.birthYear = +p.birthDate.slice(0, 4);
      d.birthDate = p.birthDate;
      d._errors = d._errors.filter((e) => e !== "нет даты рождения");
      fill("дата рождения");
    } else if (d.birthYear && !d.birthDate && p.birthDate.startsWith(String(d.birthYear))) {
      d.birthDate = p.birthDate;
      fill(`дата ${fmtFarBirth(p.birthDate)}`);
    }
    if (!d.rank && p.rank && RANKS.includes(p.rank)) {
      d.rank = p.rank;
      fill("звание");
    }
    if (!d.club && p.region) {
      d.club = p.region;
      fill("субъект РФ");
    }
    if (!d.district && p.district) {
      d.district = p.district;
      fill("округ");
    }
    return d;
  });
}

async function readExcel(file: File): Promise<unknown[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  let best: unknown[][] = [];
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" });
    if (findHeader(rows.map((r) => r.map((c) => norm(c)))) && rows.length > best.length) best = rows;
  }
  if (!best.length && wb.SheetNames[0])
    best = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
  return best;
}

async function readWord(file: File): Promise<unknown[][]> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const doc = new DOMParser().parseFromString(html, "text/html");
  let all: string[][] = [];
  for (const t of Array.from(doc.querySelectorAll("table"))) {
    const rows = Array.from(t.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("td,th")).map((c) => norm(c.textContent)),
    );
    if (findHeader(rows)) {
      const head = findHeader(rows)!;
      if (!all.length) all = rows;
      else all = [...all, ...rows.slice(head.idx + 1)];
    } else if (all.length && rows[0]?.length === all[0]?.length) {
      all = [...all, ...rows];
    }
  }
  return all;
}

export async function readAthletesFile(file: File, existing: Athlete[]) {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (ext === "doc") return { drafts: [] as Draft[], error: "Старый формат .doc не поддерживается — сохраните файл в Word как .docx и загрузите снова." };
  let rows: unknown[][];
  if (ext === "docx") rows = await readWord(file);
  else if (["xlsx", "xls", "csv", "ods"].includes(ext)) rows = await readExcel(file);
  else return { drafts: [] as Draft[], error: "Поддерживаются файлы Excel (.xlsx, .xls, .csv) и Word (.docx)." };
  if (!rows.length) return { drafts: [] as Draft[], error: "В файле не найдено таблицы с участниками." };
  const res = rowsToDrafts(rows, existing);
  if (res.error) return res;
  const base = await loadFar().catch(() => null);
  if (!base) return { ...res, farUnavailable: true };
  const drafts = enrichFromFar(res.drafts, base);
  const names = new Set(existing.map((a) => a.name.toLowerCase().replace(/\s+/g, " ")));
  const ids = new Set(existing.map((a) => a.farId).filter(Boolean));
  drafts.forEach((d) => {
    if (names.has(d.name.toLowerCase()) || (d.farId && ids.has(d.farId))) d._dup = true;
  });
  return { drafts };
}

export async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["№", "Фамилия, имя, отчество", "№ паспорта ФАР", "Пол", "Дата рождения", "Спортивное звание", "Субъект РФ / команда", "Город", "Федеральный округ", "Вес", "Правая", "Левая"],
    [1, "Иванов Иван Иванович", "", "муж", "10.01.2011", "1 р.", "Республика Татарстан", "Казань", "ПФО", "", "+", "+"],
    [2, "Петрова Анна Сергеевна", "", "жен", "05.10.2011", "2 юн. р.", "Орловская область", "Орёл", "ЦФО", "", "+", ""],
    [3, "", "2221650000006", "", "", "", "", "", "", "", "+", "+"],
  ]);
  ws["!cols"] = [{ wch: 4 }, { wch: 34 }, { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 7 }, { wch: 8 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Заявка");
  XLSX.writeFile(wb, "Шаблон заявки армрестлинг.xlsx");
}

export async function downloadRepTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    ["№", "Фамилия, имя, отчество", "Пол", "Дата рождения", "Спортивное звание", "Субъект РФ / команда", "Город", "Федеральный округ", "№ паспорта ФАР", "Тренер", "№ страхового полиса", "Страховка действует до"],
    [1, "Иванов Иван Иванович", "муж", "10.01.2011", "1 р.", "Республика Татарстан", "Казань", "ПФО", "", "Сидоров П. П.", "ННС-123456", "31.12.2026"],
    [2, "Петрова Анна Сергеевна", "жен", "05.10.2011", "2 юн. р.", "Республика Татарстан", "Казань", "ПФО", "", "Сидоров П. П.", "ННС-123457", "31.12.2026"],
  ]);
  ws["!cols"] = [{ wch: 4 }, { wch: 34 }, { wch: 6 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Спортсмены");
  XLSX.writeFile(wb, "Шаблон списка спортсменов.xlsx");
}
