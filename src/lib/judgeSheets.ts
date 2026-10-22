import { Hand, handsInOrder, Athlete, Bracket, GROUP_LABEL, HOW_LABEL, HAND_LABEL, HAND_ORDER, Match, Tournament, WeightClass, fmtBirth, standings } from "./arm";
import type { Styles } from "jspdf-autotable";
import { fmtDateRange } from "./protocolModel";
import { FOLDERS, saveFile } from "./saveFolder";

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

const kg = (w: number | null | undefined) => (w == null ? "" : w.toFixed(2));

export interface SheetsInput {
  tournament: Tournament;
  brackets: Bracket[];
  matches: Match[];
  amap: Record<string, Athlete>;
  classMap: Record<string, WeightClass>;
}

/** Сортировка: сначала вся первая рука (по столам), затем вторая. */
export function orderBrackets(list: Bracket[], hands: Hand[] = HAND_ORDER) {
  return list
    .slice()
    .sort(
      (a, b) =>
        hands.indexOf(a.hand) - hands.indexOf(b.hand) ||
        a.table - b.table ||
        a.classKey.localeCompare(b.classKey, "ru", { numeric: true }),
    );
}

/** PDF: на каждую категорию — стартовый лист и ход схваток для судьи за столом. */
export async function exportJudgeSheets(inp: SheetsInput, list: Bracket[], fileBase: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const [reg, bold] = await Promise.all([fetchBuf("fonts/NotoSerif-Regular.ttf"), fetchBuf("fonts/NotoSerif-Bold.ttf")]);
  pdf.addFileToVFS("NS-R.ttf", toBase64(reg));
  pdf.addFont("NS-R.ttf", "NS", "normal");
  pdf.addFileToVFS("NS-B.ttf", toBase64(bold));
  pdf.addFont("NS-B.ttf", "NS", "bold");
  let logo: string | null = null;
  if (inp.tournament.showLogo ?? true) {
    try {
      logo = "data:image/png;base64," + toBase64(await fetchBuf("logo-far-256.png"));
    } catch {
      logo = null;
    }
  }

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;
  const t = inp.tournament;
  const title = t.name || "Соревнования по армрестлингу";
  const placeDate = [t.place, fmtDateRange(t.date, t.dateEnd)].filter(Boolean).join(", ");
  const baseStyles = {
    font: "NS",
    fontSize: 9,
    textColor: 0,
    lineColor: 0,
    lineWidth: 0.2,
    cellPadding: 1.2,
    valign: "middle" as const,
  };
  const headStyles = { fillColor: [235, 235, 235] as [number, number, number], textColor: 0, fontStyle: "bold" as const, halign: "center" as const };

  orderBrackets(list, handsInOrder(inp.tournament)).forEach((b, bi) => {
    if (bi > 0) pdf.addPage();
    const c = inp.classMap[b.classKey];
    const catTitle = `${c?.groupName ?? ""}, ${c?.abs ? "абсолютное первенство" : c?.limit == null ? `${c?.prev ?? ""}+ кг` : `до ${c.limit} кг`}, ${HAND_LABEL[b.hand]} рука`;
    let pageHeader = (sub: string) => {
      if (logo) pdf.addImage(logo, "PNG", M, 8, 15, 15);
      pdf.setFont("NS", "bold");
      pdf.setFontSize(12);
      pdf.text(title, W / 2, 12, { align: "center", maxWidth: W - 50 });
      pdf.setFont("NS", "normal");
      pdf.setFontSize(9);
      if (placeDate) pdf.text(placeDate, W / 2, 17, { align: "center" });
      pdf.setFont("NS", "bold");
      pdf.setFontSize(14);
      pdf.text(catTitle, W / 2, 26, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`СТОЛ ${b.table}`, W - M, 12, { align: "right" });
      pdf.setFont("NS", "normal");
      pdf.setFontSize(9);
      pdf.text(sub, W / 2, 31, { align: "center" });
    };
    pageHeader("Стартовый лист и ход схваток · выбывание после двух поражений");
    pageHeader = () => {};

    const st = standings(b, inp.matches);
    const athletes = b.athletes.map((id, i) => ({ n: i + 1, a: inp.amap[id], id }));
    const num: Record<string, number> = Object.fromEntries(athletes.map((x) => [x.id, x.n]));
    const name = (id: string) => `${num[id] ?? ""}. ${inp.amap[id]?.name ?? ""}`;
    const showFar = (inp.tournament.showFar ?? true) && athletes.some((x) => x.a?.farId || x.a?.card);

    pdf.setFont("NS", "bold");
    pdf.setFontSize(10);
    pdf.text(`Стартовый лист (${athletes.length} уч.)`, M, 38);
    autoTable(pdf, {
      startY: 40,
      margin: { left: M, right: M, top: 14, bottom: 22 },
      theme: "grid",
      head: [["№", "Фамилия, имя", ...(showFar ? ["№ паспорта ФАР / карт."] : []), "Дата рожд.", "Звание", "Команда", "Вес", "Пораж.", "Место"]],
      body: athletes.map(({ n, a, id }) => {
        const l = st[id]?.losses ?? 0;
        return [
          String(n),
          a?.name ?? "",
          ...(showFar ? [a?.farId ?? a?.card?.id ?? ""] : []),
          a ? fmtBirth(a) : "",
          a?.rank ?? "",
          a?.club || a?.city || "",
          kg(a?.weight),
          l ? Array(Math.min(2, l)).fill("×").join(" ") : "",
          "",
        ];
      }),
      styles: baseStyles,
      headStyles,
      columnStyles: Object.fromEntries(
        [
          { cellWidth: 8, halign: "center" },
          { cellWidth: showFar ? 44 : 52, fontStyle: "bold" },
          ...(showFar ? [{ cellWidth: 25, halign: "center", fontSize: 7.5 }] : []),
          { cellWidth: showFar ? 18 : 20, halign: "center" },
          { cellWidth: showFar ? 14 : 16, halign: "center" },
          { cellWidth: "auto" },
          { cellWidth: 13, halign: "center" },
          { cellWidth: showFar ? 13 : 15, halign: "center" },
          { cellWidth: showFar ? 12 : 13, halign: "center" },
        ].map((c, i) => [i, c as Partial<Styles>]),
      ),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let y = (pdf as any).lastAutoTable.finalY + 7;

    const own = inp.matches.filter((m) => m.key === b.key).sort((x, y) => x.round - y.round || x.order - y.order);
    const N = athletes.length;
    const expected = b.system === "olympic" ? N : b.system === "roundrobin" ? (N * (N - 1)) / 2 : 2 * N - 1;
    const total = Math.max(own.length, b.done ? own.length : expected);
    const rows: string[][] = own.map((m, i) => [
      String(i + 1),
      String(m.round),
      GROUP_LABEL[m.group],
      name(m.a),
      name(m.b),
      m.winner ? `${name(m.winner)}${m.how && m.how !== "pin" ? ` (${HOW_LABEL[m.how]})` : ""}` : "",
    ]);
    for (let i = own.length; i < total; i++) rows.push([String(i + 1), "", "", "", "", ""]);

    if (y > H - 50) {
      pdf.addPage();
      y = 16;
    }
    pdf.setFont("NS", "bold");
    pdf.setFontSize(10);
    pdf.text("Ход схваток", M, y - 2);
    autoTable(pdf, {
      startY: y,
      margin: { left: M, right: M, top: 14, bottom: 22 },
      theme: "grid",
      head: [["№", "Тур", "Сетка", "Синий угол", "Красный угол", "Победитель"]],
      body: rows,
      styles: { ...baseStyles, minCellHeight: 6.5 },
      headStyles,
      columnStyles: {
        0: { cellWidth: 9, halign: "center" },
        1: { cellWidth: 10, halign: "center" },
        2: { cellWidth: 24 },
        3: { cellWidth: "auto" },
        4: { cellWidth: "auto" },
        5: { cellWidth: 46, fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 3) d.cell.styles.textColor = [20, 60, 160];
        if (d.section === "body" && d.column.index === 4) d.cell.styles.textColor = [180, 20, 30];
      },
    });
  });

  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setFont("NS", "normal");
    pdf.setFontSize(9);
    pdf.text("Судья за столом ____________________", M, H - 12);
    pdf.text("Секретарь ____________________", W / 2 + 10, H - 12);
    pdf.setFontSize(8);
    pdf.text(`стр. ${p} из ${pages}`, W - M, H - 6, { align: "right" });
  }

  return saveFile(pdf.output("blob"), `${fileBase}.pdf`, FOLDERS.sheets);
}
