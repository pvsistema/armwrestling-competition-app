import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEMO_ATHLETES, DEMO_TABLES, activate, deactivateLocal, onUpsell, recheck, useLicense } from "@/lib/license";
import { cn } from "@/lib/utils";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

export default function LicenseButton() {
  const { license, full } = useLicense();
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    recheck();
    onUpsell((r) => {
      setWhy(r);
      setErr("");
      setOpen(true);
    });
    return () => onUpsell(() => {});
  }, []);

  const submit = async () => {
    setBusy(true);
    setErr("");
    const r = await activate(key);
    setBusy(false);
    if (r.ok) {
      setKey("");
      setWhy("");
    } else setErr(r.error);
  };

  return (
    <>
      <button
        className={cn("pill", !full && "!border-gold !bg-gold !text-gold-foreground")}
        onClick={() => {
          setWhy("");
          setErr("");
          setOpen(true);
        }}
        title={full ? "Полная версия активирована" : "Демоверсия — активировать полную версию"}
      >
        <Icon name={full ? "BadgeCheck" : "KeyRound"} size={16} /> {full ? "Полная версия" : "Демо · Активировать"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name={full ? "BadgeCheck" : "KeyRound"} size={20} className="text-gold" />
              {full ? "Полная версия активирована" : "Активация полной версии"}
            </DialogTitle>
            {!full && <DialogDescription>{why || "Сейчас программа работает в демо-режиме."}</DialogDescription>}
          </DialogHeader>

          {full && license ? (
            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-lg bg-surface p-3">
                {license.holder && (
                  <div>
                    Владелец: <b>{license.holder}</b>
                  </div>
                )}
                <div>
                  Ключ: <span className="font-mono">{license.key}</span>
                </div>
                <div>Действует: {license.expires ? `до ${fmtDate(license.expires)}` : "бессрочно"}</div>
              </div>
              <button
                className="pill self-start"
                onClick={() => confirm("Отключить полную версию на этом компьютере? Ключ можно будет ввести снова.") && deactivateLocal()}
              >
                <Icon name="LogOut" size={15} /> Отключить на этом компьютере
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <ul className="flex flex-col gap-1 rounded-lg bg-tip px-4 py-3 text-tip-foreground">
                <li>• до {DEMO_ATHLETES} участников в турнире;</li>
                <li>• только {DEMO_TABLES} стол;</li>
                <li>• надпись «Демоверсия» на экране, табло и документах.</li>
              </ul>
              <label className="flex flex-col gap-1.5">
                <span className="font-medium">Ключ активации</span>
                <input
                  className="field font-mono uppercase tracking-wider"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && key.trim() && submit()}
                  autoFocus
                />
              </label>
              {err && <div className="rounded-lg bg-corner-red/10 px-3 py-2 text-corner-red">{err}</div>}
              <button className="btn-blue" disabled={busy || key.replace(/[^a-z0-9]/gi, "").length < 16} onClick={submit}>
                {busy ? <Icon name="Loader2" size={17} className="animate-spin" /> : <Icon name="Unlock" size={17} />} Активировать
              </button>
              <p className="text-xs text-panel-muted">Ключ выдаёт продавец программы. Для активации нужен интернет, дальше программа работает и без него.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
