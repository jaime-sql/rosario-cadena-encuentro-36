import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "../env";
import { DEFAULT_PARAMS, paramsFromRow, parseParams, type EventParams } from "../params";
import { canonicalIso } from "../slots";
import {
  toReservaPublica,
  type BookingInput,
  type ReservaCompleta,
  type ReservaPublica,
} from "../types";
import { parseBooking, parseTelefonoConsulta, parseTelefonoOrganizador } from "../validation";
import { mapStorageError } from "./errors";

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

type ParamsRow = {
  evento_inicio: string;
  evento_fin: string;
  intervalo_minutos: number;
  max_reservas_por_telefono: number;
  corte_reagendar_minutos: number;
  permitir_cancelar: boolean;
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

export async function getParamsSupabase(
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<EventParams> {
  const { data, error } = await client
    .from("parametros")
    .select(
      "evento_inicio, evento_fin, intervalo_minutos, max_reservas_por_telefono, corte_reagendar_minutos, permitir_cancelar",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No se pudieron cargar los parámetros.");
  }
  if (!data) {
    return DEFAULT_PARAMS;
  }
  return paramsFromRow(data as ParamsRow);
}

export async function updateParamsSupabase(
  pin: string,
  next: EventParams,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<EventParams> {
  const parsed = parseParams(next);
  const { error } = await client.rpc("actualizar_parametros", {
    pin,
    p_evento_inicio: parsed.eventoInicio,
    p_evento_fin: parsed.eventoFin,
    p_intervalo_minutos: parsed.intervaloMinutos,
    p_max_reservas_por_telefono: parsed.maxReservasPorTelefono,
    p_corte_reagendar_minutos: parsed.corteReagendarMinutos,
    p_permitir_cancelar: parsed.permitirCancelar,
  });
  if (error) {
    throw mapStorageError(error, "No se pudieron guardar los parámetros.");
  }
  return parsed;
}

export async function changePinSupabase(
  pinActual: string,
  pinNuevo: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<void> {
  const { error } = await client.rpc("cambiar_pin", {
    pin_actual: pinActual,
    pin_nuevo: pinNuevo,
  });
  if (error) {
    throw mapStorageError(error, "No se pudo cambiar el PIN.");
  }
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
  params?: EventParams,
): Promise<ReservaPublica> {
  const resolved = params ?? (await getParamsSupabase(client));
  const booking = parseBooking(input, resolved);
  const { error } = await client.from("bookings").insert({
    slot_start: booking.slotStart,
    slot_end: booking.slotEnd,
    esposos_responsables: booking.espososResponsables,
    numero_encuentro: booking.numeroEncuentro,
    telefonos: booking.telefonos,
  });

  if (error) {
    throw mapStorageError(error, "No se pudo guardar la reserva.");
  }

  return toReservaPublica(booking);
}

export async function listByPhoneSupabase(
  telefonos: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaPublica[]> {
  const tel = parseTelefonoConsulta(telefonos);
  const { data, error } = await client.rpc("reservas_por_telefono", { p_telefonos: tel });
  if (error) {
    throw mapStorageError(error, "No se pudieron buscar las reservas.");
  }
  return ((data ?? []) as PublicRow[]).map((row) => toPublic(row));
}

export async function rescheduleSupabase(
  telefonos: string,
  slotActual: string,
  nuevoInicio: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaPublica> {
  const tel = parseTelefonoConsulta(telefonos);
  const { error } = await client.rpc("reagendar_reserva", {
    p_telefonos: tel,
    p_slot_actual: canonicalIso(slotActual),
    p_nuevo_inicio: canonicalIso(nuevoInicio),
  });
  if (error) {
    throw mapStorageError(error, "No se pudo reagendar el turno.");
  }
  const params = await getParamsSupabase(client);
  const start = canonicalIso(nuevoInicio);
  return {
    slotStart: start,
    slotEnd: new Date(Date.parse(start) + params.intervaloMinutos * 60 * 1000).toISOString(),
    espososResponsables: "",
    numeroEncuentro: 0,
  };
}

export async function cancelSupabase(
  telefonos: string,
  slotStart: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<void> {
  const tel = parseTelefonoConsulta(telefonos);
  const { error } = await client.rpc("cancelar_reserva", {
    p_telefonos: tel,
    p_slot_inicio: canonicalIso(slotStart),
  });
  if (error) {
    throw mapStorageError(error, "No se pudo cancelar la reserva.");
  }
}

export async function updateTelefonoSupabase(
  pin: string,
  slotStart: string,
  telefonos: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<string> {
  const tel = parseTelefonoOrganizador(telefonos);
  const { data, error } = await client.rpc("actualizar_telefono_organizador", {
    pin,
    p_slot_inicio: canonicalIso(slotStart),
    p_telefonos: tel,
  });
  if (error) {
    throw mapStorageError(error, "No se pudo actualizar el teléfono.");
  }
  if (typeof data === "string" && data.trim() !== "") {
    return data;
  }
  return tel;
}

export async function listOrganizerSupabase(
  pin: string,
  client: SupabaseClient = createSupabaseBrowserClient(),
): Promise<ReservaCompleta[]> {
  const { data, error } = await client.rpc("organizer_bookings", { pin });
  if (error) {
    throw mapStorageError(error, "No se pudo abrir la vista de coordinación.");
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
