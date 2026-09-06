import {
  EVENT_END_ISO,
  EVENT_START_ISO,
  SLOT_MINUTES,
  TIME_ZONE,
} from "./event";

export type DayKey = "sabado" | "domingo";

export type Slot = {
  /** Inicio del turno, ISO-8601 UTC canónico. */
  slotStart: string;
  /** Fin del turno, ISO-8601 UTC canónico. */
  slotEnd: string;
  dayKey: DayKey;
};

const SLOT_MS = SLOT_MINUTES * 60 * 1000;

export function canonicalIso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${String(value)}`);
  }
  return date.toISOString();
}

export function generateSlots(
  startIso: string = EVENT_START_ISO,
  endIso: string = EVENT_END_ISO,
  slotMinutes: number = SLOT_MINUTES,
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
      dayKey: dayKeyFor(slotStart),
    });
  }
  return slots;
}

export function isValidSlotStart(iso: string): boolean {
  const wanted = canonicalIso(iso);
  return generateSlots().some((slot) => slot.slotStart === wanted);
}

export function dayKeyFor(iso: string): DayKey {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(new Date(iso));
  return day.toLowerCase().startsWith("sat") ? "sabado" : "domingo";
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

export function dayHeading(dayKey: DayKey): string {
  return dayKey === "sabado"
    ? "Día: sábado 12 de septiembre 2026"
    : "Día: domingo 13 de septiembre 2026";
}

export function slotsAreContiguous(slots: Slot[]): boolean {
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i - 1].slotEnd !== slots[i].slotStart) {
      return false;
    }
    if (Date.parse(slots[i].slotEnd) - Date.parse(slots[i].slotStart) !== SLOT_MS) {
      return false;
    }
  }
  return true;
}
