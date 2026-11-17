import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { AnalysisResult } from './analysis-result.entity.js';
import { ReputationCheck } from './reputation-check.entity.js';
import { HeuristicResult } from './heuristic-result.entity.js';

export enum AnalysisStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  PARTIAL = 'partial', // alguna API externa falló: resultado parcial
  FAILED = 'failed',
}

@Entity('url_analyses')
@Check('CHK_url_analyses_score', '"score" IS NULL OR "score" BETWEEN 0 AND 100')
// Historial del usuario ("últimos N análisis"): índice compuesto ordenado.
@Index('IDX_url_analyses_user_created', ['userId', 'createdAt'])
// Caché de resultados: buscar el análisis más reciente de la misma URL.
@Index('IDX_url_analyses_hash_created', ['urlHash', 'createdAt'])
@Index('IDX_url_analyses_created', ['createdAt'])
export class UrlAnalysis extends BaseEntity {
  // Nullable: el análisis anónimo está permitido. Borrado en cascada (RGPD).
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'normalized_url', type: 'text' })
  normalizedUrl: string;

  // SHA-256 hex de normalized_url: clave de búsqueda compacta e indexable.
  @Column({ name: 'url_hash', type: 'char', length: 64 })
  urlHash: string;

  @Column({ type: 'varchar', length: 253 })
  domain: string;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    enumName: 'analysis_status',
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({ type: 'smallint', nullable: true })
  score: number | null;

  @Column({ name: 'duration_ms', type: 'integer', nullable: true })
  durationMs: number | null;

  @OneToOne(() => AnalysisResult, (r) => r.analysis)
  result: Relation<AnalysisResult>;

  @OneToMany(() => ReputationCheck, (c) => c.analysis)
  reputationChecks: Relation<ReputationCheck[]>;

  @OneToMany(() => HeuristicResult, (h) => h.analysis)
  heuristicResults: Relation<HeuristicResult[]>;
}
