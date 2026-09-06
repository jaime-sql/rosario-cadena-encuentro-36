import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "../env";
import { canonicalIso } from "../slots";
import {
  DoubleBookingError,
  InvalidPinError,
  toReservaPublica,
  type BookingInput,
  type ReservaCompleta,
  type ReservaPublica,
} from "../types";
import { parseBooking } from "../validation";

type PublicRow = {
  slot_start: string;
  slot_end: string;
  esposos_responsables: string;
  numero_encuentro: number;
};

type OrganizerRow = PublicRow & {
  telefonos: string;
  created_at: string;
};

export { isSupabaseConfigured };

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    throw new Error("Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function listPublicSupabase(
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaPublica[]> {
  const { data, error } = await client
    .from("bookings_public")
    .select("slot_start, slot_end, esposos_responsables, numero_encuentro")
    .order("slot_start", { ascending: true });

  if (error) {
    throw new Error(error.message || "No se pudieron cargar las reservas.");
  }

  return (data ?? []).map((row) => toPublic(row));
}

export async function reserveSupabase(
  input: BookingInput,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaPublica> {
  const booking = parseBooking(input);
  const { error } = await client.from("bookings").insert({
    slot_start: booking.slotStart,
    slot_end: booking.slotEnd,
    esposos_responsables: booking.espososResponsables,
    numero_encuentro: booking.numeroEncuentro,
    telefonos: booking.telefonos,
  });

  if (error) {
    if (error.code === "23505") {
      throw new DoubleBookingError();
    }
    throw new Error(error.message || "No se pudo guardar la reserva.");
  }

  return toReservaPublica(booking);
}

export async function listOrganizerSupabase(
  pin: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaCompleta[]> {
  const { data, error } = await client.rpc("organizer_bookings", { pin });
  if (error) {
    const message = error.message ?? "";
    if (message.toLowerCase().includes("pin")) {
      throw new InvalidPinError();
    }
    throw new Error(message || "No se pudo abrir la vista de coordinación.");
  }

  return ((data ?? []) as OrganizerRow[]).map((row) => ({
    slotStart: canonicalIso(row.slot_start),
    slotEnd: canonicalIso(row.slot_end),
    espososResponsables: row.esposos_responsables,
    numeroEncuentro: row.numero_encuentro,
    telefonos: row.telefonos,
    createdAt: row.created_at,
  }));
}

function toPublic(row: PublicRow): ReservaPublica {
  return {
    slotStart: canonicalIso(row.slot_start),
    slotEnd: canonicalIso(row.slot_end),
    espososResponsables: row.esposos_responsables,
    numeroEncuentro: row.numero_encuentro,
  };
}
