import type { jsPDF as JsPDF } from "jspdf";
import { DISTRICT_FULL } from "./arm";
import { flagData } from "./flags";
import { PCard, cardValid, fmtDate } from "./participantCards";
import { saveFile } from "./saveFolder";
import { pdfDemoMark } from "./license";

const BASE = import.meta.env.BASE_URL;

async function fetchBuf(path: string) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`Не удалось загрузить ${path}`);
  return r.arrayBuffer();
}

function toBase64(buf: ArrayBuffer) {
  let s = "";
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Размер банковской карты: 85,6 × 54 мм. На листе A4 — 2 × 4 = 8 карточек. */
const CW = 85.6;
const CH = 54;
const COLS = 2;
const ROWS = 4;
const PER = COLS * ROWS;

const NAVY: [number, number, number] = [22, 38, 84];
const GOLD: [number, number, number] = [201, 162, 74];
const RED: [number, number, number] = [200, 40, 40];
const MUTED: [number, number, number] = [95, 100, 115];

const SEX = { M: "муж.", F: "жен." } as const;

function fit(pdf: JsPDF, text: string, maxW: number, size: number, min = 5) {
  let s = size;
  pdf.setFontSize(s);
  while (s > min && pdf.getTextWidth(text) > maxW) {
    s -= 0.25;
    pdf.setFontSize(s);
  }
  if (pdf.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && pdf.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function drawCard(pdf: JsPDF, c: PCard, x: number, y: number, logo: string | null, flag: string | null) {
  const valid = cardValid(c);

  pdf.setDrawColor(170);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, CW, CH, 3, 3, "S");

  pdf.setFillColor(...NAVY);
  pdf.roundedRect(x, y, CW, 11, 3, 3, "F");
  pdf.rect(x, y + 6, CW, 5, "F");
  const tri = CW / 3;
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y + 11, tri, 0.9, "F");
  pdf.setFillColor(0, 57, 166);
  pdf.rect(x + tri, y + 11, tri, 0.9, "F");
  pdf.setFillColor(213, 43, 30);
  pdf.rect(x + 2 * tri, y + 11, tri, 0.9, "F");

  if (logo) pdf.addImage(logo, "PNG", x + 2, y + 1.2, 8.6, 8.6);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("NS", "bold");
  pdf.setFontSize(6.2);
  pdf.text("ФЕДЕРАЦИЯ АРМРЕСТЛИНГА РОССИИ", x + 12, y + 4.6);
  pdf.setTextColor(...GOLD);
  pdf.setFontSize(8.4);
  pdf.text("КАРТОЧКА УЧАСТНИКА", x + 12, y + 8.8);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("NS", "normal");
  pdf.setFontSize(6.5);
  pdf.text(`№ ${c.id}`, x + CW - 2.5, y + 8.8, { align: "right" });

  const px = x + 3;
  const py = y + 14;
  const pw = 21;
  const ph = 25;
  if (c.photo) {
    pdf.addImage(c.photo, "JPEG", px, py, pw, ph);
  } else {
    pdf.setFillColor(240, 241, 245);
    pdf.rect(px, py, pw, ph, "F");
    pdf.setTextColor(...MUTED);
    pdf.setFontSize(6);
    pdf.text("место", px + pw / 2, py + ph / 2 - 1, { align: "center" });
    pdf.text("для фото", px + pw / 2, py + ph / 2 + 2, { align: "center" });
  }
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(0.4);
  pdf.rect(px, py, pw, ph, "S");

  const tx = px + pw + 3;
  const tw = x + CW - 2.5 - tx;
  const parts = c.name.trim().split(/\s+/);
  pdf.setTextColor(...NAVY);
  pdf.setFont("NS", "bold");
  pdf.text(fit(pdf, (parts[0] ?? "").toUpperCase(), tw, 9.5), tx, py + 3.2);
  pdf.setFont("NS", "normal");
  pdf.setTextColor(20);
  pdf.text(fit(pdf, parts.slice(1).join(" "), tw, 7.6), tx, py + 7);

  const rows: [string, string][] = [
    ["Дата рожд.", `${c.birthDate ? fmtDate(c.birthDate) : c.birthYear}, ${SEX[c.gender]}`],
    ["Звание", c.rank || "—"],
    ["Регион", c.region || "—"],
    ["Округ", c.district ? (DISTRICT_FULL[c.district] ?? c.district) : "—"],
  ];
  const flagW = flag ? 9 : 0;
  let ry = py + 11.6;
  for (const [k, v] of rows) {
    pdf.setFont("NS", "normal");
    pdf.setFontSize(5.4);
    pdf.setTextColor(...MUTED);
    pdf.text(k, tx, ry);
    pdf.setFont("NS", "bold");
    pdf.setTextColor(20);
    const w = tw - 13 - (k === "Регион" || k === "Округ" ? flagW + 1 : 0);
    pdf.text(fit(pdf, v, w, 6.4, 4.6), tx + 13, ry);
    ry += 3.5;
  }
  if (flag) {
    pdf.addImage(flag, "JPEG", x + CW - 2.5 - flagW, py + 17.5, flagW, 6);
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.15);
    pdf.rect(x + CW - 2.5 - flagW, py + 17.5, flagW, 6, "S");
  }

  const by = y + CH - 11.5;
  pdf.setFillColor(...(valid ? ([248, 242, 225] as [number, number, number]) : ([253, 232, 232] as [number, number, number])));
  pdf.roundedRect(x + 2, by, CW - 4, 9.5, 1.6, 1.6, "F");
  pdf.setFont("NS", "normal");
  pdf.setFontSize(5.4);
  pdf.setTextColor(...MUTED);
  pdf.text("Выдана", x + 4, by + 3.6);
  pdf.text("Действует до", x + 30, by + 3.6);
  pdf.setFont("NS", "bold");
  pdf.setFontSize(7.6);
  pdf.setTextColor(20);
  pdf.text(fmtDate(c.from), x + 4, by + 7.6);
  pdf.setTextColor(...(valid ? NAVY : RED));
  pdf.setFontSize(8.6);
  pdf.text(fmtDate(c.to), x + 30, by + 7.8);
  pdf.setFont("NS", "normal");
  pdf.setFontSize(5);
  pdf.setTextColor(...(valid ? MUTED : RED));
  pdf.text(valid ? "без паспорта ФАР" : "СРОК ИСТЁК", x + CW - 4, by + 3.6, { align: "right" });
  pdf.setDrawColor(150);
  pdf.setLineWidth(0.15);
  pdf.line(x + CW - 24, by + 7.6, x + CW - 4, by + 7.6);
  pdf.setFontSize(4.6);
  pdf.text("подпись", x + CW - 14, by + 9.2, { align: "center" });
  pdf.setTextColor(0);
}

