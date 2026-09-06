import { describe, expect, it } from "vitest";
import {
  EVENT_END_ISO,
  EVENT_START_ISO,
  SLOT_MINUTES,
  TIME_ZONE,
} from "../src/lib/event";
import {
  canonicalIso,
  formatHora,
  generateSlots,
  isValidSlotStart,
  slotsAreContiguous,
} from "../src/lib/slots";

describe("generación de turnos", () => {
  const slots = generateSlots();

  it("usa America/El_Salvador y turnos de 30 minutos", () => {
    expect(TIME_ZONE).toBe("America/El_Salvador");
    expect(SLOT_MINUTES).toBe(30);
  });

  it("genera 69 turnos contiguos del sábado 06:00 al domingo 16:30", () => {
    expect(slots).toHaveLength(69);
    expect(slots[0]?.slotStart).toBe(canonicalIso(EVENT_START_ISO));
    expect(slots.at(-1)?.slotEnd).toBe(canonicalIso(EVENT_END_ISO));
    expect(slotsAreContiguous(slots)).toBe(true);
  });

  it("no se solapa y cada turno dura exactamente 30 minutos", () => {
    const duration = SLOT_MINUTES * 60 * 1000;
    const starts = new Set<string>();
    for (const slot of slots) {
      expect(starts.has(slot.slotStart)).toBe(false);
      starts.add(slot.slotStart);
      expect(Date.parse(slot.slotEnd) - Date.parse(slot.slotStart)).toBe(duration);
    }
  });

  it("reconoce solo inicios válidos del Rosario", () => {
    expect(isValidSlotStart(EVENT_START_ISO)).toBe(true);
    expect(isValidSlotStart("2026-09-12T06:15:00-06:00")).toBe(false);
    expect(isValidSlotStart("2026-09-13T16:30:00-06:00")).toBe(false);
  });

  it("formatea mediodía y medianoche como en las hojas", () => {
    expect(formatHora("2026-09-12T06:00:00-06:00")).toBe("06:00 a.m.");
    expect(formatHora("2026-09-12T12:00:00-06:00")).toBe("12:00 m.");
    expect(formatHora("2026-09-13T00:00:00-06:00")).toBe("12:00 m.n.");
    expect(formatHora("2026-09-13T16:30:00-06:00")).toBe("04:30 p.m.");
  });
});
