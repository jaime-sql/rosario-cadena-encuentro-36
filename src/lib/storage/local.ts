import { localOrgPin } from "../env";
import { LOCAL_PARAMS_KEY, LOCAL_PIN_KEY, LOCAL_STORAGE_KEY } from "../event";
import { DEFAULT_PARAMS, parseParams, type EventParams } from "../params";
import { MemoryReservasStore } from "./memory";
import type { BookingInput, ReservaCompleta, ReservaPublica } from "../types";

function readSeed(): ReservaCompleta[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ReservaCompleta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalParams(): EventParams {
  if (typeof window === "undefined") {
    return DEFAULT_PARAMS;
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_PARAMS_KEY);
    if (!raw) {
      return DEFAULT_PARAMS;
    }
    return parseParams(JSON.parse(raw) as EventParams);
  } catch {
    return DEFAULT_PARAMS;
  }
}

function persist(store: MemoryReservasStore, pin: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store.listOrganizer(pin)));
  window.localStorage.setItem(LOCAL_PARAMS_KEY, JSON.stringify(store.getParams()));
  window.localStorage.setItem(LOCAL_PIN_KEY, pin);
}

function store(): { memory: MemoryReservasStore; pin: string } {
  const pin = localOrgPin();
  return { memory: new MemoryReservasStore(pin, readSeed(), readLocalParams()), pin };
}

export function getParamsLocal(): EventParams {
  return store().memory.getParams();
}

export function updateParamsLocal(pin: string, next: EventParams): EventParams {
  const memory = new MemoryReservasStore(localOrgPin(), readSeed(), readLocalParams());
  const saved = memory.updateParams(pin, next);
  persist(memory, pin);
  return saved;
}

export function changePinLocal(pinActual: string, pinNuevo: string): void {
  const memory = new MemoryReservasStore(localOrgPin(), readSeed(), readLocalParams());
  memory.changePin(pinActual, pinNuevo);
  persist(memory, pinNuevo.trim());
}

export function listPublicLocal(): ReservaPublica[] {
  return store().memory.listPublic();
}

export function listOrganizerLocal(pin: string): ReservaCompleta[] {
  return store().memory.listOrganizer(pin);
}

export function listByPhoneLocal(telefonos: string): ReservaPublica[] {
  return store().memory.listByPhone(telefonos);
}

export function reserveLocal(input: BookingInput): ReservaPublica {
  const { memory, pin } = store();
  const created = memory.reserve(input);
  persist(memory, pin);
  return created;
}

export function rescheduleLocal(
  telefonos: string,
  slotActual: string,
  nuevoInicio: string,
  now?: Date,
): ReservaPublica {
  const { memory, pin } = store();
  const moved = memory.reschedule(telefonos, slotActual, nuevoInicio, now);
  persist(memory, pin);
  return moved;
}

export function cancelLocal(telefonos: string, slotStart: string, now?: Date): void {
  const { memory, pin } = store();
  memory.cancel(telefonos, slotStart, now);
  persist(memory, pin);
}
