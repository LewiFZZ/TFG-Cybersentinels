import { RiskClassification } from '../url-analysis/entities/analysis-result.entity.js';
import { classify, HeuristicsService } from './heuristics.service.js';
import { DEFAULT_RULES } from './rules/index.js';

describe('HeuristicsService', () => {
  const service = new HeuristicsService(DEFAULT_RULES);
  const codes = (url: string) =>
    service.analyze(url).triggered.map((r) => r.code);

  describe('URLs legítimas -> seguro', () => {
    it.each([
      'https://www.google.com/',
      'https://www.paypal.com/es/home',
      'https://github.com/nestjs/nest',
      'https://www.bbva.es/personas.html',
      'https://es.wikipedia.org/wiki/Phishing',
      'https://accounts.google.com/signin',
    ])('%s', (url) => {
      const r = service.analyze(url);
      expect(r.classification).toBe(RiskClassification.SAFE);
      expect(codes(url)).not.toContain('BRAND_IMPERSONATION');
    });
  });

  describe('patrones de phishing', () => {
    it('suplantación de marca + TLD sospechoso + palabras clave -> malicioso', () => {
      const r = service.analyze(
        'http://paypal-secure-login-verify.xyz/account/update',
      );
      expect(r.classification).toBe(RiskClassification.MALICIOUS);
      expect(r.triggered.map((t) => t.code)).toEqual(
        expect.arrayContaining([
          'BRAND_IMPERSONATION',
          'SUSPICIOUS_TLD',
          'PHISHING_KEYWORDS',
          'MANY_HYPHENS',
          'NO_HTTPS',
        ]),
      );
    });

    it('marca en subdominio de otro dominio', () => {
      const r = service.analyze(
        'https://www.paypal.com.secure-check.top/login',
      );
      expect(codes(r.url.original)).toContain('BRAND_IMPERSONATION');
      expect(r.classification).not.toBe(RiskClassification.SAFE);
    });

    it('IP + puerto raro + login -> sospechoso o peor', () => {
      const r = service.analyze('http://185.23.45.10:8080/bank/login.php');
      expect(codes(r.url.original)).toEqual(
        expect.arrayContaining([
          'IP_HOST',
          'NON_STANDARD_PORT',
          'PHISHING_KEYWORDS',
        ]),
      );
      expect(r.score).toBeGreaterThanOrEqual(40);
    });

    it('homógrafo con letras cirílicas', () => {
      expect(codes('https://аpple.com/')).toContain('PUNYCODE_DOMAIN');
    });

    it('usuario@ para ocultar el dominio real', () => {
      expect(codes('https://www.bbva.es@evil.example/')).toContain(
        'USERINFO_IN_URL',
      );
    });

    it('acortadores', () => {
      expect(codes('https://bit.ly/3abcd')).toContain('URL_SHORTENER');
    });

    it('redirección embebida y codificación excesiva', () => {
      const c = codes(
        'https://example.com/r?u=https%3A%2F%2Fevil.tk%2F%25%32%30%3F%3D%26',
      );
      expect(c).toEqual(
        expect.arrayContaining(['EMBEDDED_REDIRECT', 'EXCESSIVE_ENCODING']),
      );
    });
  });

  it('limita el score a 100 y ordena reglas por peso', () => {
    const r = service.analyze(
      'http://user@paypal-apple-login-verify-secure.a.b.c.xn--80ak6aa92e.tk:8443//https://x.com/' +
        'a'.repeat(120),
    );
    expect(r.score).toBe(100);
    const weights = r.triggered.map((t) => t.weight);
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
  });

  it('una regla que lanza una excepción se ignora', () => {
    const s = new HeuristicsService([
      {
        code: 'BOOM',
        weight: 50,
        description: '',
        evaluate: () => {
          throw new Error('x');
        },
      },
      { code: 'OK', weight: 20, description: '', evaluate: () => ({}) },
    ]);
    expect(
      s.analyze('https://example.com').triggered.map((t) => t.code),
    ).toEqual(['OK']);
  });

  it.each([
    [0, RiskClassification.SAFE],
    [39, RiskClassification.SAFE],
    [40, RiskClassification.SUSPICIOUS],
    [69, RiskClassification.SUSPICIOUS],
    [70, RiskClassification.MALICIOUS],
    [100, RiskClassification.MALICIOUS],
  ])('classify(%i) = %s', (score, expected) => {
    expect(classify(score)).toBe(expected);
  });
});
