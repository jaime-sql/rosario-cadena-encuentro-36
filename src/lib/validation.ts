import { z } from "zod";
import { canonicalIso, isValidSlotStart } from "./slots";
import type { BookingInput } from "./types";

export const bookingSchema = z
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
      .min(7, "Indique al menos un teléfono de contacto.")
      .max(40, "El teléfono es demasiado largo.")
      .refine((value) => digitCount(value) >= 8, "El teléfono debe tener al menos 8 dígitos.")
      .refine(
        (value) => /^[0-9+\-\s()]+$/.test(value),
        "Use solo números, espacios o guiones en el teléfono.",
      ),
  })
  .superRefine((value, ctx) => {
    let start: string;
    try {
      start = canonicalIso(value.slotStart);
    } catch {
      return;
    }
    if (!isValidSlotStart(start)) {
      ctx.addIssue({
        code: "custom",
        path: ["slotStart"],
        message: "El horario no corresponde a un turno del Rosario.",
      });
    }
    const expectedEnd = new Date(Date.parse(start) + 30 * 60 * 1000).toISOString();
    if (canonicalIso(value.slotEnd) !== expectedEnd) {
      ctx.addIssue({
        code: "custom",
        path: ["slotEnd"],
        message: "Cada turno debe durar exactamente 30 minutos.",
      });
    }
  });

export type ValidatedBooking = z.infer<typeof bookingSchema> & {
  slotStart: string;
  slotEnd: string;
  numeroEncuentro: number;
};

export function parseBooking(input: BookingInput): ValidatedBooking {
  const parsed = bookingSchema.parse(input);
  return {
    ...parsed,
    slotStart: canonicalIso(parsed.slotStart),
    slotEnd: canonicalIso(parsed.slotEnd),
    numeroEncuentro: Number(parsed.numeroEncuentro),
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

function digitCount(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}
