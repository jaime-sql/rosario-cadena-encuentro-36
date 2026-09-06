import { describe, expect, it } from "vitest";
import { parseBooking } from "../src/lib/validation";

const valid = {
  slotStart: "2026-09-12T06:00:00-06:00",
  slotEnd: "2026-09-12T06:30:00-06:00",
  espososResponsables: "Cesar y Mercy Avalos",
  numeroEncuentro: 164,
  telefonos: "7826-6416",
};

describe("validación de reserva", () => {
  it("acepta una inscripción completa y canónica el horario", () => {
    const parsed = parseBooking(valid);
    expect(parsed.espososResponsables).toBe("Cesar y Mercy Avalos");
    expect(parsed.numeroEncuentro).toBe(164);
    expect(parsed.slotStart).toBe(new Date(valid.slotStart).toISOString());
  });

  it("exige esposos responsables", () => {
    expect(() => parseBooking({ ...valid, espososResponsables: "  " })).toThrow();
    expect(() => parseBooking({ ...valid, espososResponsables: "12" })).toThrow();
  });

  it("exige un número de encuentro entero positivo", () => {
    expect(() => parseBooking({ ...valid, numeroEncuentro: 0 })).toThrow();
    expect(() => parseBooking({ ...valid, numeroEncuentro: 3.5 })).toThrow();
    expect(() => parseBooking({ ...valid, numeroEncuentro: "abc" })).toThrow();
  });

  it("exige un teléfono con al menos 8 dígitos", () => {
    expect(() => parseBooking({ ...valid, telefonos: "123" })).toThrow();
    expect(() => parseBooking({ ...valid, telefonos: "abc-defg" })).toThrow();
  });

  it("rechaza un horario que no es turno del Rosario", () => {
    expect(() =>
      parseBooking({
        ...valid,
        slotStart: "2026-09-12T06:15:00-06:00",
        slotEnd: "2026-09-12T06:45:00-06:00",
      }),
    ).toThrow(/turno/i);
  });

  it("rechaza un turno que no dure 30 minutos", () => {
    expect(() =>
      parseBooking({
        ...valid,
        slotEnd: "2026-09-12T07:00:00-06:00",
      }),
    ).toThrow(/30/);
  });
});
