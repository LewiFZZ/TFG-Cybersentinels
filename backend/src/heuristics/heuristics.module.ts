import { Module } from '@nestjs/common';
import { HeuristicsController } from './heuristics.controller.js';
import { HEURISTIC_RULES, HeuristicsService } from './heuristics.service.js';
import { DEFAULT_RULES } from './rules/index.js';

@Module({
  controllers: [HeuristicsController],
  providers: [
    { provide: HEURISTIC_RULES, useValue: DEFAULT_RULES },
    HeuristicsService,
  ],
  exports: [HeuristicsService],
})
export class HeuristicsModule {}
