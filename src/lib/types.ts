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
  dayKey: string;
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

export class MaxReservasError extends Error {
  readonly code = "max_reservas" as const;

  constructor(message = "Este teléfono ya tiene el máximo de reservas permitidas.") {
    super(message);
    this.name = "MaxReservasError";
  }
}

export class OwnershipError extends Error {
  readonly code = "sin_permiso" as const;

  constructor(message = "El teléfono no coincide con esta reserva.") {
    super(message);
    this.name = "OwnershipError";
  }
}

export class CutoffError extends Error {
  readonly code = "corte" as const;

  constructor(message = "Ya no se puede cambiar este turno: pasó el tiempo de anticipación.") {
    super(message);
    this.name = "CutoffError";
  }
}

export class CancelDisabledError extends Error {
  readonly code = "cancelar_no" as const;

  constructor(message = "Las cancelaciones no están permitidas.") {
    super(message);
    this.name = "CancelDisabledError";
  }
}

export class ReservaNoEncontradaError extends Error {
  readonly code = "no_encontrada" as const;

  constructor(message = "No se encontró esa reserva.") {
    super(message);
    this.name = "ReservaNoEncontradaError";
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
