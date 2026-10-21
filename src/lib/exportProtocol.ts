import type { ProtocolDoc, Section } from "./protocolModel";

const BASE = import.meta.env.BASE_URL;

import { Saved, saveFile } from "./saveFolder";

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

const officialLine = (o: [string, string]) => `${o[0]} ________________ ${o[1]}`;

/* ---------------- PDF ---------------- */
export async function exportPdf(doc: ProtocolDoc, withLogo: boolean, opts: { print?: boolean } = {}): Promise<Saved | null> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const [reg, bold, ital] = await Promise.all([
    fetchBuf("fonts/NotoSerif-Regular.ttf"),
    fetchBuf("fonts/NotoSerif-Bold.ttf"),
    fetchBuf("fonts/NotoSerif-Italic.ttf"),
  ]);
  pdf.addFileToVFS("NS-R.ttf", toBase64(reg));
  pdf.addFont("NS-R.ttf", "NS", "normal");
  pdf.addFileToVFS("NS-B.ttf", toBase64(bold));
  pdf.addFont("NS-B.ttf", "NS", "bold");
  pdf.addFileToVFS("NS-I.ttf", toBase64(ital));
  pdf.addFont("NS-I.ttf", "NS", "italic");
  let logo: string | null = null;
  if (withLogo) {
    try {
      logo = "data:image/png;base64," + toBase64(await fetchBuf("logo-far-256.png"));
    } catch {
      logo = null;
    }
  }

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 12;
  const headerH = doc.subtitle ? 24 : 19;
  const footerH = doc.officials.length > 2 ? 14 : 9;

  const drawHeaderFooter = () => {
    const page = pdf.getNumberOfPages();
    pdf.setFont("NS", "bold");
    pdf.setFontSize(13);
    let y = 11;
    pdf.text(doc.title, W / 2, y, { align: "center" });
    if (doc.subtitle) {
      y += 5.5;
      pdf.text(doc.subtitle, W / 2, y, { align: "center", maxWidth: W - 70 });
    }
    if (doc.placeDate) {
      y += 5.5;
      pdf.text(doc.placeDate, W / 2, y, { align: "center" });
    }
    pdf.setFont("NS", "normal");
    pdf.setFontSize(10);
    pdf.text(String(page), W - M, 9, { align: "right" });
    if (logo) pdf.addImage(logo, "PNG", M, 4, 16, 16);
    pdf.setFontSize(9);
    const fy = H - footerH + 3;
    doc.officials.forEach((o, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      pdf.text(officialLine(o), col === 0 ? M : W / 2 + 4, fy + row * 5);
    });
  };

  let y = headerH + 4;
  pdf.setFont("NS", "normal");
  pdf.setFontSize(10);
  for (const line of doc.info) {
    const lines = pdf.splitTextToSize(line, W - 2 * M) as string[];
    pdf.text(lines, M, y);
    y += lines.length * 4.3;
  }
  if (doc.requirements) {
    pdf.setFont("NS", "italic");
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(doc.requirements, W - 2 * M) as string[];
    pdf.text(lines, M, y + 1);
    y += lines.length * 3.9 + 1;
  }
  y += 3;

  let first = true;
  const multiGroup = new Set(doc.sections.map((x) => x.group).filter(Boolean)).size > 1;
  let prevGroup: string | undefined;
  for (const s of doc.sections) {
    const newGroup = multiGroup && s.group && s.group !== prevGroup;
    prevGroup = s.group ?? prevGroup;
    if ((s.newPage || newGroup) && !first) {
      pdf.addPage();
      y = headerH + 4;
    } else if (!first) {
      const need = 30;
      if (y + need > H - footerH - 4) {
        pdf.addPage();
        y = headerH + 4;
      }
    }
    first = false;
    if (newGroup) {
      pdf.setFont("NS", "bold");
      pdf.setFontSize(12);
      pdf.text(s.group!.toUpperCase(), W / 2, y + 2, { align: "center" });
      y += 7;
    }
    pdf.setFont("NS", "bold");
    pdf.setFontSize(s.newPage ? 12 : 10);
    if (s.newPage) pdf.text(s.title, W / 2, y + 2, { align: "center" });
    else pdf.text(s.title, M, y + 2);
    y += 5;
    const totalW = s.columns.reduce((a, c) => a + c.width, 0);
    const tableW = s.newPage && s.columns.length <= 3 ? (W - 2 * M) * 0.7 : W - 2 * M;
    const left = s.newPage && s.columns.length <= 3 ? (W - tableW) / 2 : M;
    autoTable(pdf, {
      startY: y,
      margin: { left, right: W - left - tableW, top: headerH + 4, bottom: footerH + 2 },
      head: [s.columns.map((c) => c.title)],
      body: s.rows,
      theme: "grid",
      styles: {
        font: "NS",
        fontStyle: s.boldBody ? "bold" : "normal",
        fontSize: s.fontSize ?? 8,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.2,
        cellPadding: 0.9,
        valign: "middle",
      },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", halign: "center", valign: "middle" },
      columnStyles: Object.fromEntries(
        s.columns.map((c, i) => [i, { cellWidth: (c.width / totalW) * tableW, halign: c.align ?? "left" }]),
      ),
      didDrawPage: drawHeaderFooter,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (pdf as any).lastAutoTable.finalY + 3;
    if (s.notes?.length) {
      pdf.setFont("NS", "italic");
      pdf.setFontSize(8);
      for (const n of s.notes) {
        const lines = pdf.splitTextToSize(n, W - 2 * M) as string[];
        if (y + lines.length * 3.5 > H - footerH - 2) {
          pdf.addPage();
          drawHeaderFooter();
          y = headerH + 4;
        }
        pdf.text(lines, M, y + 1);
        y += lines.length * 3.5;
      }
      y += 2;
    }
    y += 4;
  }
  if (!doc.sections.length) drawHeaderFooter();
  if (opts.print) {
    pdf.autoPrint();
    const url = URL.createObjectURL(pdf.output("blob"));
    const w = window.open(url, "_blank");
    if (!w) {
      const r = await saveFile(pdf.output("blob"), `${doc.fileBase}.pdf`, doc.folder);
      throw new Error(`Браузер заблокировал окно печати — PDF сохранён (${r.path}), откройте и распечатайте его.`);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return null;
  }
  return saveFile(pdf.output("blob"), `${doc.fileBase}.pdf`, doc.folder);
}

/* ---------------- Word ---------------- */
export async function exportWord(doc: ProtocolDoc, withLogo: boolean): Promise<Saved> {
  const d = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    PageOrientation,
    Header,
    Footer,
    PageNumber,
    BorderStyle,
    VerticalAlign,
    ImageRun,
    TabStopType,
  } = d;
  const FONT = "Times New Roman";
  const run = (text: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
    new TextRun({ text, font: FONT, bold: o.bold, italics: o.italics, size: (o.size ?? 11) * 2 });
  const para = (text: string, o: { bold?: boolean; italics?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number; pageBreak?: boolean } = {}) =>
    new Paragraph({
      alignment: o.align,
      spacing: { after: o.after ?? 0, before: o.before ?? 0 },
      pageBreakBefore: o.pageBreak,
      children: text.split("\n").map((t, i) => (i ? new TextRun({ text: t, break: 1, font: FONT, bold: o.bold, italics: o.italics, size: (o.size ?? 11) * 2 }) : run(t, o))),
    });

  let logoImg: InstanceType<typeof ImageRun> | null = null;
  if (withLogo) {
    try {
      const buf = await fetchBuf("logo-far-256.png");
      logoImg = new ImageRun({ type: "png", data: new Uint8Array(buf), transformation: { width: 56, height: 56 }, floating: { horizontalPosition: { offset: 360000 }, verticalPosition: { offset: 180000 }, allowOverlap: true, wrap: { type: 0 } } } as never);
    } catch {
      logoImg = null;
    }
  }

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [...(logoImg ? [logoImg] : []), run(doc.title, { bold: true, size: 14 })],
      }),
      ...(doc.subtitle ? [para(doc.subtitle, { bold: true, size: 14, align: AlignmentType.CENTER })] : []),
      ...(doc.placeDate ? [para(doc.placeDate, { bold: true, size: 14, align: AlignmentType.CENTER })] : []),
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] }),
    ],
  });

  const pairs: [string, string][][] = [];
  for (let i = 0; i < doc.officials.length; i += 2) pairs.push(doc.officials.slice(i, i + 2) as [string, string][]);
  const footer = new Footer({
    children: pairs.map(
      (p) =>
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 7600 }],
          children: [run(officialLine(p[0]), { size: 11 }), ...(p[1] ? [new TextRun({ text: "\t", font: FONT }), run(officialLine(p[1]), { size: 11 })] : [])],
        }),
    ),
  });

  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const PAGE_W = 15400;
  const mkTable = (s: Section) => {
    const narrow = s.newPage && s.columns.length <= 3;
    const tw = narrow ? Math.round(PAGE_W * 0.7) : PAGE_W;
    const total = s.columns.reduce((a, c) => a + c.width, 0);
    const widths = s.columns.map((c) => Math.round((c.width / total) * tw));
    const fs = s.fontSize ?? 8;
    const al = (a?: string) => (a === "center" ? AlignmentType.CENTER : a === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT);
    const cell = (text: string, i: number, headCell: boolean) =>
      new TableCell({
        width: { size: widths[i], type: WidthType.DXA },
        borders,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 20, bottom: 20, left: 60, right: 60 },
        children: [para(text, { bold: headCell || s.boldBody, size: fs, align: headCell ? AlignmentType.CENTER : al(s.columns[i].align) })],
      });
    return new Table({
      width: { size: tw, type: WidthType.DXA },
      columnWidths: widths,
      alignment: narrow ? AlignmentType.CENTER : AlignmentType.LEFT,
      rows: [
        new TableRow({ tableHeader: true, children: s.columns.map((c, i) => cell(c.title, i, true)) }),
        ...s.rows.map((r) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(v, i, false)) })),
      ],
    });
  };

  const body: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  doc.info.forEach((l) => body.push(para(l, { size: 11 })));
  if (doc.requirements) body.push(para(doc.requirements, { italics: true, size: 10, before: 80 }));
  const multiGroupW = new Set(doc.sections.map((x) => x.group).filter(Boolean)).size > 1;
  let prevGroupW: string | undefined;
  doc.sections.forEach((s, idx) => {
    if (multiGroupW && s.group && s.group !== prevGroupW) {
      body.push(para(s.group.toUpperCase(), { bold: true, size: 12, align: AlignmentType.CENTER, after: 120, pageBreak: idx > 0 }));
    }
    prevGroupW = s.group ?? prevGroupW;
    body.push(
      para(s.title, {
        bold: true,
        size: s.newPage ? 12 : 10,
        align: s.newPage ? AlignmentType.CENTER : AlignmentType.LEFT,
        before: s.newPage ? 0 : 200,
        after: 80,
        pageBreak: s.newPage,
      }),
    );
    body.push(mkTable(s));
    s.notes?.forEach((n) => body.push(para(n, { italics: true, size: 8 })));
  });

  const docx = new Document({
    creator: "Рукоборец",
    title: doc.title,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 },
            margin: { top: 1500, bottom: 1000, left: 700, right: 700, header: 300, footer: 300 },
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children: body,
      },
    ],
  });
  return saveFile(await Packer.toBlob(docx), `${doc.fileBase}.docx`, doc.folder);
}

