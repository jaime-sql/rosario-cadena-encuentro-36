/** ISO canónico (UTC) sin dependencias de turnos ni parámetros. */
export function canonicalIso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${String(value)}`);
  }
  return date.toISOString();
}
