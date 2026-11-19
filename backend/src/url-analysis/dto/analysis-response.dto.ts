import { ApiProperty } from '@nestjs/swagger';
import { ReputationCheckDto } from '../../reputation/dto/reputation.dto.js';
import { RiskClassification } from '../entities/analysis-result.entity.js';
import { AnalysisStatus } from '../entities/url-analysis.entity.js';

export class TriggeredRuleDto {
  @ApiProperty({ example: 'BRAND_IMPERSONATION' })
  code: string;

  @ApiProperty({ example: 35 })
  weight: number;

  @ApiProperty({
    example: 'El dominio menciona una marca conocida pero no pertenece a ella',
  })
  description: string;

  @ApiProperty({
    type: Object,
    nullable: true,
    example: { brand: 'paypal', domain: 'paypal-login.xyz' },
  })
  details: Record<string, unknown> | null;
}

export class ScoreBreakdownDto {
  @ApiProperty({ example: 50, description: 'Puntos de la heurística propia' })
  heuristics: number;

  @ApiProperty({
    example: 60,
    description: 'Puntos de las fuentes de reputación externas',
  })
  reputation: number;
}

export class AnalysisResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'paypal-login.xyz/account' })
  url: string;

  @ApiProperty({ example: 'http://paypal-login.xyz/account' })
  normalizedUrl: string;

  @ApiProperty({ example: 'paypal-login.xyz' })
  domain: string;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    example: 100,
    description: 'min(100, heurística + reputación)',
  })
  score: number;

  @ApiProperty({ type: ScoreBreakdownDto })
  scoreBreakdown: ScoreBreakdownDto;

  @ApiProperty({ enum: RiskClassification, enumName: 'RiskClassification' })
  classification: RiskClassification;

  @ApiProperty({
    enum: AnalysisStatus,
    enumName: 'AnalysisStatus',
    description: "'partial' si alguna fuente externa no respondió",
  })
  status: AnalysisStatus;

  @ApiProperty({
    example: 'Malicioso: 4 indicadores (BRAND_IMPERSONATION, ...)',
  })
  summary: string | null;

  @ApiProperty({ type: [TriggeredRuleDto] })
  heuristics: TriggeredRuleDto[];

  @ApiProperty({
    type: [ReputationCheckDto],
    description: 'Vacío si no hay API keys configuradas',
  })
  reputation: ReputationCheckDto[];

  @ApiProperty({ example: 3, description: 'Tiempo de análisis en ms' })
  durationMs: number | null;

  @ApiProperty()
  createdAt: Date;
}

export class AnalysisListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  domain: string;

  @ApiProperty()
  score: number | null;

  @ApiProperty({
    enum: RiskClassification,
    enumName: 'RiskClassification',
    nullable: true,
  })
  classification: RiskClassification | null;

  @ApiProperty({ enum: AnalysisStatus, enumName: 'AnalysisStatus' })
  status: AnalysisStatus;

  @ApiProperty()
  createdAt: Date;
}

export class AnalysisPageDto {
  @ApiProperty({ type: [AnalysisListItemDto] })
  items: AnalysisListItemDto[];

  @ApiProperty({ example: 137 })
  total: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}