/* ---------------- Excel ---------------- */
export async function exportExcel(doc: ProtocolDoc): Promise<Saved> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Рукоборец";
  const thin = { style: "thin" as const, color: { argb: "FF000000" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const font = (o: { bold?: boolean; italic?: boolean; size?: number } = {}) => ({ name: "Times New Roman", size: o.size ?? 10, bold: o.bold, italic: o.italic });

  const groups: { name: string; sections: Section[] }[] = [];
  const personal = doc.sections.filter((s) => !s.newPage);
  const gNames = Array.from(new Set(personal.map((s) => s.group ?? "Личный зачёт")));
  for (const gn of gNames) {
    const short = gn.startsWith("Борьба левой") ? "Левая рука" : gn.startsWith("Борьба правой") ? "Правая рука" : gn.startsWith("Двоеборье") ? "Двоеборье" : gn;
    groups.push({ name: short, sections: personal.filter((s) => (s.group ?? "Личный зачёт") === gn) });
  }
  doc.sections
    .filter((s) => s.newPage)
    .forEach((s) => groups.push({ name: s.title.includes("округ") ? "Зачёт по округам" : s.title.includes("субъект") ? "Командный зачёт" : "Судейская коллегия", sections: [s] }));
  if (!groups.length) groups.push({ name: "Протокол", sections: [] });

  for (const g of groups) {
    const ws = wb.addWorksheet(g.name.slice(0, 31), {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
      headerFooter: { oddHeader: "&RЛист &P" },
    });
    const ncol = Math.max(3, ...g.sections.map((s) => s.columns.length));
    const merged = (text: string, f: ReturnType<typeof font>, align: "left" | "center" = "center", h?: number) => {
      const r = ws.addRow([text]);
      ws.mergeCells(r.number, 1, r.number, ncol);
      r.getCell(1).font = f;
      r.getCell(1).alignment = { horizontal: align, vertical: "middle", wrapText: true };
      if (h) r.height = h;
      return r;
    };
    merged(doc.title, font({ bold: true, size: 14 }));
    if (doc.subtitle) merged(doc.subtitle, font({ bold: true, size: 12 }));
    if (doc.placeDate) merged(doc.placeDate, font({ bold: true, size: 12 }));
    ws.addRow([]);
    for (let i = 0; i < doc.officials.length; i += 2) merged(doc.officials.slice(i, i + 2).map(officialLine).join("        "), font({ size: 10 }), "left");
    if (g === groups[0]) {
      ws.addRow([]);
      doc.info.forEach((l) => merged(l, font({ size: 10 }), "left", l.length > 180 ? 42 : undefined));
      if (doc.requirements) merged(doc.requirements, font({ italic: true, size: 9 }), "left", 40);
    }
    for (const s of g.sections) {
      ws.addRow([]);
      merged(s.title, font({ bold: true, size: 11 }), s.newPage ? "center" : "left");
      const hr = ws.addRow(s.columns.map((c) => c.title));
      hr.height = 42;
      hr.eachCell((c) => {
        c.font = font({ bold: true, size: 9 });
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = box;
      });
      s.rows.forEach((row) => {
        const r = ws.addRow(row.map((v) => (/^\d+(\.\d+)?$/.test(v) ? Number(v) : v.replace("\n", " "))));
        r.eachCell({ includeEmpty: true }, (c, i) => {
          if (i > s.columns.length) return;
          c.font = font({ bold: s.boldBody, size: 10 });
          c.alignment = { horizontal: s.columns[i - 1].align ?? "left", vertical: "middle", wrapText: true };
          c.border = box;
          if (s.columns[i - 1].title.startsWith("Вес")) c.numFmt = "0.00";
        });
      });
      s.notes?.forEach((n) => merged(n, font({ italic: true, size: 9 }), "left"));
    }
    ws.addRow([]);
    for (let i = 0; i < doc.officials.length; i += 2) merged(doc.officials.slice(i, i + 2).map(officialLine).join("        "), font({ size: 10 }), "left");
    const ref = g.sections[0];
    if (ref) {
      const total = ref.columns.reduce((a, c) => a + c.width, 0);
      ref.columns.forEach((c, i) => (ws.getColumn(i + 1).width = Math.max(6, Math.round((c.width / total) * 170))));
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  return saveFile(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${doc.fileBase}.xlsx`, doc.folder);
}
