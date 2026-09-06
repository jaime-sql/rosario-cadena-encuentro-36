import { DEFAULT_PARAMS, type EventParams } from "../params";
import { generateSlotsFromParams, localDateKey } from "../slots";
import { canonicalIso } from "../slots-iso";
import type { BookingInput, PublicTurno, ReservaCompleta, ReservaPublica } from "../types";
import {
  cancelLocal,
  changePinLocal,
  getParamsLocal,
  listByPhoneLocal,
  listOrganizerLocal,
  listPublicLocal,
  rescheduleLocal,
  reserveLocal,
  updateParamsLocal,
  updateTelefonoLocal,
} from "./local";
import { isSupabaseConfigured } from "../env";
import {
  cancelSupabase,
  changePinSupabase,
  getParamsSupabase,
  listByPhoneSupabase,
  listOrganizerSupabase,
  listPublicSupabase,
  rescheduleSupabase,
  reserveSupabase,
  updateParamsSupabase,
  updateTelefonoSupabase,
} from "./supabase";

export { isSupabaseConfigured } from "../env";

export function usesHostedDatabase(): boolean {
  return isSupabaseConfigured();
}

export async function getEventParams(): Promise<EventParams> {
  if (isSupabaseConfigured()) {
    return getParamsSupabase();
  }
  return getParamsLocal();
}

export async function updateEventParams(pin: string, next: EventParams): Promise<EventParams> {
  if (isSupabaseConfigured()) {
    return updateParamsSupabase(pin, next);
  }
  return updateParamsLocal(pin, next);
}

export async function changeOrganizerPin(pinActual: string, pinNuevo: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return changePinSupabase(pinActual, pinNuevo);
  }
  return changePinLocal(pinActual, pinNuevo);
}

export async function listPublicReservas(): Promise<ReservaPublica[]> {
  if (isSupabaseConfigured()) {
    return listPublicSupabase();
  }
  return listPublicLocal();
}

export async function createReserva(input: BookingInput, params?: EventParams): Promise<ReservaPublica> {
  if (isSupabaseConfigured()) {
    return reserveSupabase(input, undefined, params);
  }
  return reserveLocal(input);
}

export async function listReservasPorTelefono(telefonos: string): Promise<ReservaPublica[]> {
  if (isSupabaseConfigured()) {
    return listByPhoneSupabase(telefonos);
  }
  return listByPhoneLocal(telefonos);
}

export async function rescheduleReserva(
  telefonos: string,
  slotActual: string,
  nuevoInicio: string,
): Promise<ReservaPublica> {
  if (isSupabaseConfigured()) {
    return rescheduleSupabase(telefonos, slotActual, nuevoInicio);
  }
  return rescheduleLocal(telefonos, slotActual, nuevoInicio);
}

export async function cancelReserva(telefonos: string, slotStart: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return cancelSupabase(telefonos, slotStart);
  }
  return cancelLocal(telefonos, slotStart);
}

export async function listOrganizerReservas(pin: string): Promise<ReservaCompleta[]> {
  if (isSupabaseConfigured()) {
    return listOrganizerSupabase(pin);
  }
  return listOrganizerLocal(pin);
}

export async function updateTelefonoOrganizador(
  pin: string,
  slotStart: string,
  telefonos: string,
): Promise<string> {
  if (isSupabaseConfigured()) {
    return updateTelefonoSupabase(pin, slotStart, telefonos);
  }
  return updateTelefonoLocal(pin, slotStart, telefonos);
}

export function mergeAgenda(
  reservas: ReservaPublica[],
  params: EventParams = DEFAULT_PARAMS,
): PublicTurno[] {
  const slots = generateSlotsFromParams(params);
  const byStart = new Map(reservas.map((reserva) => [canonicalIso(reserva.slotStart), reserva]));
  const used = new Set<string>();
  const turnos: PublicTurno[] = slots.map((slot) => {
    const reserved = byStart.get(slot.slotStart);
    if (reserved) {
      used.add(slot.slotStart);
    }
    return {
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
      dayKey: slot.dayKey,
      reserved: Boolean(reserved),
      espososResponsables: reserved?.espososResponsables ?? null,
      numeroEncuentro: reserved?.numeroEncuentro ?? null,
    };
  });

  for (const reserva of reservas) {
    const start = canonicalIso(reserva.slotStart);
    if (used.has(start)) {
      continue;
    }
    turnos.push({
      slotStart: start,
      slotEnd: canonicalIso(reserva.slotEnd),
      dayKey: localDateKey(start),
      reserved: true,
      espososResponsables: reserva.espososResponsables,
      numeroEncuentro: reserva.numeroEncuentro,
    });
  }

  return turnos.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
}
