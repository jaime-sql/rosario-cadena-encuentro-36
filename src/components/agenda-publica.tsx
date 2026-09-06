"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingDialog } from "@/components/booking-dialog";
import { GestionarReservaDialog } from "@/components/gestionar-reserva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_PARAMS, type EventParams } from "@/lib/params";
import { getEventParams, listPublicReservas, mergeAgenda, usesHostedDatabase } from "@/lib/storage";
import { dayHeading, formatHora } from "@/lib/slots";
import { assertNoTelefonos, type PublicTurno } from "@/lib/types";

type Filter = "todos" | "disponibles" | "reservados";

export function AgendaPublica() {
  const [turnos, setTurnos] = useState<PublicTurno[]>([]);
  const [params, setParams] = useState<EventParams>(DEFAULT_PARAMS);
  const [filter, setFilter] = useState<Filter>("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicTurno | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const hosted =
    usesHostedDatabase() ||
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reservas, loaded] = await Promise.all([listPublicReservas(), getEventParams()]);
      assertNoTelefonos(reservas);
      setParams(loaded);
      setTurnos(mergeAgenda(reservas, loaded));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo conectar con la base de reservas. Intente de nuevo.");
      setTurnos(mergeAgenda([], DEFAULT_PARAMS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reservedCount = turnos.filter((turno) => turno.reserved).length;
  const visible = useMemo(() => {
    if (filter === "disponibles") return turnos.filter((turno) => !turno.reserved);
    if (filter === "reservados") return turnos.filter((turno) => turno.reserved);
    return turnos;
  }, [filter, turnos]);

  const grupos = useMemo(() => {
    const map = new Map<string, PublicTurno[]>();
    for (const turno of visible) {
      const list = map.get(turno.dayKey) ?? [];
      list.push(turno);
      map.set(turno.dayKey, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      {!hosted && (
        <p className="rounded-lg border border-amber-700/25 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Modo local: las reservas se guardan solo en este navegador. Para el sitio público configure Supabase (vea el README).
        </p>
      )}
      <section className="rounded-xl border-2 border-primary bg-[color:var(--paper)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Turnos de oración</p>
            <p className="mt-1 text-sm text-muted-foreground">{loading ? "Cargando turnos…" : `${reservedCount} de ${turnos.length} turnos reservados.`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton current={filter} value="todos" onClick={setFilter}>Todos</FilterButton>
            <FilterButton current={filter} value="disponibles" onClick={setFilter}>Disponibles</FilterButton>
            <FilterButton current={filter} value="reservados" onClick={setFilter}>Reservados</FilterButton>
            <Button type="button" size="sm" variant="outline" onClick={() => setManageOpen(true)}>Gestionar mi reserva</Button>
          </div>
        </div>
      </section>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => void load()}>Reintentar</Button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando la hoja de turnos…</p>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        grupos.map(([dayKey, dayTurnos]) => (
          <DaySection key={dayKey} title={dayHeading(dayTurnos[0]?.slotStart ?? dayKey)} turnos={dayTurnos} onSelect={setSelected} />
        ))
      )}
      <BookingDialog
        slot={selected && !selected.reserved ? selected : null}
        open={Boolean(selected && !selected.reserved)}
        params={params}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        onBooked={() => { void load(); }}
      />
      <GestionarReservaDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        params={params}
        turnos={turnos}
        onChanged={() => { void load(); }}
      />
    </div>
  );
}

function FilterButton({ current, value, onClick, children }: { current: Filter; value: Filter; onClick: (value: Filter) => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="sm" variant={current === value ? "default" : "outline"} onClick={() => onClick(value)}>
      {children}
    </Button>
  );
}

function DaySection({ title, turnos, onSelect }: { title: string; turnos: PublicTurno[]; onSelect: (turno: PublicTurno) => void }) {
  if (turnos.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-xl border-2 border-primary bg-[color:var(--paper)]">
      <div className="border-b border-primary/30 bg-primary px-4 py-2.5">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-primary-foreground uppercase">{title}</h2>
      </div>
      <ul className="divide-y divide-primary/15">
        {turnos.map((turno) => (
          <li key={turno.slotStart}>
            <article className="grid gap-2 px-4 py-3 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center">
              <p className="font-medium text-primary">
                {formatHora(turno.slotStart)}
                <span className="block text-xs font-normal text-muted-foreground">a {formatHora(turno.slotEnd)}</span>
              </p>
              <div className="min-w-0">
                {turno.reserved ? (
                  <>
                    <p className="truncate font-medium">{turno.espososResponsables}</p>
                    <p className="text-xs text-muted-foreground">Encuentro {turno.numeroEncuentro}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Turno disponible</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {turno.reserved ? <Badge variant="secondary">Reservado</Badge> : <Button type="button" size="sm" onClick={() => onSelect(turno)}>Inscribirse</Button>}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  if (filter === "disponibles") {
    return <p className="rounded-xl border-2 border-dashed border-primary/30 px-4 py-8 text-center text-sm text-muted-foreground">No hay turnos disponibles en este momento. Todos los horarios ya fueron reservados. Gracias por su oración.</p>;
  }
  if (filter === "reservados") {
    return <p className="rounded-xl border-2 border-dashed border-primary/30 px-4 py-8 text-center text-sm text-muted-foreground">Aún no hay reservas. Sea el primero en inscribirse.</p>;
  }
  return <p className="rounded-xl border-2 border-dashed border-primary/30 px-4 py-8 text-center text-sm text-muted-foreground">No hay turnos para mostrar.</p>;
}
