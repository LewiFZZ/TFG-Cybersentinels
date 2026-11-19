import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HeuristicsService } from '../heuristics/heuristics.service.js';
import type {
  DailyStatDto,
  RecentThreatDto,
  StatsResponseDto,
  StatsTotalsDto,
  TopDomainDto,
} from './dto/stats.dto.js';

/** Inicio (00:00 UTC) del primer día de la ventana. */
export function windowStart(days: number, now = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (days - 1),
    ),
  );
}

@Injectable()
export class StatsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly heuristics: HeuristicsService,
  ) {}

  async getStats(days: number): Promise<StatsResponseDto> {
    const since = windowStart(days);
    const q = <T>(sql: string, params: unknown[]) =>
      this.dataSource.query<T>(sql, params);

    // Todas las consultas son parametrizadas y se lanzan en paralelo.
    const [totals, daily, rules, domains, threats] = await Promise.all([
      q<StatsTotalsDto[]>(
        `SELECT count(a.id)::int                                             AS "analyses",
                count(r.id) FILTER (WHERE r.classification = 'safe')::int       AS "safe",
                count(r.id) FILTER (WHERE r.classification = 'suspicious')::int AS "suspicious",
                count(r.id) FILTER (WHERE r.classification = 'malicious')::int  AS "malicious",
                coalesce(round(avg(a.score)), 0)::int                          AS "averageScore"
           FROM url_analyses a
           LEFT JOIN analysis_results r ON r.analysis_id = a.id
          WHERE a.created_at >= $1`,
        [since],
      ),

      // generate_series rellena con 0 los días sin análisis.
      q<DailyStatDto[]>(
        `SELECT to_char(d.day, 'YYYY-MM-DD')                                     AS "date",
                count(a.id)::int                                                 AS "total",
                count(r.id) FILTER (WHERE r.classification = 'safe')::int        AS "safe",
                count(r.id) FILTER (WHERE r.classification = 'suspicious')::int  AS "suspicious",
                count(r.id) FILTER (WHERE r.classification = 'malicious')::int   AS "malicious"
           FROM generate_series($1::timestamptz AT TIME ZONE 'UTC',
                                (now() AT TIME ZONE 'UTC')::date,
                                interval '1 day') AS d(day)
           LEFT JOIN url_analyses a
                  ON a.created_at >= d.day AT TIME ZONE 'UTC'
                 AND a.created_at <  (d.day + interval '1 day') AT TIME ZONE 'UTC'
           LEFT JOIN analysis_results r ON r.analysis_id = a.id
          GROUP BY d.day
          ORDER BY d.day`,
        [since],
      ),

      q<{ code: string; count: number }[]>(
        `SELECT h.rule_code AS "code", count(*)::int AS "count"
           FROM heuristic_results h
          WHERE h.created_at >= $1
          GROUP BY h.rule_code
          ORDER BY count(*) DESC, h.rule_code
          LIMIT 10`,
        [since],
      ),

      q<TopDomainDto[]>(
        `SELECT a.domain AS "domain", count(*)::int AS "count",
                coalesce(max(a.score), 0)::int AS "maxScore"
           FROM url_analyses a
          WHERE a.created_at >= $1
          GROUP BY a.domain
          ORDER BY count(*) DESC, max(a.score) DESC, a.domain
          LIMIT 10`,
        [since],
      ),

      q<RecentThreatDto[]>(
        `SELECT a.id, a.url, a.score, r.classification, a.created_at AS "createdAt"
           FROM url_analyses a
           JOIN analysis_results r ON r.analysis_id = a.id
          WHERE r.classification <> 'safe' AND a.created_at >= $1
          ORDER BY a.created_at DESC
          LIMIT 5`,
        [since],
      ),
    ]);

    return {
      days,
      since: since.toISOString(),
      totals: totals[0],
      daily,
      topRules: rules.map((r) => ({
        ...r,
        description: this.heuristics.describe(r.code),
      })),
      topDomains: domains,
      recentThreats: threats,
    };
  }
}
