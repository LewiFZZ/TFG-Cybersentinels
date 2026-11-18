import { RiskClassification } from '../api/api.models';

export const CLASSIFICATION_LABELS: Record<RiskClassification, string> = {
  safe: 'Seguro',
  suspicious: 'Sospechoso',
  malicious: 'Malicioso',
};

export const CLASSIFICATION_HINTS: Record<RiskClassification, string> = {
  safe: 'No se han detectado indicios relevantes de phishing.',
  suspicious: 'Hay señales de riesgo. No introduzcas credenciales ni datos personales.',
  malicious: 'Alta probabilidad de phishing. No accedas a este enlace.',
};

/** Etiquetas para la evidencia (`details`) de cada regla. */
const DETAIL_LABELS: Record<string, string> = {
  brand: 'Marca',
  domain: 'Dominio',
  ip: 'IP',
  userinfo: 'Usuario',
  hostname: 'Host',
  shortener: 'Acortador',
  tld: 'Extensión',
  keywords: 'Palabras',
  subdomains: 'Subdominios',
  hyphens: 'Guiones',
  port: 'Puerto',
  encoded: 'Caracteres codificados',
  doubleEncoded: 'Doble codificación',
  length: 'Longitud',
};

/** Convierte `details` en pares legibles: [["Marca", "paypal"], ["Extensión", ".xyz"]]. */
export function detailPairs(details: Record<string, unknown> | null): [string, string][] {
  if (!details) return [];
  return Object.entries(details).map(([key, value]) => {
    let text: string;
    if (Array.isArray(value)) text = value.join(', ');
    else if (typeof value === 'boolean') text = value ? 'sí' : 'no';
    else if (key === 'tld') text = `.${String(value)}`;
    else text = String(value);
    return [DETAIL_LABELS[key] ?? key, text];
  });
}
