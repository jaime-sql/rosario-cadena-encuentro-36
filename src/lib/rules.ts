import type { EventParams } from "./params";
import { bookingFitsParams, generateSlotsFromParams } from "./slots";
import { canonicalIso } from "./slots-iso";
import type { ReservaPublica } from "./types";

/** Reagendar o cancelar se permite si ahora <= inicio_del_turno − corte. */
export function withinCutoff(slotStart: string, corteMinutos: number, now: Date = new Date()): boolean {
  const limite = Date.parse(canonicalIso(slotStart)) - corteMinutos * 60 * 1000;
  return now.getTime() <= limite;
}

export function canReschedule(slotStart: string, params: EventParams, now: Date = new Date()): boolean {
  return withinCutoff(slotStart, params.corteReagendarMinutos, now);
}

/** La cancelación usa el mismo corte que el reagendado, y además el flag permitirCancelar. */
export function canCancel(slotStart: string, params: EventParams, now: Date = new Date()): boolean {
  return params.permitirCancelar && withinCutoff(slotStart, params.corteReagendarMinutos, now);
}

export type ScheduleChangeImpact = {
  scheduleChanged: boolean;
  existingCount: number;
  mismatchedCount: number;
  newSlotCount: number;
  requiresWarning: boolean;
};

export function analyzeScheduleChange(
  current: EventParams,
  next: EventParams,
  reservas: Array<Pick<ReservaPublica, "slotStart" | "slotEnd">>,
): ScheduleChangeImpact {
  const scheduleChanged =
    canonicalIso(current.eventoInicio) !== canonicalIso(next.eventoInicio) ||
    canonicalIso(current.eventoFin) !== canonicalIso(next.eventoFin) ||
    current.intervaloMinutos !== next.intervaloMinutos;

  const existingCount = reservas.length;
  const mismatchedCount = reservas.filter((reserva) => !bookingFitsParams(reserva, next)).length;
  const newSlotCount = generateSlotsFromParams(next).length;

  return {
    scheduleChanged,
    existingCount,
    mismatchedCount,
    newSlotCount,
    requiresWarning: scheduleChanged && existingCount > 0,
  };
}

