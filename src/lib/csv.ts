import { formatDiaLargo, formatHora } from "./slots";
import type { ReservaCompleta } from "./types";

const HEADERS = [
  "HORA INICIO",
  "HORA FINALIZACIÓN",
  "ESPOSOS RESPONSABLES",
  "No. ENCUENTRO",
  "TELÉFONOS",
  "DÍA",
] as const;

export function reservasToCsv(reservas: ReservaCompleta[]): string {
  const lines = [
    HEADERS.join(","),
    ...reservas.map((reserva) =>
      [
        formatHora(reserva.slotStart),
        formatHora(reserva.slotEnd),
        reserva.espososResponsables,
        reserva.espososResponsables ? String(reserva.numeroEncuentro) : "",
        reserva.telefonos,
        formatDiaLargo(reserva.slotStart),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return `\uFEFF${lines.join("\n")}\n`;
}

export function csvFileName(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  return `rosario-en-cadena-reservas-${stamp}.csv`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
