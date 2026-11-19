import {
  Check,
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
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
// Historial y gráficas por fecha ("últimos N análisis", análisis por día).
@Index('IDX_url_analyses_created', ['createdAt'])
// Caché de resultados: buscar el análisis más reciente de la misma URL.
@Index('IDX_url_analyses_hash_created', ['urlHash', 'createdAt'])
// Dashboard: dominios más analizados.
@Index('IDX_url_analyses_domain', ['domain'])
export class UrlAnalysis extends BaseEntity {
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
