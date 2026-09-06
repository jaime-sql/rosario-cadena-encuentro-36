import { describe, expect, it } from "vitest";
import { MemoryReservasStore } from "../src/lib/storage/memory";
import { mergeAgenda } from "../src/lib/storage";
import { DoubleBookingError, InvalidPinError, assertNoTelefonos } from "../src/lib/types";

const sample = {
  slotStart: "2026-09-12T06:00:00-06:00",
  slotEnd: "2026-09-12T06:30:00-06:00",
  espososResponsables: "Cesar y Mercy Avalos",
  numeroEncuentro: 164,
  telefonos: "7826-6416",
};

describe("doble reserva", () => {
  it("rechaza un segundo insert en el mismo slot_start", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() =>
      store.reserve({
        ...sample,
        espososResponsables: "Otra pareja",
        numeroEncuentro: 11,
        telefonos: "75681055",
      }),
    ).toThrow(DoubleBookingError);
  });

  it("permite dos turnos distintos", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    const second = store.reserve({
      ...sample,
      slotStart: "2026-09-12T06:30:00-06:00",
      slotEnd: "2026-09-12T07:00:00-06:00",
      espososResponsables: "Boris y Marisela Zepeda",
      numeroEncuentro: 11,
    });
    expect(second.espososResponsables).toContain("Boris");
    expect(store.listPublic()).toHaveLength(2);
  });
});

describe("lista pública y organizador", () => {
  it("nunca incluye telefonos en la lista pública", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    const publicas = store.listPublic();
    expect(publicas[0]).not.toHaveProperty("telefonos");
    expect(() => assertNoTelefonos(publicas)).not.toThrow();
    expect(JSON.stringify(publicas)).not.toMatch(/7826/);
  });

  it("el organizador ve telefonos solo con el PIN correcto", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() => store.listOrganizer("0000")).toThrow(InvalidPinError);
    expect(store.listOrganizer("sjb36")[0]?.telefonos).toBe("7826-6416");
  });

  it("combina la hoja de 69 turnos con las reservas", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    const agenda = mergeAgenda(store.listPublic());
    expect(agenda).toHaveLength(69);
    expect(agenda[0]?.reserved).toBe(true);
    expect(agenda[0]?.espososResponsables).toBe("Cesar y Mercy Avalos");
    expect(agenda[1]?.reserved).toBe(false);
    expect(agenda[0]).not.toHaveProperty("telefonos");
  });
});
