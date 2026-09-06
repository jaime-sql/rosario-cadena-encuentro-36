/** Zona horaria oficial del evento (El Salvador no usa horario de verano). */
export const TIME_ZONE = "America/El_Salvador";

/** Inicio del Rosario: sábado 12 de septiembre 2026, 06:00. */
export const EVENT_START_ISO = "2026-09-12T06:00:00-06:00";

/** Fin del Rosario: domingo 13 de septiembre 2026, 16:30. */
export const EVENT_END_ISO = "2026-09-13T16:30:00-06:00";

export const SLOT_MINUTES = 30;

export const EVENT_TITLE = "Rosario en Cadena por Encuentro 36 SJB";
export const EVENT_PARISH = "Parroquia San Juan Bautista";
export const EVENT_GROUP = "MEC-SJB · El Salvador";
export const EVENT_UNIT = "Unidad de Liturgia y Oración MEC-SJB";

export const LOCAL_STORAGE_KEY = "rosario-cadena-reservas-v1";
export const LOCAL_PARAMS_KEY = "rosario-cadena-parametros-v1";
export const LOCAL_PIN_KEY = "rosario-cadena-org-pin-v1";
export const ORGANIZER_SESSION_KEY = "rosario-cadena-org-ok";

/** PIN de respaldo solo si no hay ORG_PIN en el entorno (modo local). */
export const LOCAL_ORG_PIN = "sjb36";
