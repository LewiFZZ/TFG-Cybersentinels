import type { DataSourceOptions } from 'typeorm';

const bool = (v: string | undefined) => v === 'true' || v === '1';

/**
 * Opciones compartidas entre la app Nest y la CLI de TypeORM (migraciones).
 * - synchronize siempre desactivado: el esquema solo cambia vía migraciones.
 * - Pool de conexiones acotado y timeouts para no saturar Postgres.
 */
export function buildTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: bool(env.DB_SSL) ? { rejectUnauthorized: false } : false,
    applicationName: 'urlsentinel-backend',
    entities: [import.meta.dirname + '/../**/*.entity.js'],
    migrations: [import.meta.dirname + '/migrations/*.js'],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: bool(env.DB_LOGGING) ? 'all' : ['error', 'warn', 'migration'],
    maxQueryExecutionTime: 500, // avisa de consultas lentas (>500 ms)
    extra: {
      max: Number(env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
      idle_in_transaction_session_timeout: 15_000,
    },
  };
}
