import { z } from "zod";
import { DEFAULT_PARAMS, type EventParams, expectedSlotEnd } from "./params";
import { isDigitsOnlyTelefono, normalizeTelefono } from "./phone";
import { isValidSlotStart } from "./slots";
import { canonicalIso } from "./slots-iso";
import type { BookingInput } from "./types";

export function bookingSchema(params: EventParams = DEFAULT_PARAMS) {
  return z
    .object({
      slotStart: z
        .string()
        .trim()
        .min(1, "Seleccione un horario.")
        .refine((value) => !Number.isNaN(Date.parse(value)), "El horario de inicio no es válido."),
      slotEnd: z
        .string()
        .trim()
        .min(1, "Falta la hora de finalización.")
        .refine((value) => !Number.isNaN(Date.parse(value)), "El horario de finalización no es válido."),
      espososResponsables: z
        .string()
        .trim()
        .min(3, "Escriba el nombre de los esposos responsables.")
        .max(120, "El nombre es demasiado largo.")
        .refine((value) => /[a-záéíóúñ]/i.test(value), "El nombre debe incluir letras."),
      numeroEncuentro: z.coerce
        .number({ error: "Indique el número de encuentro." })
        .int("El número de encuentro debe ser un entero.")
        .positive("El número de encuentro debe ser mayor que cero.")
        .max(9999, "El número de encuentro no es válido."),
      telefonos: z
        .string()
        .trim()
        .min(1, "Indique un teléfono de contacto.")
        .refine((value) => isDigitsOnlyTelefono(value), "Use solo dígitos en el teléfono (sin espacios ni guiones).")
        .refine((value) => normalizeTelefono(value).length >= 8, "El teléfono debe tener al menos 8 dígitos.")
        .refine((value) => normalizeTelefono(value).length <= 15, "El teléfono es demasiado largo."),
    })
    .superRefine((value, ctx) => {
      let start: string;
      try {
        start = canonicalIso(value.slotStart);
      } catch {
        return;
      }
      if (!isValidSlotStart(start, params)) {
        ctx.addIssue({
          code: "custom",
          path: ["slotStart"],
          message: "El horario no corresponde a un turno del Rosario.",
        });
      }
      const expectedEnd = expectedSlotEnd(start, params.intervaloMinutos);
      if (canonicalIso(value.slotEnd) !== expectedEnd) {
        ctx.addIssue({
          code: "custom",
          path: ["slotEnd"],
          message: `Cada turno debe durar exactamente ${params.intervaloMinutos} minutos.`,
        });
      }
    });
}

export type ValidatedBooking = {
  slotStart: string;
  slotEnd: string;
  espososResponsables: string;
  numeroEncuentro: number;
  telefonos: string;
};

export function parseBooking(input: BookingInput, params: EventParams = DEFAULT_PARAMS): ValidatedBooking {
  const parsed = bookingSchema(params).parse(input);
  return {
    slotStart: canonicalIso(parsed.slotStart),
    slotEnd: canonicalIso(parsed.slotEnd),
    espososResponsables: parsed.espososResponsables,
    numeroEncuentro: Number(parsed.numeroEncuentro),
    telefonos: normalizeTelefono(parsed.telefonos),
  };
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}

export function parseTelefonoConsulta(value: string): string {
  const trimmed = value.trim();
  if (!isDigitsOnlyTelefono(trimmed)) {
    throw new Error("Use solo dígitos en el teléfono (sin espacios ni guiones).");
  }
  const digits = normalizeTelefono(trimmed);
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("El teléfono debe tener entre 8 y 15 dígitos.");
  }
  return digits;
}

/** Misma regla que la reserva: 8–15 dígitos tras quitar lo que no sea número. */
export function parseTelefonoOrganizador(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error("Indique un teléfono de contacto.");
  }
  const digits = normalizeTelefono(trimmed);
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("El teléfono debe tener solo dígitos (8 a 15).");
  }
  return digits;
}
