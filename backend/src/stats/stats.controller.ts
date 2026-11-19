import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsQuery, StatsResponseDto } from './dto/stats.dto.js';
import { StatsService } from './stats.service.js';

@ApiTags('Dashboard')
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Estadísticas para el dashboard: totales, evolución diaria, reglas y dominios',
  })
  @ApiOkResponse({ type: StatsResponseDto })
  get(@Query() q: StatsQuery): Promise<StatsResponseDto> {
    return this.stats.getStats(q.days);
  }
}
