import { CreateDateColumn, PrimaryColumn } from 'typeorm';

/**
 * PK UUIDv7 generada por PostgreSQL 18 (`uuidv7()`): ordenada en el tiempo,
 * por lo que las inserciones son secuenciales en el índice B-tree (menos
 * fragmentación y page splits que UUIDv4) y no expone IDs incrementales.
 */
export abstract class BaseEntity {
  @PrimaryColumn({ type: 'uuid', default: () => 'uuidv7()' })
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
