import { describe, expect, it } from "vitest";
import { parseBooking } from "../src/lib/validation";
import { isDigitsOnlyTelefono, normalizeTelefono, telefonoValido } from "../src/lib/phone";

const valid = {
  slotStart: "2026-09-12T06:00:00-06:00",
  slotEnd: "2026-09-12T06:30:00-06:00",
  espososResponsables: "Cesar y Mercy Avalos",
  numeroEncuentro: 164,
  telefonos: "78266416",
};

describe("validación de reserva", () => {
  it("acepta una inscripción completa, canónica el horario y normaliza el teléfono a dígitos", () => {
    const parsed = parseBooking(valid);
    expect(parsed.espososResponsables).toBe("Cesar y Mercy Avalos");
    expect(parsed.numeroEncuentro).toBe(164);
    expect(parsed.slotStart).toBe(new Date(valid.slotStart).toISOString());
    expect(parsed.telefonos).toBe("78266416");
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

  it("exige un teléfono de solo dígitos, con 8 a 15 cifras", () => {
    expect(isDigitsOnlyTelefono("78266416")).toBe(true);
    expect(isDigitsOnlyTelefono("7826-6416")).toBe(false);
    expect(isDigitsOnlyTelefono("7826 6416")).toBe(false);
    expect(telefonoValido("78266416")).toBe(true);
    expect(telefonoValido("7826-6416")).toBe(false);
    expect(normalizeTelefono("7826-6416")).toBe("78266416");

    expect(() => parseBooking({ ...valid, telefonos: "123" })).toThrow();
    expect(() => parseBooking({ ...valid, telefonos: "abc-defg" })).toThrow();
    expect(() => parseBooking({ ...valid, telefonos: "7826-6416" })).toThrow(/dígitos/i);
    expect(() => parseBooking({ ...valid, telefonos: "7826 6416" })).toThrow(/dígitos/i);
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

  it("rechaza un turno que no dure el intervalo configurado", () => {
    expect(() =>
      parseBooking({
        ...valid,
        slotEnd: "2026-09-12T07:00:00-06:00",
      }),
    ).toThrow(/30/);
  });
});
