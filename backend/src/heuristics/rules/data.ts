/**
 * Listas de referencia para las reglas. Son deliberadamente cortas para el MVP;
 * se pueden ampliar sin tocar la lógica de las reglas.
 */

export const URL_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'cutt.ly',
  'rebrand.ly',
  'shorturl.at',
  'tiny.cc',
  'buff.ly',
  'rb.gy',
  'v.gd',
  's.id',
]);

/** TLDs con alta proporción de abuso en campañas de phishing. */
export const SUSPICIOUS_TLDS = new Set([
  'zip',
  'mov',
  'xyz',
  'top',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'click',
  'country',
  'kim',
  'work',
  'rest',
  'support',
  'buzz',
  'cam',
  'icu',
  'monster',
  'cyou',
]);

export const PHISHING_KEYWORDS = [
  'login',
  'signin',
  'secure',
  'account',
  'verify',
  'verification',
  'update',
  'bank',
  'password',
  'confirm',
  'wallet',
  'unlock',
  'suspended',
  'billing',
];

/**
 * Marcas suplantadas con frecuencia y sus dominios registrables legítimos.
 * Si el nombre aparece en el host pero el dominio no es uno de estos -> sospechoso.
 */
export const BRANDS: Record<string, string[]> = {
  paypal: ['paypal.com', 'paypal.me'],
  apple: ['apple.com', 'icloud.com'],
  microsoft: ['microsoft.com', 'live.com', 'office.com', 'outlook.com'],
  office365: ['office.com', 'microsoft.com'],
  google: ['google.com', 'google.es', 'gmail.com', 'youtube.com'],
  amazon: ['amazon.com', 'amazon.es', 'amazon.co.uk'],
  netflix: ['netflix.com'],
  facebook: ['facebook.com', 'fb.com'],
  instagram: ['instagram.com'],
  whatsapp: ['whatsapp.com', 'whatsapp.net'],
  santander: ['bancosantander.es', 'santander.com'],
  bbva: ['bbva.es', 'bbva.com'],
  caixabank: ['caixabank.es', 'caixabank.com'],
  correos: ['correos.es'],
  dhl: ['dhl.com', 'dhl.es'],
  agenciatributaria: ['agenciatributaria.gob.es'],
};
