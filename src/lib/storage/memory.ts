import { parseBooking } from "../validation";
import {
  DoubleBookingError,
  InvalidPinError,
  toReservaPublica,
  type BookingInput,
  type ReservaCompleta,
  type ReservaPublica,
} from "../types";
import { LOCAL_ORG_PIN } from "../event";

export class MemoryReservasStore {
  private readonly byStart = new Map<string, ReservaCompleta>();
  private readonly pin: string;

  constructor(pin: string = LOCAL_ORG_PIN, seed: ReservaCompleta[] = []) {
    this.pin = pin;
    for (const reserva of seed) {
      this.byStart.set(reserva.slotStart, reserva);
    }
  }

  listPublic(): ReservaPublica[] {
    return [...this.byStart.values()]
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
      .map(toReservaPublica);
  }

  listOrganizer(pin: string): ReservaCompleta[] {
    if (pin !== this.pin) {
      throw new InvalidPinError();
    }
    return [...this.byStart.values()].sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }

  reserve(input: BookingInput): ReservaPublica {
    const booking = parseBooking(input);
    if (this.byStart.has(booking.slotStart)) {
      throw new DoubleBookingError();
    }
    const reserva: ReservaCompleta = {
      ...booking,
      createdAt: new Date().toISOString(),
    };
    this.byStart.set(booking.slotStart, reserva);
    return toReservaPublica(reserva);
  }
}
