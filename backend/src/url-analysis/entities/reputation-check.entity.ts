import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
import { UrlAnalysis } from './url-analysis.entity.js';

export enum ReputationSource {
  VIRUSTOTAL = 'virustotal',
  GOOGLE_SAFE_BROWSING = 'google_safe_browsing',
  PHISHTANK = 'phishtank',
}

export enum CheckStatus {
  OK = 'ok',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  ERROR = 'error',
}

@Entity('reputation_checks')
@Check(
  'CHK_reputation_checks_score',
  '"score" IS NULL OR "score" BETWEEN 0 AND 100',
)
@Index('UQ_reputation_checks_analysis_source', ['analysisId', 'source'], {
  unique: true,
})
export class ReputationCheck extends BaseEntity {
  @ManyToOne(() => UrlAnalysis, (a) => a.reputationChecks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: Relation<UrlAnalysis>;

  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId: string;

  @Column({
    type: 'enum',
    enum: ReputationSource,
    enumName: 'reputation_source',
  })
  source: ReputationSource;

  @Column({ type: 'enum', enum: CheckStatus, enumName: 'check_status' })
  status: CheckStatus;

  @Column({ type: 'boolean', nullable: true })
  malicious: boolean | null;

  // Puntuación normalizada 0–100 de esta fuente.
  @Column({ type: 'smallint', nullable: true })
  score: number | null;

  // Respuesta original de la API (JSONB: binario, indexable con GIN si se necesita).
  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number | null;
}
