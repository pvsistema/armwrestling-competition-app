import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { Draft, downloadTemplate, readAthletesFile } from "@/lib/importAthletes";
import { HAND_LABEL, fmtBirth } from "@/lib/arm";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ImportAthletes() {
  const { athletes, addAthletes } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const { drafts: d, error } = await readAthletesFile(file, athletes);
      if (error) {
        toast({ title: "Не удалось прочитать заявку", description: error, variant: "destructive" });
        return;
      }
      setFileName(file.name);
      setDrafts(d);
      setSkip(new Set(d.map((x, i) => (x._dup || x._errors.length ? i : -1)).filter((i) => i >= 0)));
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

  const apply = () => {
    if (!drafts) return;
    const list = drafts
      .filter((_, i) => !skip.has(i))
      .map(({ _row, _errors, _dup, ...a }) => ({ ...a, birthYear: a.birthYear || new Date().getFullYear() - 18 }));
    addAthletes(list);
    toast({ title: `Добавлено участников: ${list.length}`, description: "Проверьте вес на взвешивании и проведите жеребьёвку." });
    setDrafts(null);
  };

  const chosen = drafts ? drafts.length - skip.size : 0;
  const withErr = drafts?.filter((d) => d._errors.length).length ?? 0;
  const dups = drafts?.filter((d) => d._dup).length ?? 0;

  return (
    <>
      <button className="pill" onClick={() => input.current?.click()} disabled={busy}>
        <Icon name={busy ? "Loader2" : "FileSpreadsheet"} size={15} className={busy ? "animate-spin" : ""} /> Загрузить заявку (Excel, Word)
      </button>
      <button className="pill" onClick={() => downloadTemplate()}>
        <Icon name="FileDown" size={15} /> Шаблон заявки
      </button>
      <input ref={input} type="file" accept=".xlsx,.xls,.csv,.ods,.docx,.doc" className="hidden" onChange={onFile} />

      <Dialog open={!!drafts} onOpenChange={(o) => !o && setDrafts(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden border-frame bg-panel p-0 text-foreground">
          <DialogHeader className="border-b border-line px-6 py-4">
            <DialogTitle className="text-xl font-medium">Заявка: {fileName}</DialogTitle>
            <div className="text-sm text-panel-muted">
              Найдено {drafts?.length ?? 0}
              {dups ? ` · уже есть в списке: ${dups}` : ""}
              {withErr ? ` · с ошибками: ${withErr}` : ""}. Снимите галочку с тех, кого добавлять не нужно.
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left font-mono text-xs text-panel-muted">
                  <th className="w-10 px-3 py-2" />
                  <th className="px-2 py-2 font-normal">ФИО</th>
                  <th className="px-2 py-2 font-normal">пол</th>
                  <th className="px-2 py-2 font-normal">д.р.</th>
                  <th className="px-2 py-2 font-normal">звание</th>
                  <th className="px-2 py-2 font-normal">команда · город</th>
                  <th className="px-2 py-2 font-normal">округ</th>
                  <th className="px-2 py-2 font-normal">вес</th>
                  <th className="px-2 py-2 font-normal">руки</th>
                </tr>
              </thead>
              <tbody>
                {drafts?.map((d, i) => (
                  <tr
                    key={i}
                    onClick={() => toggle(i)}
                    className={cn("cursor-pointer border-b border-line/60 hover:bg-surface/60", skip.has(i) && "opacity-45")}
                  >
                    <td className="px-3 py-2">
                      <Icon name={skip.has(i) ? "Square" : "SquareCheck"} size={17} className={skip.has(i) ? "" : "text-primary"} />
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{d.name}</div>
                      {(d._errors.length > 0 || d._dup) && (
                        <div className="text-xs text-corner-red">
                          стр. {d._row}: {[...(d._dup ? ["уже в списке"] : []), ...d._errors].join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">{d.gender === "F" ? "жен" : "муж"}</td>
                    <td className="px-2 py-2 font-mono text-xs">{d.birthYear ? fmtBirth({ ...d, id: "" }) : "—"}</td>
                    <td className="px-2 py-2">{d.rank || "—"}</td>
                    <td className="px-2 py-2 text-panel-muted">
                      {d.club || "—"}
                      {d.city ? ` · ${d.city}` : ""}
                    </td>
                    <td className="px-2 py-2">{d.district || "—"}</td>
                    <td className="px-2 py-2 font-mono">{d.weight ?? "—"}</td>
                    <td className="px-2 py-2 text-xs">{d.hands.map((h) => HAND_LABEL[h]).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            <span className="mr-auto text-xs text-panel-muted">
              Пол определяется по столбцу «Пол», а если его нет — по отчеству. Если рука не указана — обе.
            </span>
            <button className="pill" onClick={() => setDrafts(null)}>
              Отмена
            </button>
            <button className="btn-blue" onClick={apply} disabled={!chosen}>
              <Icon name="UserPlus" size={16} /> Добавить {chosen}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
