import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlAnalysis } from './entities/url-analysis.entity.js';
import { AnalysisResult } from './entities/analysis-result.entity.js';
import { ReputationCheck } from './entities/reputation-check.entity.js';
import { HeuristicResult } from './entities/heuristic-result.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UrlAnalysis,
      AnalysisResult,
      ReputationCheck,
      HeuristicResult,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class UrlAnalysisModule {}
