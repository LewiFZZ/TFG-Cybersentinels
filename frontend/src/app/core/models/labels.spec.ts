import { ReputationCheck } from '../api/api.models';
import { detailPairs, reputationText, virusTotalLink } from './labels';

describe('detailPairs', () => {
  it('traduce la evidencia de las reglas a texto legible', () => {
    expect(detailPairs({ brand: 'paypal', tld: 'xyz', keywords: ['login', 'verify'] })).toEqual([
      ['Marca', 'paypal'],
      ['Extensión', '.xyz'],
      ['Palabras', 'login, verify'],
    ]);
  });

  it('devuelve una lista vacía si no hay detalles', () => {
    expect(detailPairs(null)).toEqual([]);
  });
});

describe('reputationText', () => {
  const base: ReputationCheck = {
    source: 'virustotal',
    status: 'ok',
    malicious: true,
    weight: 60,
    details: null,
    responseTimeMs: 300,
    cached: false,
  };

  it('resume VirusTotal con los motores que la detectan', () => {
    const check = { ...base, details: { known: true, malicious: 7, engines: 92 } };
    expect(reputationText(check)).toBe('7 de 92 motores la marcan como maliciosa');
  });

  it('indica cuando VirusTotal no conoce la URL', () => {
    expect(reputationText({ ...base, malicious: false, details: { known: false } })).toContain('no tiene informes');
  });

  it('traduce los tipos de amenaza de Safe Browsing', () => {
    const check: ReputationCheck = {
      ...base,
      source: 'google_safe_browsing',
      details: { threatTypes: ['SOCIAL_ENGINEERING'] },
    };
    expect(reputationText(check)).toBe('En la lista de Google: ingeniería social (phishing)');
  });

  it('muestra el motivo cuando la fuente falla', () => {
    const check: ReputationCheck = {
      ...base,
      status: 'timeout',
      malicious: null,
      details: { error: 'VirusTotal: sin respuesta en 4000 ms' },
    };
    expect(reputationText(check)).toBe('VirusTotal: sin respuesta en 4000 ms');
  });
});

describe('virusTotalLink', () => {
  const check: ReputationCheck = {
    source: 'virustotal',
    status: 'ok',
    malicious: false,
    weight: 0,
    details: null,
    responseTimeMs: null,
    cached: false,
  };

  it('solo acepta enlaces a virustotal.com', () => {
    expect(virusTotalLink({ ...check, details: { link: 'https://www.virustotal.com/gui/url/abc' } })).toBe(
      'https://www.virustotal.com/gui/url/abc',
    );
    expect(virusTotalLink({ ...check, details: { link: 'https://evil.example/phish' } })).toBeNull();
  });
});
