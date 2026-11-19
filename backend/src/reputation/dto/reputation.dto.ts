import { ApiProperty } from '@nestjs/swagger';
import {
  CheckStatus,
  ReputationSource,
} from '../../url-analysis/entities/reputation-check.entity.js';

export class ReputationSourceDto {
  @ApiProperty({ enum: ReputationSource, enumName: 'ReputationSource' })
  source: ReputationSource;

  @ApiProperty({ example: 'VirusTotal' })
  name: string;

  @ApiProperty({
    example: true,
    description: 'false si no hay API key: la fuente no se consulta',
  })
  configured: boolean;
}

export class ReputationCheckDto {
  @ApiProperty({ enum: ReputationSource, enumName: 'ReputationSource' })
  source: ReputationSource;

  @ApiProperty({ enum: CheckStatus, enumName: 'CheckStatus' })
  status: CheckStatus;

  @ApiProperty({
    nullable: true,
    description: 'true = peligrosa, false = limpia, null = sin datos o error',
  })
  malicious: boolean | null;

  @ApiProperty({ example: 60, description: 'Puntos que suma al score' })
  weight: number;

  @ApiProperty({
    type: Object,
    nullable: true,
    example: { known: true, malicious: 7, suspicious: 1, engines: 92 },
  })
  details: Record<string, unknown> | null;

  @ApiProperty({ nullable: true, example: 312 })
  responseTimeMs: number | null;

  @ApiProperty({
    description:
      'Resultado reutilizado de un análisis reciente de la misma URL',
  })
  cached: boolean;
}
