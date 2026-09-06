import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  fromDatetimeLocalValue,
  parseParams,
  pinSchema,
  toDatetimeLocalValue,
} from "../src/lib/params";
import { analyzeScheduleChange, canCancel, canReschedule } from "../src/lib/rules";
import { generateSlots } from "../src/lib/slots";

describe("parámetros del evento", () => {
  it("convierte datetime-local como hora de El Salvador", () => {
    expect(toDatetimeLocalValue("2026-09-12T06:00:00-06:00")).toBe("2026-09-12T06:00");
    expect(fromDatetimeLocalValue("2026-09-12T06:00")).toBe(new Date("2026-09-12T06:00:00-06:00").toISOString());
  });

  it("rechaza una ventana que no es múltiplo del intervalo", () => {
    expect(() =>
      parseParams({
        ...DEFAULT_PARAMS,
        intervaloMinutos: 60,
      }),
    ).toThrow(/múltiplo/i);
  });

  it("avisa si se regeneran turnos libres cuando ya hay reservas", () => {
    const impact = analyzeScheduleChange(
      DEFAULT_PARAMS,
      { ...DEFAULT_PARAMS, eventoFin: "2026-09-13T16:00:00-06:00" },
      [{ slotStart: "2026-09-12T06:00:00-06:00", slotEnd: "2026-09-12T06:30:00-06:00" }],
    );
    expect(impact.requiresWarning).toBe(true);
    expect(impact.existingCount).toBe(1);
    expect(impact.scheduleChanged).toBe(true);
  });

  it("no avisa si solo cambia el máximo o el PIN-adjunto (corte / cancelar)", () => {
    const impact = analyzeScheduleChange(
      DEFAULT_PARAMS,
      { ...DEFAULT_PARAMS, maxReservasPorTelefono: 2, permitirCancelar: false },
      [{ slotStart: "2026-09-12T06:00:00-06:00", slotEnd: "2026-09-12T06:30:00-06:00" }],
    );
    expect(impact.requiresWarning).toBe(false);
  });

  it("el corte permite reagendar y cancelar hasta N minutos antes", () => {
    const slot = "2026-09-12T06:00:00-06:00";
    const allowed = new Date("2026-09-12T05:00:00-06:00");
    const blocked = new Date("2026-09-12T05:01:00-06:00");
    expect(canReschedule(slot, DEFAULT_PARAMS, allowed)).toBe(true);
    expect(canReschedule(slot, DEFAULT_PARAMS, blocked)).toBe(false);
    expect(canCancel(slot, DEFAULT_PARAMS, allowed)).toBe(true);
    expect(canCancel(slot, { ...DEFAULT_PARAMS, permitirCancelar: false }, allowed)).toBe(false);
  });

  it("exige un PIN de al menos 4 caracteres", () => {
    expect(() => pinSchema.parse("abc")).toThrow();
    expect(pinSchema.parse("sjb36")).toBe("sjb36");
  });

  it("sigue generando 69 turnos de 30 minutos con los valores por defecto", () => {
    expect(generateSlots()).toHaveLength(69);
  });
});
