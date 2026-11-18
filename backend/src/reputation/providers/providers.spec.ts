import { normalizeUrl } from '../../heuristics/url-normalizer.js';
import { CheckStatus } from '../../url-analysis/entities/reputation-check.entity.js';
import { ReputationError, type ReputationConfig } from '../reputation.types.js';
import { SafeBrowsingProvider } from './safe-browsing.provider.js';
import {
  VirusTotalProvider,
  virusTotalUrlId,
  virusTotalWeight,
} from './virustotal.provider.js';

const config: ReputationConfig = {
  virusTotalApiKey: 'vt-key',
  safeBrowsingApiKey: 'gsb-key',
  timeoutMs: 4000,
  cacheHours: 24,
  virusTotalBaseUrl: 'https://vt.test',
  safeBrowsingBaseUrl: 'https://gsb.test',
};
const url = normalizeUrl('http://paypal-login.xyz/verify');
const signal = new AbortController().signal;

const respond = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe('VirusTotalProvider', () => {
  it('pondera según el número de motores', () => {
    expect(virusTotalWeight({ malicious: 0, suspicious: 0 })).toBe(0);
    expect(virusTotalWeight({ malicious: 0, suspicious: 2 })).toBe(20);
    expect(virusTotalWeight({ malicious: 1 })).toBe(20);
    expect(virusTotalWeight({ malicious: 2 })).toBe(40);
    expect(virusTotalWeight({ malicious: 5 })).toBe(60);
    expect(virusTotalWeight({ malicious: 40 })).toBe(60);
  });

  it('usa base64url sin relleno como id de URL', () => {
    expect(virusTotalUrlId('http://a.com/?x=1')).toBe(
      'aHR0cDovL2EuY29tLz94PTE',
    );
  });

  it('consulta el informe con la API key y devuelve el veredicto', async () => {
    const http = respond(200, {
      data: {
        attributes: {
          last_analysis_stats: {
            malicious: 7,
            suspicious: 1,
            harmless: 60,
            undetected: 20,
          },
          reputation: -12,
        },
      },
    });
    const v = await new VirusTotalProvider(config, http).check(url, signal);

    const [calledUrl, init] = http.mock.calls[0];
    expect(calledUrl).toBe(
      `https://vt.test/api/v3/urls/${virusTotalUrlId(url.normalized)}`,
    );
    expect(init.headers['x-apikey']).toBe('vt-key');
    expect(v).toMatchObject({
      malicious: true,
      weight: 60,
      details: { known: true, malicious: 7, engines: 88 },
    });
  });

  it('404: URL nunca analizada -> sin datos y sin puntos', async () => {
    const v = await new VirusTotalProvider(config, respond(404)).check(
      url,
      signal,
    );
    expect(v).toEqual({
      malicious: null,
      weight: 0,
      details: { known: false },
      raw: null,
    });
  });

  it.each([
    [429, CheckStatus.RATE_LIMITED],
    [401, CheckStatus.ERROR],
    [500, CheckStatus.ERROR],
  ])('HTTP %i -> ReputationError(%s)', async (code, status) => {
    const p = new VirusTotalProvider(config, respond(code)).check(url, signal);
    await expect(p).rejects.toBeInstanceOf(ReputationError);
    await expect(p).rejects.toMatchObject({ status });
  });

  it('sin API key no está configurado', () => {
    const p = new VirusTotalProvider(
      { ...config, virusTotalApiKey: '' },
      respond(200),
    );
    expect(p.configured).toBe(false);
  });
});

describe('SafeBrowsingProvider', () => {
  it('envía la URL normalizada y la API key', async () => {
    const http = respond(200, {});
    await new SafeBrowsingProvider(config, http).check(url, signal);

    const [calledUrl, init] = http.mock.calls[0];
    expect(String(calledUrl)).toBe(
      'https://gsb.test/v4/threatMatches:find?key=gsb-key',
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).threatInfo.threatEntries).toEqual([
      { url: url.normalized },
    ]);
  });

  it('sin coincidencias -> limpia', async () => {
    const v = await new SafeBrowsingProvider(config, respond(200, {})).check(
      url,
      signal,
    );
    expect(v).toMatchObject({
      malicious: false,
      weight: 0,
      details: { threatTypes: [] },
    });
  });

  it('con coincidencias -> peligrosa, 70 puntos y tipos sin repetir', async () => {
    const http = respond(200, {
      matches: [
        { threatType: 'SOCIAL_ENGINEERING' },
        { threatType: 'SOCIAL_ENGINEERING' },
      ],
    });
    const v = await new SafeBrowsingProvider(config, http).check(url, signal);
    expect(v).toMatchObject({
      malicious: true,
      weight: 70,
      details: { threatTypes: ['SOCIAL_ENGINEERING'] },
    });
  });

  it('HTTP 403 -> error de API key', async () => {
    await expect(
      new SafeBrowsingProvider(config, respond(403)).check(url, signal),
    ).rejects.toMatchObject({ status: CheckStatus.ERROR });
  });
});
