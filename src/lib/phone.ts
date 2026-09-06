/** Solo dígitos; se usa para validar, comparar y guardar el teléfono. */
export function normalizeTelefono(value: string): string {
  return value.replace(/\D/g, "");
}

export function isDigitsOnlyTelefono(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function telefonoValido(value: string): boolean {
  const digits = normalizeTelefono(value);
  return isDigitsOnlyTelefono(value) && digits.length >= 8 && digits.length <= 15;
}
