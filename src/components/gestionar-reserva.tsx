"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventParams } from "@/lib/params";
import { canCancel, canReschedule } from "@/lib/rules";
import { formatDiaLargo, formatHora } from "@/lib/slots";
import { cancelReserva, listReservasPorTelefono, rescheduleReserva } from "@/lib/storage";
import {
  assertNoTelefonos,
  CancelDisabledError,
  CutoffError,
  DoubleBookingError,
  OwnershipError,
  type PublicTurno,
  type ReservaPublica,
} from "@/lib/types";
import { parseTelefonoConsulta } from "@/lib/validation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: EventParams;
  turnos: PublicTurno[];
  onChanged: () => void;
};

export function GestionarReservaDialog({ open, onOpenChange, params, turnos, onChanged }: Props) {
  const [telefonos, setTelefonos] = useState("");
  const [reservas, setReservas] = useState<ReservaPublica[] | null>(null);
  const [selected, setSelected] = useState<ReservaPublica | null>(null);
  const [mode, setMode] = useState<"lookup" | "list" | "move">("lookup");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const libres = useMemo(
    () => turnos.filter((turno) => !turno.reserved),
    [turnos],
  );

  function reset() {
    setTelefonos("");
    setReservas(null);
    setSelected(null);
    setMode("lookup");
    setError(null);
    setSuccess(null);
    setPending(false);
  }

  async function onLookup(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const tel = parseTelefonoConsulta(telefonos);
      const rows = await listReservasPorTelefono(tel);
      assertNoTelefonos(rows);
      setReservas(rows);
      setMode("list");
      if (rows.length === 0) {
        setError("No hay reservas con ese teléfono.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron buscar las reservas.");
    } finally {
      setPending(false);
    }
  }

  async function onCancel(reserva: ReservaPublica) {
    setPending(true);
    setError(null);
    try {
      await cancelReserva(telefonos, reserva.slotStart);
      setSuccess("La reserva se canceló. El turno quedó libre.");
      setReservas((current) => (current ?? []).filter((row) => row.slotStart !== reserva.slotStart));
      onChanged();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setPending(false);
    }
  }

  async function onMove(turno: PublicTurno) {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      await rescheduleReserva(telefonos, selected.slotStart, turno.slotStart);
      setSuccess(`Turno movido a ${formatHora(turno.slotStart)}.`);
      setMode("list");
      setSelected(null);
      const rows = await listReservasPorTelefono(parseTelefonoConsulta(telefonos));
      assertNoTelefonos(rows);
      setReservas(rows);
      onChanged();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md border-primary/20 sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-heading text-primary uppercase">Gestionar mi reserva</DialogTitle>
          <DialogDescription>
            Identifíquese con el teléfono de la inscripción. La lista pública no muestra teléfonos.
          </DialogDescription>
        </DialogHeader>

        {success ? <p className="rounded-lg border border-emerald-700/20 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{success}</p> : null}
        {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        {mode === "lookup" ? (
          <form id="lookup-reserva" onSubmit={onLookup} className="grid gap-2">
            <Label htmlFor="tel-gestion">Teléfono (solo dígitos)</Label>
            <Input
              id="tel-gestion"
              value={telefonos}
              onChange={(event) => setTelefonos(event.target.value)}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="Solo dígitos"
              className="h-10"
            />
          </form>
        ) : null}

        {mode === "list" && reservas ? (
          <ul className="grid max-h-72 gap-2 overflow-y-auto">
            {reservas.map((reserva) => {
              const reagendarOk = canReschedule(reserva.slotStart, params);
              const cancelarOk = canCancel(reserva.slotStart, params);
              return (
                <li key={reserva.slotStart} className="rounded-lg border border-primary/20 px-3 py-2">
                  <p className="font-medium text-primary">
                    {formatHora(reserva.slotStart)} — {formatHora(reserva.slotEnd)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDiaLargo(reserva.slotStart)}</p>
                  <p className="mt-1 text-sm">{reserva.espososResponsables} · Encuentro {reserva.numeroEncuentro}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!reagendarOk || pending}
                      onClick={() => {
                        setSelected(reserva);
                        setMode("move");
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      Reagendar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!cancelarOk || pending}
                      onClick={() => void onCancel(reserva)}
                    >
                      Cancelar reserva
                    </Button>
                  </div>
                  {!reagendarOk ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ya no se puede reagendar: el corte es {params.corteReagendarMinutos} minutos antes del inicio.
                    </p>
                  ) : null}
                  {!params.permitirCancelar ? (
                    <p className="mt-1 text-xs text-muted-foreground">Las cancelaciones están desactivadas.</p>
                  ) : !cancelarOk ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ya no se puede cancelar: el corte es {params.corteReagendarMinutos} minutos antes del inicio.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {mode === "move" && selected ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Mover {formatHora(selected.slotStart)} a un turno libre. El horario anterior queda disponible.
            </p>
            <ul className="grid max-h-64 gap-1 overflow-y-auto">
              {libres.map((turno) => (
                <li key={turno.slotStart}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    disabled={pending}
                    onClick={() => void onMove(turno)}
                  >
                    {formatDiaLargo(turno.slotStart)} · {formatHora(turno.slotStart)} — {formatHora(turno.slotEnd)}
                  </Button>
                </li>
              ))}
            </ul>
            {libres.length === 0 ? <p className="text-sm text-muted-foreground">No hay turnos libres.</p> : null}
          </div>
        ) : null}

        <DialogFooter>
          {mode === "lookup" ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
              <Button type="submit" form="lookup-reserva" disabled={pending || telefonos.trim() === ""}>
                {pending ? "Buscando…" : "Buscar"}
              </Button>
            </>
          ) : mode === "move" ? (
            <Button type="button" variant="outline" onClick={() => { setMode("list"); setSelected(null); }}>
              Volver
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function messageFor(cause: unknown): string {
  if (cause instanceof DoubleBookingError) return cause.message;
  if (cause instanceof CutoffError) return cause.message;
  if (cause instanceof CancelDisabledError) return cause.message;
  if (cause instanceof OwnershipError) return cause.message;
  return cause instanceof Error ? cause.message : "No se pudo completar la acción.";
}
