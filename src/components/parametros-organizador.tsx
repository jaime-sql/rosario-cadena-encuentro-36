"use client";

import { useMemo, useState } from "react";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fromDatetimeLocalValue,
  parseParams,
  pinSchema,
  sameSchedule,
  toDatetimeLocalValue,
  type EventParams,
} from "@/lib/params";
import { analyzeScheduleChange } from "@/lib/rules";
import { generateSlotsFromParams } from "@/lib/slots";
import { changeOrganizerPin, updateEventParams } from "@/lib/storage";
import type { ReservaCompleta } from "@/lib/types";
import { fieldErrors } from "@/lib/validation";

type Props = {
  pin: string;
  params: EventParams;
  reservas: ReservaCompleta[];
  onSaved: (params: EventParams) => void;
  onPinChanged: (pin: string) => void;
};

export function ParametrosOrganizador({ pin, params, reservas, onSaved, onPinChanged }: Props) {
  const [eventoInicio, setEventoInicio] = useState(toDatetimeLocalValue(params.eventoInicio));
  const [eventoFin, setEventoFin] = useState(toDatetimeLocalValue(params.eventoFin));
  const [intervaloMinutos, setIntervaloMinutos] = useState(String(params.intervaloMinutos));
  const [maxReservasPorTelefono, setMaxReservasPorTelefono] = useState(String(params.maxReservasPorTelefono));
  const [corteReagendarMinutos, setCorteReagendarMinutos] = useState(String(params.corteReagendarMinutos));
  const [permitirCancelar, setPermitirCancelar] = useState(params.permitirCancelar);
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [pinNuevo, setPinNuevo] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinPending, setPinPending] = useState(false);

  const draft = useMemo(() => {
    try {
      return parseParams({
        eventoInicio: fromDatetimeLocalValue(eventoInicio),
        eventoFin: fromDatetimeLocalValue(eventoFin),
        intervaloMinutos,
        maxReservasPorTelefono,
        corteReagendarMinutos,
        permitirCancelar,
      });
    } catch {
      return null;
    }
  }, [corteReagendarMinutos, eventoFin, eventoInicio, intervaloMinutos, maxReservasPorTelefono, permitirCancelar]);

  const impact = draft ? analyzeScheduleChange(params, draft, reservas) : null;
  const slotPreview = useMemo(() => {
    if (!draft) return null;
    try {
      return generateSlotsFromParams(draft).length;
    } catch (error) {
      return error instanceof Error ? error.message : "Ventana no válida.";
    }
  }, [draft]);

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);
    setSuccess(null);
    try {
      const next = parseParams({
        eventoInicio: fromDatetimeLocalValue(eventoInicio),
        eventoFin: fromDatetimeLocalValue(eventoFin),
        intervaloMinutos,
        maxReservasPorTelefono,
        corteReagendarMinutos,
        permitirCancelar,
      });
      const change = analyzeScheduleChange(params, next, reservas);
      if (change.requiresWarning && !confirmSchedule) {
        setFormError("Hay reservas. Confirme que entiende que los turnos libres se regeneran y las reservas no se borran.");
        setPending(false);
        return;
      }
      const saved = await updateEventParams(pin, next);
      setConfirmSchedule(false);
      setSuccess("Parámetros guardados.");
      onSaved(saved);
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors(fieldErrors(error));
      } else {
        setFormError(error instanceof Error ? error.message : "No se pudieron guardar los parámetros.");
      }
    } finally {
      setPending(false);
    }
  }

  async function onChangePin(event: React.FormEvent) {
    event.preventDefault();
    setPinPending(true);
    setPinError(null);
    setPinSuccess(null);
    try {
      const next = pinSchema.parse(pinNuevo);
      if (next !== pinConfirm.trim()) {
        setPinError("El nuevo PIN y la confirmación no coinciden.");
        return;
      }
      await changeOrganizerPin(pin, next);
      setPinNuevo("");
      setPinConfirm("");
      setPinSuccess("PIN actualizado. Úselo la próxima vez que entre.");
      onPinChanged(next);
    } catch (error) {
      if (error instanceof ZodError) {
        setPinError(error.issues[0]?.message ?? "El PIN no es válido.");
      } else {
        setPinError(error instanceof Error ? error.message : "No se pudo cambiar el PIN.");
      }
    } finally {
      setPinPending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={onSave} className="rounded-xl border-2 border-primary bg-[color:var(--paper)] p-4">
        <h2 className="font-heading text-lg font-semibold text-primary uppercase">Parámetros del Rosario</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Horas en America/El_Salvador. El listado público lee esta ventana y el intervalo para armar los turnos.
        </p>
        <div className="mt-4 grid gap-3">
          <Field
            id="evento-inicio"
            label="Inicio"
            type="datetime-local"
            value={eventoInicio}
            onChange={setEventoInicio}
            error={errors.eventoInicio}
          />
          <Field
            id="evento-fin"
            label="Fin"
            type="datetime-local"
            value={eventoFin}
            onChange={setEventoFin}
            error={errors.eventoFin}
          />
          <Field
            id="intervalo"
            label="Intervalo de cada turno (minutos)"
            inputMode="numeric"
            value={intervaloMinutos}
            onChange={setIntervaloMinutos}
            error={errors.intervaloMinutos}
            hint="Ejemplo: 30"
          />
          <Field
            id="max-tel"
            label="Máximo de reservas por teléfono"
            inputMode="numeric"
            value={maxReservasPorTelefono}
            onChange={setMaxReservasPorTelefono}
            error={errors.maxReservasPorTelefono}
            hint="Ejemplo: 1 (una reserva activa por teléfono)"
          />
          <Field
            id="corte"
            label="Corte para reagendar o cancelar (minutos antes del inicio)"
            inputMode="numeric"
            value={corteReagendarMinutos}
            onChange={setCorteReagendarMinutos}
            error={errors.corteReagendarMinutos}
            hint="Ejemplo: 60. Cancelar usa el mismo corte."
          />
          <div className="grid gap-1.5">
            <Label htmlFor="permitir-cancelar">Permitir cancelar</Label>
            <select
              id="permitir-cancelar"
              className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={permitirCancelar ? "si" : "no"}
              onChange={(event) => setPermitirCancelar(event.target.value === "si")}
            >
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {typeof slotPreview === "number"
            ? `Con estos valores se generan ${slotPreview} turnos libres.`
            : slotPreview ?? "Revise el horario y el intervalo."}
        </p>
        {impact?.requiresWarning ? (
          <div className="mt-3 rounded-lg border border-amber-700/30 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p>
              Hay {impact.existingCount} reserva{impact.existingCount === 1 ? "" : "s"}. Cambiar el inicio, el fin o el
              intervalo regenera la lista de turnos libres. <strong>Las reservas no se borran.</strong>
            </p>
            {impact.mismatchedCount > 0 ? (
              <p className="mt-2">
                {impact.mismatchedCount} reserva{impact.mismatchedCount === 1 ? "" : "s"} quedarían fuera de los nuevos
                turnos (siguen en la base).
              </p>
            ) : null}
            <label className="mt-3 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmSchedule}
                onChange={(event) => setConfirmSchedule(event.target.checked)}
              />
              <span>Entiendo: no se borrarán las reservas existentes.</span>
            </label>
          </div>
        ) : draft && !sameSchedule(params, draft) ? (
          <p className="mt-3 text-sm text-muted-foreground">No hay reservas. Los turnos libres se regenerarán al guardar.</p>
        ) : null}
        {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-800">{success}</p> : null}
        <Button type="submit" className="mt-4" disabled={pending}>
          {pending ? "Guardando…" : "Guardar parámetros"}
        </Button>
      </form>

      <form onSubmit={onChangePin} className="rounded-xl border-2 border-primary bg-[color:var(--paper)] p-4">
        <h2 className="font-heading text-lg font-semibold text-primary uppercase">Cambiar PIN</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No hace falta SQL. El PIN nuevo se guarda en Supabase (o en este navegador, en modo local).
        </p>
        <div className="mt-4 grid gap-3">
          <Field
            id="pin-nuevo"
            label="Nuevo PIN"
            type="password"
            value={pinNuevo}
            onChange={setPinNuevo}
            autoComplete="new-password"
          />
          <Field
            id="pin-confirm"
            label="Confirmar PIN"
            type="password"
            value={pinConfirm}
            onChange={setPinConfirm}
            autoComplete="new-password"
          />
        </div>
        {pinError ? <p className="mt-3 text-sm text-destructive">{pinError}</p> : null}
        {pinSuccess ? <p className="mt-3 text-sm text-emerald-800">{pinSuccess}</p> : null}
        <Button type="submit" className="mt-4" disabled={pinPending || pinNuevo.trim() === ""}>
          {pinPending ? "Guardando…" : "Cambiar PIN"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="h-10"
        {...inputProps}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
