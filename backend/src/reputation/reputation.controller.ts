import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReputationSourceDto } from './dto/reputation.dto.js';
import { ReputationService } from './reputation.service.js';

@ApiTags('Reputación')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get('sources')
  @ApiOperation({
    summary: 'Fuentes de reputación externas y si están configuradas',
  })
  @ApiOkResponse({ type: [ReputationSourceDto] })
  sources(): ReputationSourceDto[] {
    return this.reputation.sources();
  }
}
