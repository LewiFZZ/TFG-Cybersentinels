import {
  BRANDS,
  PHISHING_KEYWORDS,
  SUSPICIOUS_TLDS,
  URL_SHORTENERS,
} from './data.js';
import type { HeuristicRule } from './heuristic-rule.js';

// ---------------------------------------------------------------- Host

const ipHost: HeuristicRule = {
  code: 'IP_HOST',
  weight: 30,
  description: 'Usa una dirección IP en lugar de un nombre de dominio',
  evaluate: (u) => (u.isIp ? { details: { ip: u.hostname } } : null),
};

const userInfo: HeuristicRule = {
  code: 'USERINFO_IN_URL',
  weight: 25,
  description:
    'Contiene "usuario@" antes del dominio, técnica para ocultar el destino real',
  evaluate: (u) =>
    u.parsed.username || u.parsed.password
      ? { details: { userinfo: u.parsed.username } }
      : null,
};

const punycode: HeuristicRule = {
  code: 'PUNYCODE_DOMAIN',
  weight: 25,
  description:
    'Dominio internacionalizado (punycode): puede imitar letras de otra marca (homógrafos)',
  evaluate: (u) =>
    u.hostname.split('.').some((l) => l.startsWith('xn--'))
      ? { details: { hostname: u.hostname } }
      : null,
};

const brandImpersonation: HeuristicRule = {
  code: 'BRAND_IMPERSONATION',
  weight: 35,
  description:
    'El dominio menciona una marca conocida pero no pertenece a ella',
  evaluate: (u) => {
    if (u.isIp) return null;
    const host = u.hostname.replace(/-/g, '');
    for (const [brand, official] of Object.entries(BRANDS)) {
      if (host.includes(brand) && !official.includes(u.registrableDomain)) {
        return { details: { brand, domain: u.registrableDomain } };
      }
    }
    return null;
  },
};

const shortener: HeuristicRule = {
  code: 'URL_SHORTENER',
  weight: 15,
  description: 'Usa un acortador de URLs que oculta el destino final',
  evaluate: (u) =>
    URL_SHORTENERS.has(u.registrableDomain) || URL_SHORTENERS.has(u.hostname)
      ? { details: { shortener: u.registrableDomain } }
      : null,
};

const suspiciousTld: HeuristicRule = {
  code: 'SUSPICIOUS_TLD',
  weight: 15,
  description: 'Extensión de dominio habitual en campañas de phishing',
  evaluate: (u) =>
    SUSPICIOUS_TLDS.has(u.tld) ? { details: { tld: u.tld } } : null,
};

const manySubdomains: HeuristicRule = {
  code: 'EXCESSIVE_SUBDOMAINS',
  weight: 10,
  description:
    'Demasiados subdominios, a menudo para que la marca aparezca al principio',
  evaluate: (u) => {
    if (u.isIp) return null;
    const sub = u.hostname
      .slice(0, -u.registrableDomain.length)
      .split('.')
      .filter(Boolean);
    return sub.length >= 3 ? { details: { subdomains: sub.length } } : null;
  },
};

const manyHyphens: HeuristicRule = {
  code: 'MANY_HYPHENS',
  weight: 10,
  description:
    'Muchos guiones en el dominio (ej. secure-login-paypal-verify.com)',
  evaluate: (u) => {
    const count = (u.hostname.match(/-/g) ?? []).length;
    return count >= 3 ? { details: { hyphens: count } } : null;
  },
};

const nonStandardPort: HeuristicRule = {
  code: 'NON_STANDARD_PORT',
  weight: 10,
  description: 'Usa un puerto no estándar',
  evaluate: (u) =>
    u.parsed.port ? { details: { port: Number(u.parsed.port) } } : null,
};

const noTls: HeuristicRule = {
  code: 'NO_HTTPS',
  weight: 5,
  description: 'No usa HTTPS: la conexión no está cifrada',
  evaluate: (u) => (u.parsed.protocol === 'http:' ? {} : null),
};

// ---------------------------------------------------------------- Ruta y query

const keywords: HeuristicRule = {
  code: 'PHISHING_KEYWORDS',
  weight: 5, // por palabra, hasta 15
  description:
    'Contiene palabras típicas de phishing (login, verify, account, bank...)',
  evaluate: (u) => {
    const haystack = (
      u.hostname +
      u.parsed.pathname +
      u.parsed.search
    ).toLowerCase();
    const found = PHISHING_KEYWORDS.filter((k) => haystack.includes(k));
    return found.length
      ? { weight: Math.min(found.length * 5, 15), details: { keywords: found } }
      : null;
  },
};

const encoding: HeuristicRule = {
  code: 'EXCESSIVE_ENCODING',
  weight: 10,
  description:
    'Exceso de caracteres codificados (%xx), usado para ofuscar la URL',
  evaluate: (u) => {
    const raw = u.parsed.pathname + u.parsed.search;
    const count = (raw.match(/%[0-9a-f]{2}/gi) ?? []).length;
    const doubleEncoded = /%25[0-9a-f]{2}/i.test(raw);
    return count > 6 || doubleEncoded
      ? { details: { encoded: count, doubleEncoded } }
      : null;
  },
};

const embeddedUrl: HeuristicRule = {
  code: 'EMBEDDED_REDIRECT',
  weight: 15,
  description: 'Incluye otra URL dentro (posible redirección abierta)',
  evaluate: (u) => {
    const rest = decodeSafe(u.parsed.pathname + u.parsed.search);
    return /https?:\/\//i.test(rest) || u.parsed.pathname.includes('//')
      ? {}
      : null;
  },
};

const longUrl: HeuristicRule = {
  code: 'LONG_URL',
  weight: 5,
  description: 'URL anormalmente larga, puede esconder el dominio real',
  evaluate: (u) =>
    u.normalized.length > 120
      ? { details: { length: u.normalized.length } }
      : null,
};

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Reglas activas. Añadir una regla nueva = añadirla aquí. */
export const DEFAULT_RULES: HeuristicRule[] = [
  ipHost,
  userInfo,
  punycode,
  brandImpersonation,
  shortener,
  suspiciousTld,
  manySubdomains,
  manyHyphens,
  nonStandardPort,
  noTls,
  keywords,
  encoding,
  embeddedUrl,
  longUrl,
];
