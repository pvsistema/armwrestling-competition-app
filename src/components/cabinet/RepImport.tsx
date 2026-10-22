import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Draft, downloadRepTemplate, readAthletesFile } from "@/lib/importAthletes";
import { RepAthlete, cab, fmtD } from "@/lib/cabinet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const key = (name: string, birth: string) => `${name.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim()}|${birth.slice(0, 4)}`;

function toRep(d: Draft, team: string): RepAthlete {
  return {
    name: d.name,
    gender: d.gender,
    birthDate: d.birthDate || "",
    rank: d.rank || "",
    club: d.club || team,
    city: d.city || "",
    district: d.district || "",
    farId: d.farId || "",
    para: d.para,
    coach: d._coach || "",
    insNum: d._insNum || "",
    insTo: d._insTo || "",
  };
}

export default function RepImport({ list, team, reload }: { list: RepAthlete[]; team: string; reload: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<{ a: RepAthlete; errors: string[]; dup: boolean; line: number }[] | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const res = await readAthletesFile(file, []);
      if ("error" in res && res.error) {
        toast({ title: "Не удалось прочитать файл", description: res.error, variant: "destructive" });
        return;
      }
      const have = new Set(list.map((a) => key(a.name, a.birthDate)));
      const out = res.drafts.map((d) => {
        const a = toRep(d, team);
        const errors = [...d._errors];
        if (d.birthYear && !d.birthDate) errors.push("нужна полная дата рождения");
        const k = key(a.name, a.birthDate);
        const dup = have.has(k);
        have.add(k);
        return { a, errors, dup, line: d._row };
      });
      setFileName(file.name);
      setRows(out);
      setSkip(new Set(out.map((r, i) => (r.dup || r.errors.length ? i : -1)).filter((i) => i >= 0)));
    } catch {
      toast({ title: "Файл не открылся", description: "Проверьте, что это Excel или Word (.docx) и он не защищён паролем.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) =>
    setSkip((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  const save = async () => {
    if (!rows) return;
    const athletes = rows.filter((_, i) => !skip.has(i)).map((r) => r.a);
    if (!athletes.length) return;
    setBusy(true);
    try {
      const r = await cab<{ added: number }>("athletes_bulk", { athletes });
      toast({ title: `Добавлено спортсменов: ${r.added}` });
      setRows(null);
      reload();
    } catch (e) {
      toast({ title: "Не сохранено", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(false);
  };

  const chosen = rows ? rows.length - skip.size : 0;
  const noIns = rows?.filter((r, i) => !skip.has(i) && (!r.a.insNum || !r.a.insTo)).length ?? 0;

  return (
    <>
      <button className="pill" onClick={() => input.current?.click()} disabled={busy}>
        <Icon name={busy ? "Loader2" : "FileSpreadsheet"} size={16} className={busy ? "animate-spin" : ""} /> Загрузить из Excel
      </button>
      <button className="pill" onClick={() => downloadRepTemplate()}>
        <Icon name="FileDown" size={16} /> Шаблон
      </button>
      <input ref={input} type="file" accept=".xlsx,.xls,.csv,.ods,.docx" className="hidden" onChange={onFile} />

      <Dialog open={!!rows} onOpenChange={(o) => !o && setRows(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b border-line px-6 py-4">
            <DialogTitle className="text-xl font-medium">Загрузка: {fileName}</DialogTitle>
            <div className="text-sm text-panel-muted">
              Найдено {rows?.length ?? 0}
              {rows?.some((r) => r.dup) ? ` · уже есть в списке: ${rows.filter((r) => r.dup).length}` : ""}
              {rows?.some((r) => r.errors.length) ? ` · с ошибками: ${rows.filter((r) => r.errors.length).length}` : ""}. Снимите галочку с тех, кого добавлять не нужно.
            </div>
          </DialogHeader>
          <div className="max-h-[58vh] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs text-panel-muted">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-2 py-2">ФИО</th>
                  <th className="px-2 py-2">пол</th>
                  <th className="px-2 py-2">д.р.</th>
                  <th className="px-2 py-2">звание</th>
                  <th className="px-2 py-2">субъект · город</th>
                  <th className="px-2 py-2">паспорт ФАР</th>
                  <th className="px-2 py-2">тренер</th>
                  <th className="px-2 py-2">страховка</th>
                </tr>
              </thead>
              <tbody>
                {rows?.map((r, i) => (
                  <tr key={i} onClick={() => toggle(i)} className={cn("cursor-pointer border-b border-line/60 hover:bg-surface/60", skip.has(i) && "opacity-45")}>
                    <td className="px-3 py-2">
                      <Icon name={skip.has(i) ? "Square" : "SquareCheck"} size={17} className={skip.has(i) ? "" : "text-primary"} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.a.name || "—"}</div>
                      {(r.dup || r.errors.length > 0) && (
                        <div className="text-xs text-corner-red">
                          стр. {r.line}: {[...(r.dup ? ["уже в списке"] : []), ...r.errors].join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{r.a.gender === "M" ? "М" : "Ж"}</td>
                    <td className="px-2 py-2 font-mono">{fmtD(r.a.birthDate) || "—"}</td>
                    <td className="px-2 py-2">{r.a.rank}</td>
                    <td className="px-2 py-2">{[r.a.club, r.a.city].filter(Boolean).join(", ")}</td>
                    <td className="px-2 py-2 font-mono text-xs">{r.a.farId}</td>
                    <td className="px-2 py-2">{r.a.coach}</td>
                    <td className="px-2 py-2 text-xs">
                      {r.a.insNum || r.a.insTo ? (
                        <span className="font-mono">
                          {r.a.insNum || "—"}
                          {r.a.insTo && ` до ${fmtD(r.a.insTo)}`}
                        </span>
                      ) : (
                        <span className="text-amber-700">нет</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-6 py-4">
            <span className="text-sm text-panel-muted">
              {noIns > 0 && `Без страховки: ${noIns} — её можно дописать позже, но без неё спортсмена не включить в заявку.`}
            </span>
            <button className="pill ml-auto" onClick={() => setRows(null)}>
              Отмена
            </button>
            <button className="btn-blue" disabled={busy || !chosen} onClick={save}>
              <Icon name="UserPlus" size={17} /> Добавить {chosen}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
