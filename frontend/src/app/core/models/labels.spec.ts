import { detailPairs } from './labels';

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
