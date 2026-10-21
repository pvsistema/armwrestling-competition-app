import { useState } from "react";
import Icon from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { AGE_PRESETS, uid } from "@/lib/arm";
import { useStore } from "@/lib/store";

export default function NeedGroups({ onGo, onDone }: { onGo: () => void; onDone: () => void }) {
  const { setGroups } = useStore();
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (t: string) => setSel((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const apply = () => {
    setGroups(AGE_PRESETS.filter((p) => sel.includes(p.title)).flatMap((p) => p.groups.map((g) => ({ ...g, limits: [...g.limits], id: uid() }))));
    onDone();
  };
  return (
    <div className="flex flex-1 items-start justify-center py-6">
      <div className="win w-full max-w-3xl border-t-4 border-t-gold">
        <div className="flex flex-col gap-5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-gold ring-2 ring-gold/40">
              <Icon name="Scale" size={22} />
            </span>
            <div>
              <div className="cat">ШАГ 1 ИЗ 2</div>
              <h2 className="text-2xl font-semibold tracking-tight">Сначала выберите категории участников</h2>
              <p className="mt-1 text-panel-muted">
                После этого каждый новый участник будет автоматически распределён по возрасту и весу. Совершеннолетних юниоров
                можно по желанию дополнительно заявить во взрослую категорию.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {AGE_PRESETS.map((p) => {
              const on = sel.includes(p.title);
              return (
                <button
                  key={p.title}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
                    on ? "border-gold bg-gold-soft" : "border-line bg-surface hover:border-gold/60",
                  )}
                  onClick={() => toggle(p.title)}
                >
                  <Icon name={on ? "SquareCheck" : "Square"} size={18} className="text-primary" />
                  <span className="font-medium">{p.title}</span>
                </button>
              );
            })}
          </div>
          <p className="-mt-2 text-xs text-panel-muted">
            Можно отметить несколько наборов. Чтобы совершеннолетних юниоров можно было по желанию заявить и среди взрослых, отметьте также «Мужчины и женщины».
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-blue" disabled={!sel.length} onClick={apply}>
              Применить и перейти к регистрации <Icon name="ArrowRight" size={16} />
            </button>
            <button className="pill" onClick={onGo}>
              <Icon name="SlidersHorizontal" size={15} /> Настроить категории вручную
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
