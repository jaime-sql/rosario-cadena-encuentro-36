"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/params";
import { formatRangoEvento } from "@/lib/slots";
import { getEventParams } from "@/lib/storage";

export function EventoSubtitulo() {
  const [texto, setTexto] = useState(`Inscripción de turnos de ${DEFAULT_PARAMS.intervaloMinutos} minutos. ${formatRangoEvento(DEFAULT_PARAMS)}`);

  useEffect(() => {
    void getEventParams()
      .then((params) => {
        setTexto(`Inscripción de turnos. ${formatRangoEvento(params)}`);
      })
      .catch(() => {
        setTexto(`Inscripción de turnos. ${formatRangoEvento(DEFAULT_PARAMS)}`);
      });
  }, []);

  return <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{texto}</p>;
}

export function EventoPie() {
  const [texto, setTexto] = useState("12–13 de septiembre 2026");

  useEffect(() => {
    void getEventParams()
      .then((params) => {
        const inicio = new Intl.DateTimeFormat("es-SV", {
          timeZone: "America/El_Salvador",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(params.eventoInicio));
        const fin = new Intl.DateTimeFormat("es-SV", {
          timeZone: "America/El_Salvador",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(params.eventoFin));
        setTexto(inicio === fin ? inicio : `${inicio} — ${fin}`);
      })
      .catch(() => {
        setTexto("12–13 de septiembre 2026");
      });
  }, []);

  return <span>{texto}</span>;
}
