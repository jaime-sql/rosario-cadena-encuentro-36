import { DEFAULT_PARAMS, expectedSlotEnd, parseParams, pinSchema, type EventParams } from "../params";
import { normalizeTelefono } from "../phone";
import { canCancel, canReschedule } from "../rules";
import { isValidSlotStart } from "../slots";
import { canonicalIso } from "../slots-iso";
import {
  CancelDisabledError,
  CutoffError,
  DoubleBookingError,
  InvalidPinError,
  MaxReservasError,
  OwnershipError,
  ReservaNoEncontradaError,
  toReservaPublica,
  type BookingInput,
  type ReservaCompleta,
  type ReservaPublica,
} from "../types";
import { parseBooking, parseTelefonoConsulta, parseTelefonoOrganizador } from "../validation";
import { LOCAL_ORG_PIN } from "../event";

export class MemoryReservasStore {
  private readonly byStart = new Map<string, ReservaCompleta>();
  private pin: string;
  private params: EventParams;

  constructor(
    pin: string = LOCAL_ORG_PIN,
    seed: ReservaCompleta[] = [],
    params: EventParams = DEFAULT_PARAMS,
  ) {
    this.pin = pin;
    this.params = parseParams(params);
    for (const reserva of seed) {
      this.byStart.set(canonicalIso(reserva.slotStart), {
        ...reserva,
        slotStart: canonicalIso(reserva.slotStart),
        slotEnd: canonicalIso(reserva.slotEnd),
        telefonos: normalizeTelefono(reserva.telefonos),
      });
    }
  }

  getParams(): EventParams {
    return { ...this.params };
  }

  updateParams(pin: string, next: EventParams): EventParams {
    this.assertPin(pin);
    this.params = parseParams(next);
    return this.getParams();
  }

  changePin(pinActual: string, pinNuevo: string): void {
    this.assertPin(pinActual);
    this.pin = pinSchema.parse(pinNuevo);
  }

  listPublic(): ReservaPublica[] {
    return [...this.byStart.values()]
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
      .map(toReservaPublica);
  }

  listOrganizer(pin: string): ReservaCompleta[] {
    this.assertPin(pin);
    return [...this.byStart.values()].sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }

  listByPhone(telefonos: string): ReservaPublica[] {
    const tel = parseTelefonoConsulta(telefonos);
    return [...this.byStart.values()]
      .filter((reserva) => reserva.telefonos === tel)
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
      .map(toReservaPublica);
  }

  reserve(input: BookingInput): ReservaPublica {
    const booking = parseBooking(input, this.params);
    if (this.byStart.has(booking.slotStart)) {
      throw new DoubleBookingError();
    }
    this.assertMaxPorTelefono(booking.telefonos);
    const reserva: ReservaCompleta = {
      ...booking,
      createdAt: new Date().toISOString(),
    };
    this.byStart.set(booking.slotStart, reserva);
    return toReservaPublica(reserva);
  }

  reschedule(
    telefonos: string,
    slotActual: string,
    nuevoInicio: string,
    now: Date = new Date(),
  ): ReservaPublica {
    const tel = parseTelefonoConsulta(telefonos);
    const actual = this.requireOwned(slotActual, tel);
    if (!canReschedule(actual.slotStart, this.params, now)) {
      throw new CutoffError();
    }
    const nextStart = canonicalIso(nuevoInicio);
    if (!isValidSlotStart(nextStart, this.params)) {
      throw new Error("El horario no corresponde a un turno del Rosario.");
    }
    if (this.byStart.has(nextStart)) {
      throw new DoubleBookingError();
    }
    this.byStart.delete(actual.slotStart);
    const moved: ReservaCompleta = {
      ...actual,
      slotStart: nextStart,
      slotEnd: expectedSlotEnd(nextStart, this.params.intervaloMinutos),
    };
    this.byStart.set(nextStart, moved);
    return toReservaPublica(moved);
  }

  updateTelefono(pin: string, slotStart: string, telefonos: string): string {
    this.assertPin(pin);
    const start = canonicalIso(slotStart);
    const reserva = this.byStart.get(start);
    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }
    const tel = parseTelefonoOrganizador(telefonos);
    if (tel !== reserva.telefonos) {
      this.assertMaxPorTelefono(tel, start);
    }
    reserva.telefonos = tel;
    return tel;
  }

  cancel(telefonos: string, slotStart: string, now: Date = new Date()): void {
    const tel = parseTelefonoConsulta(telefonos);
    if (!this.params.permitirCancelar) {
      throw new CancelDisabledError();
    }
    const actual = this.requireOwned(slotStart, tel);
    if (!canCancel(actual.slotStart, this.params, now)) {
      throw new CutoffError();
    }
    this.byStart.delete(actual.slotStart);
  }

  private requireOwned(slotStart: string, telefonos: string): ReservaCompleta {
    const reserva = this.byStart.get(canonicalIso(slotStart));
    if (!reserva) {
      throw new ReservaNoEncontradaError();
    }
    if (reserva.telefonos !== telefonos) {
      throw new OwnershipError();
    }
    return reserva;
  }

  private assertMaxPorTelefono(telefonos: string, exceptSlotStart?: string): void {
    const count = [...this.byStart.values()].filter(
      (reserva) => reserva.telefonos === telefonos && reserva.slotStart !== exceptSlotStart,
    ).length;
    if (count >= this.params.maxReservasPorTelefono) {
      throw new MaxReservasError(
        `Este teléfono ya tiene el máximo de reservas permitidas (${this.params.maxReservasPorTelefono}).`,
      );
    }
  }

  private assertPin(pin: string): void {
    if (pin !== this.pin) {
      throw new InvalidPinError();
    }
  }
}
