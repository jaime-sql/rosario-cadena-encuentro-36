import { TIME_ZONE } from "./event";
import { DEFAULT_PARAMS, type EventParams, expectedSlotEnd } from "./params";
import { canonicalIso } from "./slots-iso";

export { canonicalIso } from "./slots-iso";

export type Slot = {
  /** Inicio del turno, ISO-8601 UTC canónico. */
  slotStart: string;
  /** Fin del turno, ISO-8601 UTC canónico. */
  slotEnd: string;
  /** Fecha local YYYY-MM-DD en America/El_Salvador. */
  dayKey: string;
};

export function generateSlots(
  startIso: string = DEFAULT_PARAMS.eventoInicio,
  endIso: string = DEFAULT_PARAMS.eventoFin,
  slotMinutes: number = DEFAULT_PARAMS.intervaloMinutos,
): Slot[] {
  if (slotMinutes <= 0 || slotMinutes % 1 !== 0) {
    throw new Error("La duración del turno debe ser un entero positivo.");
  }

  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("Las fechas de inicio o fin del evento no son válidas.");
  }
  if (end <= start) {
    throw new Error("El fin del evento debe ser posterior al inicio.");
  }

  const duration = slotMinutes * 60 * 1000;
  if ((end - start) % duration !== 0) {
    throw new Error("La ventana del evento no es múltiplo de la duración del turno.");
  }

  const slots: Slot[] = [];
  for (let t = start; t < end; t += duration) {
    const slotStart = new Date(t).toISOString();
    const slotEnd = new Date(t + duration).toISOString();
    slots.push({
      slotStart,
      slotEnd,
      dayKey: localDateKey(slotStart),
    });
  }
  return slots;
}

export function generateSlotsFromParams(params: EventParams = DEFAULT_PARAMS): Slot[] {
  return generateSlots(params.eventoInicio, params.eventoFin, params.intervaloMinutos);
}

export function isValidSlotStart(iso: string, params: EventParams = DEFAULT_PARAMS): boolean {
  const wanted = canonicalIso(iso);
  return generateSlotsFromParams(params).some((slot) => slot.slotStart === wanted);
}

export function localDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function formatHora(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hourRaw = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const dayPeriod = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toLowerCase();

  const hour = String(hourRaw).padStart(2, "0");

  if (hourRaw === 12 && minute === "00" && dayPeriod.startsWith("am")) {
    return "12:00 m.n.";
  }
  if (hourRaw === 12 && minute === "00" && dayPeriod.startsWith("pm")) {
    return "12:00 m.";
  }

  const suffix = dayPeriod.startsWith("pm") ? "p.m." : "a.m.";
  return `${hour}:${minute} ${suffix}`;
}

export function formatDiaLargo(iso: string): string {
  const formatted = new Intl.DateTimeFormat("es-SV", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function dayHeading(iso: string): string {
  return `Día: ${formatDiaLargo(iso)}`;
}

export function slotsAreContiguous(slots: Slot[]): boolean {
  if (slots.length === 0) {
    return true;
  }
  const duration = Date.parse(slots[0].slotEnd) - Date.parse(slots[0].slotStart);
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i - 1].slotEnd !== slots[i].slotStart) {
      return false;
    }
    if (Date.parse(slots[i].slotEnd) - Date.parse(slots[i].slotStart) !== duration) {
      return false;
    }
  }
  return true;
}

export function bookingFitsParams(
  reserva: { slotStart: string; slotEnd: string },
  params: EventParams,
): boolean {
  try {
    const start = canonicalIso(reserva.slotStart);
    return isValidSlotStart(start, params) && canonicalIso(reserva.slotEnd) === expectedSlotEnd(start, params.intervaloMinutos);
  } catch {
    return false;
  }
}

export function formatRangoEvento(params: EventParams): string {
  const inicio = `${formatDiaLargo(params.eventoInicio)} a las ${formatHora(params.eventoInicio)}`;
  const fin = `${formatDiaLargo(params.eventoFin)} a las ${formatHora(params.eventoFin)}`;
  return `${inicio} hasta ${fin} (hora de El Salvador). Turnos de ${params.intervaloMinutos} minutos.`;
}
