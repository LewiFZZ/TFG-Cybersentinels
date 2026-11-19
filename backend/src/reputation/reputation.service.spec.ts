import type { DataSource, Repository } from 'typeorm';
import { normalizeUrl } from '../heuristics/url-normalizer.js';
import {
  Incident,
  IncidentType,
} from '../incidents/entities/incident.entity.js';
import {
  CheckStatus,
  ReputationSource,
} from '../url-analysis/entities/reputation-check.entity.js';
import { ReputationService } from './reputation.service.js';
import {
  ReputationError,
  type ReputationConfig,
  type ReputationProvider,
} from './reputation.types.js';

const config: ReputationConfig = {
  virusTotalApiKey: 'x',
  safeBrowsingApiKey: 'y',
  timeoutMs: 30,
  cacheHours: 24,
  virusTotalBaseUrl: '',
  safeBrowsingBaseUrl: '',
};
const url = normalizeUrl('http://paypal-login.xyz/verify');

/** Devuelve el proveedor falso y su espía de `check` por separado. */
function provider(
  source: ReputationSource,
  impl: ReputationProvider['check'],
  configured = true,
): ReputationProvider & { spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn(impl);
  return { source, label: source, configured, check: spy, spy };
}

function setup(providers: ReputationProvider[], cachedRows: unknown[] = []) {
  const query = vi.fn().mockResolvedValue(cachedRows);
  const insert = vi.fn().mockResolvedValue({});
  const service = new ReputationService(
    providers,
    config,
    { query } as unknown as DataSource,
    { insert } as unknown as Repository<Incident>,
  );
  return { service, query, insert };
}

const clean = async () => ({
  malicious: false,
  weight: 0,
  details: null,
  raw: {},
});

describe('ReputationService', () => {
  it('sin fuentes configuradas no consulta nada', async () => {
    const vt = provider(ReputationSource.VIRUSTOTAL, clean, false);
    const { service, query } = setup([vt]);
    await expect(service.check(url)).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
    expect(vt.spy).not.toHaveBeenCalled();
  });

  it('un fallo no rompe el análisis y se registra como incidencia', async () => {
    const vt = provider(ReputationSource.VIRUSTOTAL, async () => {
      throw new ReputationError(CheckStatus.RATE_LIMITED, 'cuota agotada');
    });
    const gsb = provider(ReputationSource.GOOGLE_SAFE_BROWSING, async () => ({
      malicious: true,
      weight: 70,
      details: { threatTypes: ['SOCIAL_ENGINEERING'] },
      raw: {},
    }));
    const { service, insert } = setup([vt, gsb]);

    const out = await service.check(url);
    expect(out.map((o) => [o.source, o.status, o.weight])).toEqual([
      [ReputationSource.VIRUSTOTAL, CheckStatus.RATE_LIMITED, 0],
      [ReputationSource.GOOGLE_SAFE_BROWSING, CheckStatus.OK, 70],
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
    const [incident] = insert.mock.calls[0][0];
    expect(incident).toMatchObject({
      type: IncidentType.RATE_LIMIT,
      source: ReputationSource.VIRUSTOTAL,
      metadata: { domain: 'paypal-login.xyz' },
    });
  });

  it('corta una API lenta con timeout', async () => {
    const slow = provider(
      ReputationSource.VIRUSTOTAL,
      (_u, signal) =>
        new Promise((_res, rej) =>
          signal.addEventListener('abort', () => rej(signal.reason)),
        ),
    );
    const { service, insert } = setup([slow]);
    const [o] = await service.check(url);
    expect(o.status).toBe(CheckStatus.TIMEOUT);
    expect(o.weight).toBe(0);
    expect(insert.mock.calls[0][0][0].type).toBe(IncidentType.API_TIMEOUT);
  });

  it('reutiliza el resultado en caché sin llamar a la API', async () => {
    const vt = provider(ReputationSource.VIRUSTOTAL, clean);
    const { service, query } = setup(
      [vt],
      [
        {
          source: ReputationSource.VIRUSTOTAL,
          malicious: true,
          score: 40,
          raw_response: {
            details: { malicious: 3 },
            response: {},
            cached: false,
          },
          response_time_ms: 250,
        },
      ],
    );
    const [o] = await service.check(url);
    expect(vt.spy).not.toHaveBeenCalled();
    expect(o).toMatchObject({ cached: true, weight: 40, malicious: true });
    expect(query.mock.calls[0][1]).toEqual([
      url.hash,
      [ReputationSource.VIRUSTOTAL],
      24,
    ]);
  });
});
