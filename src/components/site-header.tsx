import Link from "next/link";
import { EVENT_GROUP, EVENT_PARISH, EVENT_TITLE, EVENT_UNIT } from "@/lib/event";
import { EncuentrosLogo, LiturgiaLogo } from "@/components/logos";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b-2 border-primary bg-[color:var(--paper)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <EncuentrosLogo className="size-14 shrink-0 sm:size-16" />
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Encuentros Conyugales</p>
              <p className="text-xs text-muted-foreground">{EVENT_PARISH}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-right">
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">{EVENT_UNIT}</p>
              <p className="text-xs text-muted-foreground">{EVENT_GROUP}</p>
            </div>
            <LiturgiaLogo className="size-14 shrink-0 sm:size-16" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[color:var(--gold)] uppercase">{EVENT_PARISH} · {EVENT_GROUP}</p>
          <h1 className="font-heading mt-1 text-2xl font-semibold tracking-wide text-primary uppercase sm:text-3xl">{EVENT_TITLE}</h1>
          {!compact && (
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Inscripción de turnos de 30 minutos, del sábado 12 de septiembre a las 06:00 a.m. hasta el domingo 13 de septiembre a las 04:30 p.m. (hora de El Salvador).
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">Turnos</Link>
            <Link href="/organizador/" className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline">Coordinación</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
