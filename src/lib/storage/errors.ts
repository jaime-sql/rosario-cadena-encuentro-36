import {
  CancelDisabledError,
  CutoffError,
  DoubleBookingError,
  InvalidPinError,
  MaxReservasError,
  OwnershipError,
  ReservaNoEncontradaError,
} from "../types";

export function mapStorageError(error: { message?: string; code?: string }, fallback: string): Error {
  const message = error.message ?? "";
  const lower = message.toLowerCase();

  if (error.code === "23505" || lower.includes("ya fue reservado") || lower.includes("duplicate")) {
    return new DoubleBookingError();
  }
  if (lower.includes("pin")) {
    return new InvalidPinError();
  }
  if (lower.includes("máximo") || lower.includes("maximo")) {
    return new MaxReservasError(message);
  }
  if (lower.includes("no coincid")) {
    return new OwnershipError(message);
  }
  if (lower.includes("no se encontró") || lower.includes("no se encontro")) {
    return new ReservaNoEncontradaError(message);
  }
  if (lower.includes("cancelacion") || lower.includes("cancelación") || lower.includes("no están permitidas") || lower.includes("no estan permitidas")) {
    return new CancelDisabledError(message);
  }
  if (lower.includes("reagendar") || lower.includes("cancelar este turno") || lower.includes("anticipación") || lower.includes("corte")) {
    return new CutoffError(message);
  }
  return new Error(message || fallback);
}