function cutMarks(pdf: JsPDF, x0: number, y0: number) {
  pdf.setDrawColor(120);
  pdf.setLineWidth(0.1);
  const L = 4;
  for (let i = 0; i <= COLS; i++) {
    const x = x0 + i * CW;
    pdf.line(x, y0 - L - 1, x, y0 - 1);
    pdf.line(x, y0 + ROWS * CH + 1, x, y0 + ROWS * CH + L + 1);
  }
  for (let j = 0; j <= ROWS; j++) {
    const y = y0 + j * CH;
    pdf.line(x0 - L - 1, y, x0 - 1, y);
    pdf.line(x0 + COLS * CW + 1, y, x0 + COLS * CW + L + 1, y);
  }
}

/** Печать карточек участников: A4, 8 штук на листе, с линиями реза. */
export async function printCards(cards: PCard[], opts: { save?: boolean; title?: string } = {}) {
  if (!cards.length) throw new Error("Нет карточек для печати");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const [reg, bold] = await Promise.all([fetchBuf("fonts/NotoSerif-Regular.ttf"), fetchBuf("fonts/NotoSerif-Bold.ttf")]);
  pdf.addFileToVFS("NS-R.ttf", toBase64(reg));
  pdf.addFont("NS-R.ttf", "NS", "normal");
  pdf.addFileToVFS("NS-B.ttf", toBase64(bold));
  pdf.addFont("NS-B.ttf", "NS", "bold");
  let logo: string | null = null;
  try {
    logo = "data:image/png;base64," + toBase64(await fetchBuf("logo-far-256.png"));
  } catch {
    logo = null;
  }
  const flags = await Promise.all(cards.map((c) => flagData(c.region).then((f) => f?.dataUrl ?? null)));

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const x0 = (W - COLS * CW) / 2;
  const y0 = (H - ROWS * CH) / 2;
  const pages = Math.ceil(cards.length / PER);

  for (let p = 0; p < pages; p++) {
    if (p) pdf.addPage();
    pdf.setFont("NS", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text(`Карточки участников${opts.title ? ` · ${opts.title}` : ""}`, x0, y0 - 9);
    pdf.text(`Лист ${p + 1} из ${pages} · вырезать по меткам, 85,6 × 54 мм`, W - x0, y0 - 9, { align: "right" });
    cutMarks(pdf, x0, y0);
    cards.slice(p * PER, p * PER + PER).forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawCard(pdf, c, x0 + col * CW, y0 + row * CH, logo, flags[p * PER + i]);
    });
  }

  pdfDemoMark(pdf);
  const name = cards.length === 1 ? `Карточка_${cards[0].id}_${cards[0].name.split(" ")[0]}.pdf` : `Карточки_участников_${cards.length}.pdf`;
  if (opts.save) return saveFile(pdf.output("blob"), name, "Карточки участников");
  pdf.autoPrint();
  const url = URL.createObjectURL(pdf.output("blob"));
  const w = window.open(url, "_blank");
  if (!w) {
    const r = await saveFile(pdf.output("blob"), name, "Карточки участников");
    throw new Error(`Браузер заблокировал окно печати — PDF сохранён (${r.path}), откройте и распечатайте его.`);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return null;
}
