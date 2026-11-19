import { windowStart } from './stats.service.js';

describe('windowStart', () => {
  const now = new Date('2026-11-17T21:30:00Z');

  it('days=1 empieza hoy a las 00:00 UTC', () => {
    expect(windowStart(1, now).toISOString()).toBe('2026-11-17T00:00:00.000Z');
  });

  it('days=30 incluye hoy y los 29 días anteriores', () => {
    expect(windowStart(30, now).toISOString()).toBe('2026-10-19T00:00:00.000Z');
  });

  it('cruza correctamente el cambio de año', () => {
    expect(
      windowStart(10, new Date('2027-01-03T08:00:00Z')).toISOString(),
    ).toBe('2026-12-25T00:00:00.000Z');
  });
});
