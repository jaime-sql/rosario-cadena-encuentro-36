import { cn } from "cn";
import { withBasePath } from "@/lib/base-path";

const ENCUENTROS_ALT =
  "Encuentros Conyugales — San Juan Bautista, Ordinariato Militar de El Salvador";
const LITURGIA_ALT = "Unidad de Liturgia y Oración MEC-SJB — San Juan Bautista";

const logoClassName = "h-full w-auto max-w-full object-contain object-center";

export function EncuentrosLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      <img
        src={withBasePath("/logos/encuentros-conyugales.jpg")}
        alt={ENCUENTROS_ALT}
        width={800}
        height={1200}
        className={logoClassName}
        decoding="async"
      />
    </span>
  );
}

export function LiturgiaLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
      <img
        src={withBasePath("/logos/unidad-liturgia-oracion.jpg")}
        alt={LITURGIA_ALT}
        width={800}
        height={1200}
        className={logoClassName}
        decoding="async"
      />
    </span>
  );
}
