import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { restPresets } from "@/lib/timers";
import { cn } from "@/lib/utils";

type Tab = "keys" | "judge" | "secretary";

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex min-w-[28px] items-center justify-center rounded-md border border-line bg-surface px-1.5 py-0.5 font-mono text-sm font-semibold text-foreground shadow-[0_1px_0_hsl(var(--line))]">
    {children}
  </kbd>
);

function Case({ icon, title, children, rule }: { icon: string; title: string; children: React.ReactNode; rule?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <Icon name={icon} size={18} className="text-primary" />
        {title}
        {rule && <span className="ml-auto font-mono text-[11px] font-normal text-panel-muted">{rule}</span>}
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-foreground/85">{children}</ol>
    </div>
  );
}

/** Памятка для судей и секретаря: клавиши и порядок действий в спорных случаях. */
export default function HelpSheet() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("keys");
  const { tournament } = useStore();
  const [shortRest, longRest] = restPresets(tournament);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "F1" || e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const keys: [string[], string][] = [
    [["1", "←"], "Победил синий угол"],
    [["2", "→"], "Победил красный угол"],
    [["Q"], "Фол синему"],
    [["P"], "Фол красному"],
    [["T"], `Отдых ${shortRest.label}`],
    [["Y"], `Отдых ${longRest.label}`],
    [["U"], "Свой отдых — задать время"],
    [["F1", "?"], "Открыть / закрыть эту памятку"],
  ];

  return (
    <>
      <button className="pill" onClick={() => setOpen(true)} title="Памятка для судей и секретаря (F1)">
        <Icon name="CircleHelp" size={16} /> Памятка
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-background sm:max-w-xl print:hidden">
          <SheetHeader>
            <SheetTitle className="text-2xl">Памятка судьи и секретаря</SheetTitle>
          </SheetHeader>
          <div className="my-4 flex flex-wrap gap-1.5">
            {(
              [
                ["keys", "Клавиши"],
                ["judge", "Судье за столом"],
                ["secretary", "Секретарю"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className={cn("pill !py-1.5", tab === k && "pill-on")} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          {tab === "keys" && (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-line bg-panel">
                {keys.map(([k, d]) => (
                  <div key={d} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
                    <div className="flex w-24 shrink-0 gap-1">
                      {k.map((x) => (
                        <Kbd key={x}>{x}</Kbd>
                      ))}
                    </div>
                    <span className="text-sm">{d}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-panel-muted">
                Клавиши работают на пульте судьи и на русской раскладке (Й, З, Е, Н, Г). Пока курсор стоит в поле ввода, клавиши не срабатывают — щёлкните по пустому месту.
              </p>
            </div>
          )}

          {tab === "judge" && (
            <div className="flex flex-col gap-3">
              <Case icon="Megaphone" title="Вызов пары" rule="п. 11.2">
                <li>Нажмите «Вызов · 1 мин» — отсчёт появится на пульте и на табло.</li>
                <li>Оба подошли — «Вышли», отсчёт пропадёт.</li>
                <li>Спортсмен не вышел за минуту — «Неявка: фамилия». Сопернику засчитается победа с пометкой «неявка».</li>
              </Case>
              <Case icon="Flag" title="Замечания и фолы" rule="п. 11.14–11.15">
                <li>«Замечание» — фальстарт, задержка захвата, отрыв руки от штыря. Два замечания = один фол.</li>
                <li>«Фол» (Q / P) — отрыв или соскальзывание локтя, уход от борьбы, опасное положение и т. п.</li>
                <li>Второй фол — программа сама засчитает поражение и покажет это на табло.</li>
                <li>Ошиблись — нажмите «убрать» рядом с кружками фолов.</li>
                <li>После остановки поединка из-за фола — отдых {shortRest.label} (клавиша T).</li>
              </Case>
              <Case icon="HeartPulse" title="Травма во время поединка" rule="п. 11.10">
                <li>Поединок, в котором получена травма, засчитывается как проигранный — отметьте победу сопернику.</li>
                <li>Если врач не допускает спортсмена дальше — значок «снять» у его фамилии → «Травма — снять».</li>
                <li>Во всех его оставшихся схватках на обеих руках победы получат соперники, сетка пойдёт дальше сама.</li>
              </Case>
              <Case icon="Hand" title="Переход на вторую руку" rule="п. 1.1">
                <li>Стол закончил первую руку — на табло перерыв: «Левая рука завершена» и победители категорий этого стола.</li>
                <li>Нажмите «Вызов» первой пары второй руки — перерыв на табло сменится схваткой.</li>
                <li>Программа сразу предложит напечатать или сохранить протокол первой руки по категориям этого стола (PDF, Word, Excel). Те же кнопки есть в полосе над пультом.</li>
                <li>Ждать ли другие столы — настраивается в «Категориях» → «Порядок рук».</li>
              </Case>
              <Case icon="Undo2" title="Ошибочно отметили победителя">
                <li>Нажмите «отменить последнюю схватку» под карточками спортсменов.</li>
                <li>Отменяется только самая последняя отметка за весь турнир. Если после неё уже провели другие схватки — отменяйте по одной.</li>
              </Case>
              <Case icon="Timer" title="Отдых" rule="п. 11.11, 11.13">
                <li>После паузы с предупреждением — не более {shortRest.label} (T).</li>
                <li>Между поединками одного спортсмена — не менее {longRest.label} (Y).</li>
                <li>Длительности меняются в «Категориях» → «Таймеры отдыха по регламенту».</li>
              </Case>
            </div>
          )}

          {tab === "secretary" && (
            <div className="flex flex-col gap-3">
              <Case icon="Scale" title="Взвешивание и допуск" rule="п. 8.8–8.9">
                <li>Вес вводите в «Участниках», Enter — сохранить. Провес задаётся в «Категориях»: 0,05 кг на ЧР/ПР, 0,1 кг или своё значение по Положению.</li>
                <li>Заявка на категорию выше — кнопка «↑ выше» у спортсмена.</li>
                <li>Если включено «Требовать отметки допуска» — без отметок «врач», «страх.», «мандат» спортсмен не попадёт в жеребьёвку. Фильтр «Без допуска» покажет всех, у кого их нет.</li>
                <li>Изменили вес, руку или допуск после жеребьёвки — перетяните жребий этой категории в «Сетке».</li>
              </Case>
              <Case icon="Scale3d" title="Равенство очков в двоеборье" rule="п. 2.2–2.6">
                <li>Программа сама сравнивает: лучшее место на одной из рук → место на другой руке → стартовый вес.</li>
                <li>Вес одинаковый — в протоколе появится поле перевзвешивания. Впишите вес после повторного взвешивания.</li>
                <li>Совпало и перевзвешивание — нажмите «Назначить решающий поединок». Руку выберет жребий, пара встанет в очередь стола.</li>
                <li>3-е + 3-е или 2-е + 3-е места на руках, а в сумме 4-е — программа присудит 3-е место (два 3-х места, п. 2.7).</li>
              </Case>
              <Case icon="Users" title="Равенство в командном зачёте" rule="п. 1.1">
                <li>Выше команда, у которой больше 1-х мест, затем 2-х и т. д. Пояснение выводится под командой.</li>
                <li>Абсолютное первенство в командный зачёт не идёт.</li>
              </Case>
              <Case icon="UserX" title="Снятие, дисквалификация">
                <li>На пульте: значок у фамилии → «Снят с соревнований» или «Дисквалификация».</li>
                <li>Вернуть по ошибке снятого — «Участники» → «вернуть». Уже засчитанные поражения останутся, их можно отменить по одной.</li>
              </Case>
              <Case icon="FileText" title="Документы" rule="п. 10.4">
                <li>Стартовые протоколы вывешиваются не позднее чем за 20 минут до начала — «Сетка» → «Листы для судей на столы».</li>
                <li>Итоги — «Протоколы»: PDF, Word, Excel или печать.</li>
                <li>Один раз нажмите «Папка турнира» и выберите папку — протоколы будут сохраняться туда по подпапкам: «Левая рука», «Правая рука», «Общий», «Листы судей», «Копии турнира».</li>
                <li>Когда папка выбрана, программа сама каждые 15 минут сохраняет копию турнира в «Копии турнира» — значок со щитом в шапке показывает, когда была последняя.</li>
                <li>После сбоя или очистки браузера программа при открытии сама найдёт более свежую копию и предложит восстановить. Любую копию можно вернуть через значок щита → «Восстановить из копии».</li>
              </Case>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
