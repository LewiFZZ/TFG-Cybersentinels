import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MAX_URL_LENGTH = 2048;

/**
 * Validación en cliente para dar mensajes en castellano antes de llamar a la API.
 * Igual que el backend: sin esquema se asume http://, solo http/https, dominio completo.
 * La validación de verdad la hace siempre el backend.
 */
export const httpUrlValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null; // de esto se encarga Validators.required

  try {
    const parsed = new URL(withScheme(value));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { protocol: true };
    // "localhost" o "intranet" no valen: hace falta un dominio completo o una IP.
    if (!parsed.hostname.includes('.') && !parsed.hostname.includes(':')) return { domain: true };
    return null;
  } catch {
    return { url: true };
  }
};

/** Añade http:// si no hay esquema (mismo criterio que el backend). Solo para validar. */
export function withScheme(value: string): string {
  const trimmed = value.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/**
 * "Desactiva" una URL para mostrarla sin que se pueda abrir ni autoenlazar:
 * https://evil.com -> hxxps://evil[.]com (práctica habitual en informes de seguridad).
 */
export function defang(url: string): string {
  return url.replace(/^http/i, 'hxxp').replace(/\./g, '[.]');
}
