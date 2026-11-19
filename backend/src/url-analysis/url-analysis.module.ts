import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeuristicsModule } from '../heuristics/heuristics.module.js';
import { ReputationModule } from '../reputation/reputation.module.js';
import { UrlAnalysis } from './entities/url-analysis.entity.js';
import { AnalysisResult } from './entities/analysis-result.entity.js';
import { ReputationCheck } from './entities/reputation-check.entity.js';
import { HeuristicResult } from './entities/heuristic-result.entity.js';
import { UrlAnalysisController } from './url-analysis.controller.js';
import { UrlAnalysisService } from './url-analysis.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UrlAnalysis,
      AnalysisResult,
      ReputationCheck,
      HeuristicResult,
    ]),
    HeuristicsModule,
    ReputationModule,
  ],
  controllers: [UrlAnalysisController],
  providers: [UrlAnalysisService],
  exports: [UrlAnalysisService],
})
export class UrlAnalysisModule {}
