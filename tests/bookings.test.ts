import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../src/lib/params";
import { MemoryReservasStore } from "../src/lib/storage/memory";
import { mergeAgenda } from "../src/lib/storage";
import {
  CancelDisabledError,
  CutoffError,
  DoubleBookingError,
  InvalidPinError,
  MaxReservasError,
  OwnershipError,
  assertNoTelefonos,
} from "../src/lib/types";

const sample = {
  slotStart: "2026-09-12T06:00:00-06:00",
  slotEnd: "2026-09-12T06:30:00-06:00",
  espososResponsables: "Cesar y Mercy Avalos",
  numeroEncuentro: 164,
  telefonos: "78266416",
};

const secondSlot = {
  slotStart: "2026-09-12T06:30:00-06:00",
  slotEnd: "2026-09-12T07:00:00-06:00",
  espososResponsables: "Boris y Marisela Zepeda",
  numeroEncuentro: 11,
  telefonos: "75681055",
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
    const second = store.reserve(secondSlot);
    expect(second.espososResponsables).toContain("Boris");
    expect(store.listPublic()).toHaveLength(2);
  });
});

describe("máximo de reservas por teléfono", () => {
  it("con el máximo en 1 rechaza una segunda reserva del mismo teléfono", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() =>
      store.reserve({
        ...secondSlot,
        telefonos: "78266416",
      }),
    ).toThrow(MaxReservasError);
  });

  it("permite una segunda reserva si el máximo es 2", () => {
    const store = new MemoryReservasStore("sjb36", [], { ...DEFAULT_PARAMS, maxReservasPorTelefono: 2 });
    store.reserve(sample);
    const second = store.reserve({ ...secondSlot, telefonos: "78266416" });
    expect(second.slotStart).toBe(new Date(secondSlot.slotStart).toISOString());
    expect(store.listByPhone("78266416")).toHaveLength(2);
  });
});

describe("reagendar y cancelar", () => {
  const farBefore = new Date("2026-09-01T12:00:00-06:00");
  const tooLate = new Date("2026-09-12T05:15:00-06:00"); // 45 min before 06:00, cutoff 60

  it("permite reagendar si aún no llega el corte y libera el turno anterior", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    const moved = store.reschedule("78266416", sample.slotStart, secondSlot.slotStart, farBefore);
    expect(moved.slotStart).toBe(new Date(secondSlot.slotStart).toISOString());
    const agenda = mergeAgenda(store.listPublic());
    const old = agenda.find((turno) => turno.slotStart === new Date(sample.slotStart).toISOString());
    const next = agenda.find((turno) => turno.slotStart === new Date(secondSlot.slotStart).toISOString());
    expect(old?.reserved).toBe(false);
    expect(next?.reserved).toBe(true);
    expect(JSON.stringify(store.listPublic())).not.toMatch(/7826/);
  });

  it("bloquea el reagendado si ya pasó el corte", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() => store.reschedule("78266416", sample.slotStart, secondSlot.slotStart, tooLate)).toThrow(CutoffError);
    expect(store.listPublic()).toHaveLength(1);
  });

  it("exige el teléfono dueño para reagendar o cancelar", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() => store.reschedule("75681055", sample.slotStart, secondSlot.slotStart, farBefore)).toThrow(OwnershipError);
    expect(() => store.cancel("75681055", sample.slotStart, farBefore)).toThrow(OwnershipError);
  });

  it("cancela si está permitido y dentro del corte", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    store.cancel("78266416", sample.slotStart, farBefore);
    expect(store.listPublic()).toHaveLength(0);
  });

  it("bloquea cancelar si el flag está en no", () => {
    const store = new MemoryReservasStore("sjb36", [], { ...DEFAULT_PARAMS, permitirCancelar: false });
    store.reserve(sample);
    expect(() => store.cancel("78266416", sample.slotStart, farBefore)).toThrow(CancelDisabledError);
    expect(store.listPublic()).toHaveLength(1);
  });

  it("bloquea cancelar si ya pasó el mismo corte del reagendado", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() => store.cancel("78266416", sample.slotStart, tooLate)).toThrow(CutoffError);
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
    expect(() => assertNoTelefonos(store.listByPhone("78266416"))).not.toThrow();
    expect(JSON.stringify(store.listByPhone("78266416"))).not.toMatch(/7826/);
  });

  it("el organizador ve telefonos solo con el PIN correcto", () => {
    const store = new MemoryReservasStore("sjb36");
    store.reserve(sample);
    expect(() => store.listOrganizer("0000")).toThrow(InvalidPinError);
    expect(store.listOrganizer("sjb36")[0]?.telefonos).toBe("78266416");
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
