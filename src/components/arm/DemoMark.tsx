import { useLicense } from "@/lib/license";

export default function DemoMark() {
  const { demo } = useLicense();
  if (!demo) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden print:fixed" aria-hidden>
      <span className="-rotate-[30deg] select-none whitespace-nowrap text-[13vw] font-black uppercase tracking-widest text-corner-red/[0.07] print:text-black/10">
        Демоверсия
      </span>
    </div>
  );
}
