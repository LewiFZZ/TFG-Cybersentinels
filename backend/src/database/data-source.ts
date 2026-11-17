import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config.js';

// DataSource usado por la CLI de TypeORM (generar/ejecutar migraciones).
// Se ejecuta sobre el código compilado en dist/ con `node --env-file`.
export default new DataSource(buildTypeOrmOptions());
