import { z } from "zod";
import { EVENT_END_ISO, EVENT_START_ISO, SLOT_MINUTES, TIME_ZONE } from "./event";
import { canonicalIso } from "./slots-iso";

export const DEFAULT_INTERVALO_MINUTOS = SLOT_MINUTES;
export const DEFAULT_MAX_RESERVAS_POR_TELEFONO = 1;
export const DEFAULT_CORTE_REAGENDAR_MINUTOS = 60;
export const DEFAULT_PERMITIR_CANCELAR = true;

export type EventParams = {
  eventoInicio: string;
  eventoFin: string;
  intervaloMinutos: number;
  maxReservasPorTelefono: number;
  corteReagendarMinutos: number;
  permitirCancelar: boolean;
};

export const DEFAULT_PARAMS: EventParams = {
  eventoInicio: EVENT_START_ISO,
  eventoFin: EVENT_END_ISO,
  intervaloMinutos: DEFAULT_INTERVALO_MINUTOS,
  maxReservasPorTelefono: DEFAULT_MAX_RESERVAS_POR_TELEFONO,
  corteReagendarMinutos: DEFAULT_CORTE_REAGENDAR_MINUTOS,
  permitirCancelar: DEFAULT_PERMITIR_CANCELAR,
};

const eventParamsShape = z.object({
  eventoInicio: z.string().min(1, "Indique el inicio del Rosario."),
  eventoFin: z.string().min(1, "Indique el fin del Rosario."),
  intervaloMinutos: z.coerce
    .number({ error: "Indique el intervalo en minutos." })
    .int("El intervalo debe ser un entero.")
    .min(1, "El intervalo debe ser de al menos 1 minuto.")
    .max(180, "El intervalo no puede superar 180 minutos."),
  maxReservasPorTelefono: z.coerce
    .number({ error: "Indique el máximo de reservas por teléfono." })
    .int("El máximo por teléfono debe ser un entero.")
    .min(1, "Debe permitirse al menos una reserva por teléfono.")
    .max(20, "El máximo por teléfono no puede superar 20."),
  corteReagendarMinutos: z.coerce
    .number({ error: "Indique los minutos de anticipación." })
    .int("El corte debe ser un entero.")
    .min(0, "El corte no puede ser negativo.")
    .max(10080, "El corte no puede superar una semana."),
  permitirCancelar: z.boolean(),
});

export const eventParamsSchema = eventParamsShape.superRefine((value, ctx) => {
  let startMs: number;
  let endMs: number;
  try {
    startMs = Date.parse(canonicalIso(value.eventoInicio));
    endMs = Date.parse(canonicalIso(value.eventoFin));
  } catch {
    ctx.addIssue({ code: "custom", path: ["eventoInicio"], message: "Las fechas del evento no son válidas." });
    return;
  }
  if (endMs <= startMs) {
    ctx.addIssue({
      code: "custom",
      path: ["eventoFin"],
      message: "El fin del Rosario debe ser posterior al inicio.",
    });
    return;
  }
  const durationMs = value.intervaloMinutos * 60 * 1000;
  if ((endMs - startMs) % durationMs !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["eventoFin"],
      message: "La ventana del Rosario debe ser múltiplo del intervalo de los turnos.",
    });
  }
});

export type EventParamsInput = z.input<typeof eventParamsShape>;

export function parseParams(input: EventParamsInput): EventParams {
  const parsed = eventParamsSchema.parse(input);
  return {
    ...parsed,
    eventoInicio: canonicalIso(parsed.eventoInicio),
    eventoFin: canonicalIso(parsed.eventoFin),
    intervaloMinutos: Number(parsed.intervaloMinutos),
    maxReservasPorTelefono: Number(parsed.maxReservasPorTelefono),
    corteReagendarMinutos: Number(parsed.corteReagendarMinutos),
  };
}

export function paramsFromRow(row: {
  evento_inicio: string;
  evento_fin: string;
  intervalo_minutos: number;
  max_reservas_por_telefono: number;
  corte_reagendar_minutos: number;
  permitir_cancelar: boolean;
}): EventParams {
  return parseParams({
    eventoInicio: row.evento_inicio,
    eventoFin: row.evento_fin,
    intervaloMinutos: row.intervalo_minutos,
    maxReservasPorTelefono: row.max_reservas_por_telefono,
    corteReagendarMinutos: row.corte_reagendar_minutos,
    permitirCancelar: row.permitir_cancelar,
  });
}

export function expectedSlotEnd(slotStart: string, intervaloMinutos: number): string {
  return new Date(Date.parse(canonicalIso(slotStart)) + intervaloMinutos * 60 * 1000).toISOString();
}

export function toDatetimeLocalValue(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Interpreta YYYY-MM-DDTHH:mm como hora de El Salvador (UTC−6, sin horario de verano). */
export function fromDatetimeLocalValue(local: string): string {
  const match = local.trim().match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2})?$/);
  if (!match) {
    throw new Error("La fecha y hora no son válidas.");
  }
  return canonicalIso(`${match[1]}:00-06:00`);
}

export function sameSchedule(a: EventParams, b: EventParams): boolean {
  return (
    canonicalIso(a.eventoInicio) === canonicalIso(b.eventoInicio) &&
    canonicalIso(a.eventoFin) === canonicalIso(b.eventoFin) &&
    a.intervaloMinutos === b.intervaloMinutos
  );
}

export const pinSchema = z
  .string()
  .trim()
  .min(4, "El PIN debe tener al menos 4 caracteres.")
  .max(40, "El PIN es demasiado largo.");
