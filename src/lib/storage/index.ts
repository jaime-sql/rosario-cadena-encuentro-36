import { generateSlots } from "../slots";
import type { BookingInput, PublicTurno, ReservaCompleta, ReservaPublica } from "../types";
import { listOrganizerLocal, listPublicLocal, reserveLocal } from "./local";
import { isSupabaseConfigured } from "../env";
import {
  listOrganizerSupabase,
  listPublicSupabase,
  reserveSupabase,
} from "./supabase";

export { isSupabaseConfigured } from "../env";

export function usesHostedDatabase(): boolean {
  return isSupabaseConfigured();
}

export async function listPublicReservas(): Promise<ReservaPublica[]> {
  if (isSupabaseConfigured()) {
    return listPublicSupabase();
  }
  return listPublicLocal();
}

export async function createReserva(input: BookingInput): Promise<ReservaPublica> {
  if (isSupabaseConfigured()) {
    return reserveSupabase(input);
  }
  return reserveLocal(input);
}

export async function listOrganizerReservas(pin: string): Promise<ReservaCompleta[]> {
  if (isSupabaseConfigured()) {
    return listOrganizerSupabase(pin);
  }
  return listOrganizerLocal(pin);
}

export function mergeAgenda(reservas: ReservaPublica[]): PublicTurno[] {
  const byStart = new Map(reservas.map((reserva) => [reserva.slotStart, reserva]));
  return generateSlots().map((slot) => {
    const reserved = byStart.get(slot.slotStart);
    return {
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
      dayKey: slot.dayKey,
      reserved: Boolean(reserved),
      espososResponsables: reserved?.espososResponsables ?? null,
      numeroEncuentro: reserved?.numeroEncuentro ?? null,
    };
  });
}
