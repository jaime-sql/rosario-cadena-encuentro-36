import Link from "next/link";
import { EventoSubtitulo } from "@/components/evento-rango";
import { EncuentrosLogo, LiturgiaLogo } from "@/components/logos";
import { EVENT_GROUP, EVENT_PARISH, EVENT_TITLE, EVENT_UNIT } from "@/lib/event";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b-2 border-primary bg-[color:var(--paper)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
        <div className="flex items-end justify-center gap-3 sm:hidden">
          <EncuentrosLogo className="h-20 max-w-[42vw]" />
          <LiturgiaLogo className="h-20 max-w-[42vw]" />
        </div>
        <div className="hidden items-center justify-between gap-3 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <EncuentrosLogo className="h-20 md:h-24" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
                Encuentros Conyugales
              </p>
              <p className="text-xs text-muted-foreground">{EVENT_PARISH}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-right">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                {EVENT_UNIT}
              </p>
              <p className="text-xs text-muted-foreground">{EVENT_GROUP}</p>
            </div>
            <LiturgiaLogo className="h-20 md:h-24" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[color:var(--gold)] uppercase">
            {EVENT_PARISH} · {EVENT_GROUP}
          </p>
          <h1 className="font-heading mt-1 text-xl font-semibold tracking-wide text-primary uppercase sm:text-3xl">
            {EVENT_TITLE}
          </h1>
          {!compact && <EventoSubtitulo />}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
              Turnos
            </Link>
            <Link
              href="/organizador/"
              className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Coordinación
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
