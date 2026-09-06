import { describe, expect, it } from "vitest";
import { reservasToCsv } from "../src/lib/csv";

describe("CSV del organizador", () => {
  it("incluye las cinco columnas de la hoja y los teléfonos", () => {
    const csv = reservasToCsv([
      {
        slotStart: "2026-09-12T06:00:00-06:00",
        slotEnd: "2026-09-12T06:30:00-06:00",
        espososResponsables: "Cesar y Mercy Avalos",
        numeroEncuentro: 164,
        telefonos: "78266416",
      },
    ]);
    expect(csv).toContain("HORA INICIO");
    expect(csv).toContain("HORA FINALIZACIÓN");
    expect(csv).toContain("ESPOSOS RESPONSABLES");
    expect(csv).toContain("No. ENCUENTRO");
    expect(csv).toContain("TELÉFONOS");
    expect(csv).toContain("Cesar y Mercy Avalos");
    expect(csv).toContain("164");
    expect(csv).toContain("78266416");
    expect(csv).toContain("06:00 a.m.");
  });
});
