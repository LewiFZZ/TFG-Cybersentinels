import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
import { UrlAnalysis } from './url-analysis.entity.js';

@Entity('heuristic_results')
@Index('IDX_heuristic_results_analysis', ['analysisId'])
@Index('IDX_heuristic_results_rule', ['ruleCode'])
export class HeuristicResult extends BaseEntity {
  @ManyToOne(() => UrlAnalysis, (a) => a.heuristicResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: Relation<UrlAnalysis>;

  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId: string;

  // Ej.: IP_HOST, URL_SHORTENER, SUSPICIOUS_TLD, BRAND_IMPERSONATION...
  @Column({ name: 'rule_code', type: 'varchar', length: 64 })
  ruleCode: string;

  @Column({ type: 'smallint' })
  weight: number;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;
}
