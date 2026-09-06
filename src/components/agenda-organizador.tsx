"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { csvFileName, reservasToCsv } from "@/lib/csv";
import { localOrgPin } from "@/lib/env";
import { ORGANIZER_SESSION_KEY } from "@/lib/event";
import { listOrganizerReservas, mergeAgenda, usesHostedDatabase } from "@/lib/storage";
import { formatDiaLargo, formatHora } from "@/lib/slots";
import { InvalidPinError, type ReservaCompleta } from "@/lib/types";

export function AgendaOrganizador() {
  const [pin, setPin] = useState("");
  const [reservas, setReservas] = useState<ReservaCompleta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hosted = usesHostedDatabase();

  const agenda = useMemo(() => {
    if (!reservas) return [];
    const byStart = new Map(reservas.map((reserva) => [reserva.slotStart, reserva]));
    return mergeAgenda(reservas).map((turno) => ({
      ...turno,
      telefonos: byStart.get(turno.slotStart)?.telefonos ?? "",
    }));
  }, [reservas]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const rows = await listOrganizerReservas(pin);
      setReservas(rows);
      sessionStorage.setItem(ORGANIZER_SESSION_KEY, "1");
    } catch (cause) {
      if (cause instanceof InvalidPinError) setError(cause.message);
      else setError(cause instanceof Error ? cause.message : "No se pudo abrir la vista de coordinación.");
      setReservas(null);
    } finally {
      setPending(false);
    }
  }

  function exportCsv() {
    if (!reservas) return;
    const rows = agenda.map((row) => ({
      slotStart: row.slotStart,
      slotEnd: row.slotEnd,
      espososResponsables: row.espososResponsables ?? "",
      numeroEncuentro: row.numeroEncuentro ?? 0,
      telefonos: row.telefonos,
    }));
    const blob = new Blob([reservasToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = csvFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!reservas) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:px-6">
        {!hosted && (
          <p className="rounded-lg border border-amber-700/25 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Modo local. PIN de prueba: <span className="font-mono">{localOrgPin()}</span>
          </p>
        )}
        <form onSubmit={onSubmit} className="rounded-xl border-2 border-primary bg-[color:var(--paper)] p-5">
          <h2 className="font-heading text-lg font-semibold text-primary uppercase">Coordinación</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ingrese el PIN para ver teléfonos y exportar la hoja completa.</p>
          <div className="mt-4 grid gap-2">
            <Label htmlFor="pin">PIN de organización</Label>
            <Input id="pin" type="password" value={pin} onChange={(event) => setPin(event.target.value)} className="h-10" autoComplete="current-password" />
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-4 w-full" disabled={pending || pin.trim() === ""}>{pending ? "Verificando…" : "Entrar"}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-[color:var(--paper)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Hoja completa</p>
          <p className="text-sm text-muted-foreground">{reservas.length} reservas · los teléfonos solo aparecen aquí</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={exportCsv}>Exportar CSV</Button>
          <Button type="button" variant="outline" onClick={() => { setReservas(null); setPin(""); sessionStorage.removeItem(ORGANIZER_SESSION_KEY); }}>Salir</Button>
        </div>
      </div>
      {reservas.length === 0 ? (
        <p className="rounded-xl border-2 border-dashed border-primary/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay inscripciones. Cuando una pareja reserve, aparecerá en esta tabla y en el CSV.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border-2 border-primary bg-[color:var(--paper)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Hora inicio</th>
              <th className="px-3 py-2 font-semibold">Hora finalización</th>
              <th className="px-3 py-2 font-semibold">Esposos responsables</th>
              <th className="px-3 py-2 font-semibold">No. encuentro</th>
              <th className="px-3 py-2 font-semibold">Teléfonos</th>
            </tr>
          </thead>
          <tbody>
            {agenda.map((row) => (
              <tr key={row.slotStart} className="border-t border-primary/15">
                <td className="px-3 py-2 align-top whitespace-nowrap">
                  <span className="block font-medium text-primary">{formatHora(row.slotStart)}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDiaLargo(row.slotStart)}</span>
                </td>
                <td className="px-3 py-2 align-top whitespace-nowrap">{formatHora(row.slotEnd)}</td>
                <td className="px-3 py-2 align-top">{row.reserved ? row.espososResponsables : "—"}</td>
                <td className="px-3 py-2 align-top">{row.reserved ? row.numeroEncuentro : "—"}</td>
                <td className="px-3 py-2 align-top">{row.reserved ? row.telefonos : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
