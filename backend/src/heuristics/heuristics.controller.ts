import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HeuristicsService } from './heuristics.service.js';

@ApiTags('Heurística')
@Controller('heuristics')
export class HeuristicsController {
  constructor(private readonly heuristics: HeuristicsService) {}

  @Get('rules')
  @ApiOperation({ summary: 'Catálogo de reglas heurísticas y sus pesos' })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'IP_HOST' },
          weight: { type: 'integer', example: 30 },
          description: { type: 'string' },
        },
      },
    },
  })
  rules() {
    return this.heuristics.listRules();
  }
}
