export type ReservaPublica = {
  slotStart: string;
  slotEnd: string;
  espososResponsables: string;
  numeroEncuentro: number;
};

export type ReservaCompleta = ReservaPublica & {
  telefonos: string;
  createdAt?: string;
};

export type BookingInput = {
  slotStart: string;
  slotEnd: string;
  espososResponsables: string;
  numeroEncuentro: number | string;
  telefonos: string;
};

export type PublicTurno = {
  slotStart: string;
  slotEnd: string;
  dayKey: "sabado" | "domingo";
  reserved: boolean;
  espososResponsables: string | null;
  numeroEncuentro: number | null;
};

export class DoubleBookingError extends Error {
  readonly code = "turno_ocupado" as const;

  constructor(message = "Este turno ya fue reservado. Elija otro horario.") {
    super(message);
    this.name = "DoubleBookingError";
  }
}

export class InvalidPinError extends Error {
  readonly code = "pin_invalido" as const;

  constructor(message = "El PIN no es correcto.") {
    super(message);
    this.name = "InvalidPinError";
  }
}

export function toReservaPublica(reserva: ReservaCompleta): ReservaPublica {
  return {
    slotStart: reserva.slotStart,
    slotEnd: reserva.slotEnd,
    espososResponsables: reserva.espososResponsables,
    numeroEncuentro: reserva.numeroEncuentro,
  };
}

export function assertNoTelefonos(payload: unknown): void {
  if (payload === null || typeof payload !== "object") {
    return;
  }
  if (Array.isArray(payload)) {
    payload.forEach(assertNoTelefonos);
    return;
  }
  if ("telefonos" in payload) {
    throw new Error("La lista pública no debe incluir teléfonos.");
  }
}
