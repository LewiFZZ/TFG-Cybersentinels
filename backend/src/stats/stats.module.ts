import { Module } from '@nestjs/common';
import { HeuristicsModule } from '../heuristics/heuristics.module.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [HeuristicsModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
