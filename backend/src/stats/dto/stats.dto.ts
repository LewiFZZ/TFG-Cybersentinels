import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { RiskClassification } from '../../url-analysis/entities/analysis-result.entity.js';

export class StatsQuery {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 365,
    default: 30,
    description: 'Ventana de días (incluye hoy)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days: number = 30;
}

export class StatsTotalsDto {
  @ApiProperty({ example: 120 }) analyses: number;
  @ApiProperty({ example: 80 }) safe: number;
  @ApiProperty({ example: 25 }) suspicious: number;
  @ApiProperty({ example: 15 }) malicious: number;
  @ApiProperty({ example: 27, description: 'Score medio (0–100)' })
  averageScore: number;
}

export class DailyStatDto {
  @ApiProperty({ example: '2026-11-17' }) date: string;
  @ApiProperty() total: number;
  @ApiProperty() safe: number;
  @ApiProperty() suspicious: number;
  @ApiProperty() malicious: number;
}

export class TopRuleDto {
  @ApiProperty({ example: 'PHISHING_KEYWORDS' }) code: string;
  @ApiProperty() description: string;
  @ApiProperty({ example: 42 }) count: number;
}

export class TopDomainDto {
  @ApiProperty({ example: 'paypal-login.xyz' }) domain: string;
  @ApiProperty({ example: 3 }) count: number;
  @ApiProperty({ example: 80 }) maxScore: number;
}

export class RecentThreatDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() url: string;
  @ApiProperty() score: number;
  @ApiProperty({ enum: RiskClassification, enumName: 'RiskClassification' })
  classification: RiskClassification;
  @ApiProperty() createdAt: Date;
}

export class StatsResponseDto {
  @ApiProperty({ example: 30 }) days: number;
  @ApiProperty({ example: '2026-10-19T00:00:00.000Z' }) since: string;
  @ApiProperty({ type: StatsTotalsDto }) totals: StatsTotalsDto;
  @ApiProperty({ type: [DailyStatDto] }) daily: DailyStatDto[];
  @ApiProperty({ type: [TopRuleDto] }) topRules: TopRuleDto[];
  @ApiProperty({ type: [TopDomainDto] }) topDomains: TopDomainDto[];
  @ApiProperty({
    type: [RecentThreatDto],
    description: 'Últimos 5 análisis sospechosos o maliciosos',
  })
  recentThreats: RecentThreatDto[];
}
