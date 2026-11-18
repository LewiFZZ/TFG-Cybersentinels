import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AnalysisPageDto,
  AnalysisResponseDto,
} from './dto/analysis-response.dto.js';
import {
  ClearHistoryQuery,
  ClearHistoryResponseDto,
} from './dto/clear-history.query.js';
import { CreateAnalysisDto } from './dto/create-analysis.dto.js';
import { ListAnalysesQuery } from './dto/list-analyses.query.js';
import { UrlAnalysisService } from './url-analysis.service.js';

@ApiTags('Análisis de URLs')
@Controller('analyses')
export class UrlAnalysisController {
  constructor(private readonly service: UrlAnalysisService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Analiza una URL con la heurística propia y guarda el resultado',
  })
  @ApiCreatedResponse({ type: AnalysisResponseDto })
  @ApiBadRequestResponse({
    description: 'URL vacía, mal formada o no http/https',
  })
  @ApiTooManyRequestsResponse({
    description: 'Límite de análisis por minuto superado',
  })
  create(@Body() dto: CreateAnalysisDto): Promise<AnalysisResponseDto> {
    return this.service.analyze(dto.url);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de análisis (más recientes primero)' })
  @ApiOkResponse({ type: AnalysisPageDto })
  list(@Query() q: ListAnalysesQuery): Promise<AnalysisPageDto> {
    return this.service.findRecent(q.limit, q.offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un análisis' })
  @ApiOkResponse({ type: AnalysisResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AnalysisResponseDto> {
    return this.service.findOne(id);
  }

  @Delete()
  @ApiOperation({
    summary: 'Vacía todo el historial (requiere ?confirm=true)',
  })
  @ApiOkResponse({ type: ClearHistoryResponseDto })
  @ApiBadRequestResponse({ description: 'Falta ?confirm=true' })
  async clear(
    @Query() _q: ClearHistoryQuery,
  ): Promise<ClearHistoryResponseDto> {
    return { deleted: await this.service.clear() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borra un análisis' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
