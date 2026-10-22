import { useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Fight, Fighter, Side, fid } from "@/lib/fights";
import { photoFromFile } from "@/lib/participantCards";
import { FarPassport } from "@/lib/farPassports";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import FarNameInput from "../FarNameInput";
import { FighterFlag, FighterPhoto } from "./FighterFace";

const CATS = ["Супертяжёлый вес", "Тяжёлый вес", "Полутяжёлый вес", "Средний вес", "Полусредний вес", "Лёгкий вес", "Женщины, открытая"];

const EMPTY_F: Fighter = { name: "", region: "" };

export function newFight(): Fight {
  return { id: fid(), blue: { ...EMPTY_F }, red: { ...EMPTY_F }, hand: "right", category: "Супертяжёлый вес", bestOf: 5, title: false, main: false, log: [] };
}

function FighterForm({ side, f, onChange }: { side: Side; f: Fighter; onChange: (f: Fighter) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const x = e.target.files?.[0];
    e.target.value = "";
    if (!x) return;
    try {
      onChange({ ...f, photo: await photoFromFile(x) });
    } catch (err) {
      toast({ title: "Фото не загружено", description: (err as Error).message, variant: "destructive" });
    }
  };
  const pickFar = (p: FarPassport) => onChange({ ...f, name: p.name, farId: p.id, region: p.region || f.region });
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-[14px] border-2 p-3", side === "blue" ? "border-corner-blue/50 bg-corner-blue/5" : "border-corner-red/50 bg-corner-red/5")}>
      <div className={cn("text-sm font-semibold uppercase", side === "blue" ? "text-corner-blue" : "text-corner-red")}>{side === "blue" ? "Синий угол" : "Красный угол"}</div>
      <div className="flex gap-3">
        <button type="button" onClick={() => file.current?.click()} title="Загрузить фото" className="group relative">
          <FighterPhoto f={f} className="h-24 w-20" />
          <span className="absolute inset-x-0 bottom-0 rounded-b-[12px] bg-navy/70 py-0.5 text-center text-[10px] text-white opacity-0 group-hover:opacity-100">фото</span>
        </button>
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <FarNameInput value={f.name} farId={f.farId} onChange={(v) => onChange({ ...f, name: v })} onPick={pickFar} onClearFar={() => onChange({ ...f, farId: undefined })} />
          <div className="flex items-center gap-2">
            <input className="field" value={f.region} onChange={(e) => onChange({ ...f, region: e.target.value })} placeholder="Город" />
            <FighterFlag region={f.region} className="h-8 w-12" />
          </div>
        </div>
      </div>
      <input className="field" value={f.note ?? ""} onChange={(e) => onChange({ ...f, note: e.target.value || undefined })} placeholder="Титулы для табло: «Чемпион мира», «18–2»" />
    </div>
  );
}

export default function FightEditor({ fight, onSave, onClose }: { fight: Fight | null; onSave: (f: Fight) => void; onClose: () => void }) {
  const [f, setF] = useState<Fight | null>(fight);
  const [prev, setPrev] = useState(fight);
  if (fight !== prev) {
    setPrev(fight);
    setF(fight);
  }
  const save = () => {
    if (!f) return;
    if (!f.blue.name.trim() || !f.red.name.trim()) {
      toast({ title: "Укажите обоих спортсменов", variant: "destructive" });
      return;
    }
    onSave({ ...f, blue: { ...f.blue, name: f.blue.name.trim() }, red: { ...f.red, name: f.red.name.trim() } });
  };
  return (
    <Dialog open={!!fight} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-auto">
        <DialogTitle>{fight?.log.length ? "Бой (уже идёт)" : "Бой"}</DialogTitle>
        {f && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <FighterForm side="blue" f={f.blue} onChange={(x) => setF({ ...f, blue: x })} />
              <FighterForm side="red" f={f.red} onChange={(x) => setF({ ...f, red: x })} />
            </div>
            <button type="button" className="pill self-center !py-1.5 text-sm" onClick={() => setF({ ...f, blue: f.red, red: f.blue })}>
              <Icon name="ArrowLeftRight" size={14} /> Поменять углы
            </button>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-panel-muted">Категория</span>
                <input className="field" list="fight-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
                <datalist id="fight-cats">
                  {CATS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-panel-muted">Рука</span>
                <div className="flex h-11 rounded-[14px] border border-line bg-surface p-1">
                  {(["right", "left"] as const).map((h) => (
                    <button key={h} type="button" onClick={() => setF({ ...f, hand: h })} className={cn("flex-1 rounded-[10px] text-sm font-medium", f.hand === h ? "bg-primary text-primary-foreground" : "text-panel-muted")}>
                      {h === "right" ? "Правая" : "Левая"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-panel-muted">Раундов</span>
                <div className="flex h-11 rounded-[14px] border border-line bg-surface p-1">
                  {([3, 5, 7] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      disabled={!!fight?.log.length}
                      onClick={() => setF({ ...f, bestOf: b })}
                      title={`До ${Math.ceil(b / 2)} побед`}
                      className={cn("flex-1 rounded-[10px] text-sm font-medium disabled:opacity-60", f.bestOf === b ? "bg-primary text-primary-foreground" : "text-panel-muted")}
                    >
                      {Math.ceil(b / 2)} из {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn("pill", f.title && "pill-on")}
                onClick={() => setF({ ...f, title: !f.title, bestOf: !f.title && !fight?.log.length ? 7 : f.bestOf })}
              >
                <Icon name="Trophy" size={15} /> Титульный бой
              </button>
              <button type="button" className={cn("pill", f.main && "pill-on")} onClick={() => setF({ ...f, main: !f.main })}>
                <Icon name="Star" size={15} /> Главный бой вечера
              </button>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <button className="pill" onClick={onClose}>
                Отмена
              </button>
              <button className="btn-blue" onClick={save}>
                <Icon name="Check" size={16} /> Сохранить
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
