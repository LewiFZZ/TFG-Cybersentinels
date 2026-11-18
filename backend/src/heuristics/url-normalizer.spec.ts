import { InvalidUrlError, normalizeUrl } from './url-normalizer.js';

describe('normalizeUrl', () => {
  it('canonicaliza esquema, host, puerto por defecto, fragmento y query', () => {
    const a = normalizeUrl('HTTPS://WWW.Example.COM:443/path?b=2&a=1#frag');
    const b = normalizeUrl('https://www.example.com/path?a=1&b=2');
    expect(a.normalized).toBe('https://www.example.com/path?a=1&b=2');
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('añade http:// si falta el esquema', () => {
    expect(normalizeUrl('example.com/login').normalized).toBe(
      'http://example.com/login',
    );
  });

  it('calcula dominio registrable y TLD, incluidos sufijos compuestos', () => {
    expect(normalizeUrl('https://a.b.paypal.com').registrableDomain).toBe(
      'paypal.com',
    );
    expect(normalizeUrl('https://shop.amazon.co.uk').registrableDomain).toBe(
      'amazon.co.uk',
    );
    expect(normalizeUrl('https://x.top').tld).toBe('top');
  });

  it('detecta IPs v4 y v6', () => {
    expect(normalizeUrl('http://192.168.1.10/a').isIp).toBe(true);
    expect(normalizeUrl('http://[::1]/a').isIp).toBe(true);
  });

  it('convierte dominios internacionalizados a punycode', () => {
    expect(normalizeUrl('https://pаypal.com').hostname).toMatch(/^xn--/); // "а" cirílica
  });

  it.each([
    ['', 'vacía'],
    ['ftp://example.com', 'protocolo'],
    ['javascript:alert(1)', 'protocolo'],
    ['http://localhost', 'sin dominio completo'],
    ['http://', 'formato'],
    ['https://example.com/' + 'a'.repeat(2100), 'demasiado larga'],
  ])('rechaza %j (%s)', (input) => {
    expect(() => normalizeUrl(input)).toThrow(InvalidUrlError);
  });
});
