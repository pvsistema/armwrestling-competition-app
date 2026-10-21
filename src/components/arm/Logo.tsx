import { cn } from "@/lib/utils";

export const LOGO_SRC = `${import.meta.env.BASE_URL}logo-far-256.png`;
export const LOGO_SRC_HQ = `${import.meta.env.BASE_URL}logo-far.png`;

export default function Logo({ className, hq = false }: { className?: string; hq?: boolean }) {
  return (
    <img
      src={hq ? LOGO_SRC_HQ : LOGO_SRC}
      alt="Федерация армрестлинга России"
      className={cn("shrink-0 select-none rounded-full object-contain", className)}
      draggable={false}
    />
  );
}
