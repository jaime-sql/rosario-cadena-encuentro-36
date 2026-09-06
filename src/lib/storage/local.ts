import { localOrgPin } from "../env";
import { LOCAL_STORAGE_KEY } from "../event";
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

function persist(reservas: ReservaCompleta[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reservas));
}

function store(): MemoryReservasStore {
  return new MemoryReservasStore(localOrgPin(), readSeed());
}

export function listPublicLocal(): ReservaPublica[] {
  return store().listPublic();
}

export function listOrganizerLocal(pin: string): ReservaCompleta[] {
  return store().listOrganizer(pin);
}

export function reserveLocal(input: BookingInput): ReservaPublica {
  const memory = store();
  const created = memory.reserve(input);
  persist(memory.listOrganizer(localOrgPin()));
  return created;
}
