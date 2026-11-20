import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { toUserMessage } from './api-error';

const httpError = (status: number, error: unknown = null, headers?: HttpHeaders) =>
  new HttpErrorResponse({ status, error, headers });

describe('toUserMessage', () => {
  it('une los mensajes cuando la API devuelve una lista (ValidationPipe)', () => {
    const err = httpError(400, { statusCode: 400, error: 'Bad Request', message: ['a', 'b'] });
    expect(toUserMessage(err)).toBe('a. b');
  });

  it('usa el mensaje de texto del backend', () => {
    const err = httpError(400, { message: 'Solo se admiten URLs http o https' });
    expect(toUserMessage(err)).toBe('Solo se admiten URLs http o https');
  });

  it('indica cuántos segundos esperar con un 429 y Retry-After', () => {
    const err = httpError(429, null, new HttpHeaders({ 'Retry-After': '42' }));
    expect(toUserMessage(err)).toContain('42 s');
  });

  it('distingue servidor apagado, 404 y 503', () => {
    expect(toUserMessage(httpError(0))).toContain('No se puede conectar');
    expect(toUserMessage(httpError(404))).toContain('no existe');
    expect(toUserMessage(httpError(503))).toContain('no está disponible');
  });

  it('no revienta con errores que no son HTTP', () => {
    expect(toUserMessage(new Error('x'))).toContain('inesperado');
  });
});
