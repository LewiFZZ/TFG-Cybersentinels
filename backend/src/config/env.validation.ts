import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGIN: Joi.string().default('http://localhost:4200'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_POOL_MAX: Joi.number().integer().min(1).default(10),
  DB_SSL: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().integer().min(1).default(60),
  // Saltos de proxy inverso de confianza (0 = expuesto directamente).
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),
  // Carpeta con el frontend Angular compilado (por defecto ./public).
  STATIC_DIR: Joi.string().optional(),

  VIRUSTOTAL_API_KEY: Joi.string().allow('').optional(),
  GOOGLE_SAFE_BROWSING_API_KEY: Joi.string().allow('').optional(),
  // Reputación externa: tiempo máximo por API y horas de caché por URL.
  REPUTATION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(500)
    .max(10000)
    .default(4000),
  REPUTATION_CACHE_HOURS: Joi.number().integer().min(0).default(24),
  // Solo para pruebas: URL base alternativa de cada API.
  VIRUSTOTAL_API_URL: Joi.string().uri().optional(),
  GOOGLE_SAFE_BROWSING_API_URL: Joi.string().uri().optional(),
  PHISHTANK_API_KEY: Joi.string().allow('').optional(),
});
