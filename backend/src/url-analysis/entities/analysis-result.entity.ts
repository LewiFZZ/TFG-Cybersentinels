import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
import { UrlAnalysis } from './url-analysis.entity.js';

export enum RiskClassification {
  SAFE = 'safe', // 0–39
  SUSPICIOUS = 'suspicious', // 40–69
  MALICIOUS = 'malicious', // 70–100
}

@Entity('analysis_results')
@Check('CHK_analysis_results_score', '"score" BETWEEN 0 AND 100')
@Index('IDX_analysis_results_classification', ['classification'])
export class AnalysisResult extends BaseEntity {
  @OneToOne(() => UrlAnalysis, (a) => a.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'analysis_id' })
  analysis: Relation<UrlAnalysis>;

  @Index('UQ_analysis_results_analysis', { unique: true })
  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId: string;

  @Column({
    type: 'enum',
    enum: RiskClassification,
    enumName: 'risk_classification',
  })
  classification: RiskClassification;

  @Column({ type: 'smallint' })
  score: number;

  @Column({ type: 'text', nullable: true })
  summary: string | null;
}
