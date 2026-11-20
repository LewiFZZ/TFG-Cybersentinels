import { ReputationCheck, ReputationSource, RiskClassification } from '../api/api.models';

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

/* ---------- Reputación externa ---------- */

export const SOURCE_LABELS: Record<ReputationSource, string> = {
  virustotal: 'VirusTotal',
  google_safe_browsing: 'Google Safe Browsing',
  phishtank: 'PhishTank',
};

const THREAT_LABELS: Record<string, string> = {
  SOCIAL_ENGINEERING: 'ingeniería social (phishing)',
  MALWARE: 'malware',
  UNWANTED_SOFTWARE: 'software no deseado',
  POTENTIALLY_HARMFUL_APPLICATION: 'aplicación potencialmente dañina',
};

/** Frase que resume lo que ha dicho una fuente externa. */
export function reputationText(check: ReputationCheck): string {
  const d = check.details ?? {};

  if (check.status !== 'ok') {
    return typeof d['error'] === 'string' ? d['error'] : 'No disponible';
  }

  if (check.source === 'virustotal') {
    if (d['known'] === false) return 'VirusTotal no tiene informes de esta URL';
    const malicious = Number(d['malicious'] ?? 0);
    const engines = Number(d['engines'] ?? 0);
    return `${malicious} de ${engines} motores la marcan como maliciosa`;
  }

  if (check.source === 'google_safe_browsing') {
    const threats = Array.isArray(d['threatTypes']) ? (d['threatTypes'] as string[]) : [];
    return threats.length
      ? `En la lista de Google: ${threats.map((t) => THREAT_LABELS[t] ?? t).join(', ')}`
      : 'No aparece en las listas de Google';
  }

  return check.malicious ? 'Marcada como peligrosa' : 'Sin detecciones';
}

/**
 * Enlace al informe de VirusTotal. Solo se admite si apunta a virustotal.com:
 * nunca se enlaza la URL analizada.
 */
export function virusTotalLink(check: ReputationCheck): string | null {
  const link = check.details?.['link'];
  return typeof link === 'string' && link.startsWith('https://www.virustotal.com/') ? link : null;
}
