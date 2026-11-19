import { Module } from '@nestjs/common';
import { IncidentsModule } from '../incidents/incidents.module.js';
import { SafeBrowsingProvider } from './providers/safe-browsing.provider.js';
import { VirusTotalProvider } from './providers/virustotal.provider.js';
import { ReputationController } from './reputation.controller.js';
import { ReputationService } from './reputation.service.js';
import {
  HTTP_FETCH,
  REPUTATION_CONFIG,
  REPUTATION_PROVIDERS,
  type ReputationConfig,
} from './reputation.types.js';

@Module({
  imports: [IncidentsModule],
  controllers: [ReputationController],
  providers: [
    {
      provide: REPUTATION_CONFIG,
      useFactory: (): ReputationConfig => ({
        virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY ?? '',
        safeBrowsingApiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY ?? '',
        timeoutMs: Number(process.env.REPUTATION_TIMEOUT_MS ?? 4000),
        cacheHours: Number(process.env.REPUTATION_CACHE_HOURS ?? 24),
        virusTotalBaseUrl:
          process.env.VIRUSTOTAL_API_URL ?? 'https://www.virustotal.com',
        safeBrowsingBaseUrl:
          process.env.GOOGLE_SAFE_BROWSING_API_URL ??
          'https://safebrowsing.googleapis.com',
      }),
    },
    { provide: HTTP_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    VirusTotalProvider,
    SafeBrowsingProvider,
    {
      provide: REPUTATION_PROVIDERS,
      useFactory: (vt: VirusTotalProvider, gsb: SafeBrowsingProvider) => [
        vt,
        gsb,
      ],
      inject: [VirusTotalProvider, SafeBrowsingProvider],
    },
    ReputationService,
  ],
  exports: [ReputationService],
})
export class ReputationModule {}
