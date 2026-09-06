"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_PARAMS, type EventParams } from "@/lib/params";
import { createReserva } from "@/lib/storage";
import { formatHora } from "@/lib/slots";
import { DoubleBookingError, MaxReservasError, shouldRefreshPublicAgenda, type PublicTurno } from "@/lib/types";
import { fieldErrors } from "@/lib/validation";

type Props = {
  slot: PublicTurno | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
  params?: EventParams;
};

export function BookingDialog({ slot, open, onOpenChange, onBooked, params = DEFAULT_PARAMS }: Props) {
  const [espososResponsables, setEspososResponsables] = useState("");
  const [numeroEncuentro, setNumeroEncuentro] = useState("");
  const [telefonos, setTelefonos] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setEspososResponsables("");
    setNumeroEncuentro("");
    setTelefonos("");
    setErrors({});
    setFormError(null);
    setSuccess(null);
    setPending(false);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!slot) return;
    setPending(true);
    setErrors({});
    setFormError(null);
    setSuccess(null);
    try {
      await createReserva({
        slotStart: slot.slotStart,
        slotEnd: slot.slotEnd,
        espososResponsables,
        numeroEncuentro,
        telefonos,
      }, params);
      setSuccess("Gracias. Su turno del Rosario quedó reservado.");
      onBooked();
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors(fieldErrors(error));
      } else if (error instanceof DoubleBookingError || error instanceof MaxReservasError) {
        setFormError(error.message);
        if (shouldRefreshPublicAgenda(error)) {
          onBooked();
        }
      } else {
        setFormError(error instanceof Error ? error.message : "No se pudo guardar la reserva. Intente de nuevo.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="max-w-md border-primary/20 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle className="font-heading text-primary uppercase">Reservar turno</DialogTitle>
          <DialogDescription>
            {slot ? `${formatHora(slot.slotStart)} — ${formatHora(slot.slotEnd)}` : "Seleccione un horario disponible."}
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="rounded-lg border border-emerald-700/20 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">{success}</div>
        ) : (
          <form id="reserva-form" onSubmit={onSubmit} className="grid gap-3">
            {formError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}
            <Field id="esposos" label="Esposos responsables" value={espososResponsables} onChange={setEspososResponsables} error={errors.espososResponsables} placeholder="Nombres y apellidos" autoComplete="name" />
            <Field id="encuentro" label="No. encuentro" value={numeroEncuentro} onChange={setNumeroEncuentro} error={errors.numeroEncuentro} placeholder="Número de encuentro" inputMode="numeric" />
            <Field id="telefonos" label="Teléfono (solo dígitos)" value={telefonos} onChange={setTelefonos} error={errors.telefonos} placeholder="Solo dígitos" inputMode="numeric" autoComplete="tel" hint="Solo dígitos, sin espacios ni guiones. No se muestra en la lista pública." />
          </form>
        )}
        <DialogFooter>
          {success ? (
            <Button type="button" onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" form="reserva-form" disabled={pending || !slot}>{pending ? "Guardando…" : "Confirmar reserva"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id, label, value, onChange, error, hint, ...inputProps
}: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className="h-10" {...inputProps} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
