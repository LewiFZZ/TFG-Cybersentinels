import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export const MAX_URL_LENGTH = 2048;

/** Segundos niveles habituales (co.uk, com.es...) para calcular el dominio registrable. */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'com.es',
  'org.es',
  'gob.es',
  'nom.es',
  'com.br',
  'com.ar',
  'com.mx',
  'com.au',
  'co.jp',
  'co.in',
  'com.tr',
  'co.za',
]);

export interface NormalizedUrl {
  /** URL tal cual la envió el usuario (recortada). */
  original: string;
  /** Forma canónica: esquema y host en minúsculas, sin fragmento ni puerto por defecto, query ordenada. */
  normalized: string;
  /** SHA-256 hex de `normalized`: clave para caché e historial. */
  hash: string;
  /** Objeto URL ya parseado, para que las reglas no tengan que volver a parsear. */
  parsed: URL;
  /** Hostname sin corchetes (IPv6) y sin punto final. */
  hostname: string;
  /** Dominio registrable aproximado (ej. "paypal.com" para "login.paypal.com"). */
  registrableDomain: string;
  /** TLD (ej. "com", "xyz"). Vacío si el host es una IP. */
  tld: string;
  isIp: boolean;
}

export class InvalidUrlError extends Error {}

export function normalizeUrl(input: string): NormalizedUrl {
  const original = input.trim();
  if (!original) throw new InvalidUrlError('La URL está vacía');
  if (original.length > MAX_URL_LENGTH) {
    throw new InvalidUrlError(`La URL supera ${MAX_URL_LENGTH} caracteres`);
  }

  // Si el usuario pega "example.com/login" sin esquema, asumimos http.
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(original)
    ? original
    : `http://${original}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme); // WHATWG: pasa el host a minúsculas y punycode
  } catch {
    throw new InvalidUrlError('La URL no tiene un formato válido');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new InvalidUrlError('Solo se admiten URLs http o https');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!hostname) throw new InvalidUrlError('La URL no tiene host');

  const isIp = isIP(hostname) !== 0;
  if (!isIp && !hostname.includes('.')) {
    throw new InvalidUrlError('El host debe ser un dominio completo o una IP');
  }

  // Canonicalización
  const canonical = new URL(parsed.href);
  canonical.hash = '';
  canonical.searchParams.sort();
  const normalized = canonical.href;

  const labels = isIp ? [] : hostname.split('.');
  const tld = isIp ? '' : labels[labels.length - 1];
  const lastTwo = labels.slice(-2).join('.');
  const registrableDomain = isIp
    ? hostname
    : MULTI_PART_SUFFIXES.has(lastTwo)
      ? labels.slice(-3).join('.')
      : lastTwo;

  return {
    original,
    normalized,
    hash: createHash('sha256').update(normalized).digest('hex'),
    parsed: canonical,
    hostname,
    registrableDomain,
    tld,
    isIp,
  };
}
