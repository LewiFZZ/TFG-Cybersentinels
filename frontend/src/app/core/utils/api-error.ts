import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../api/api.models';

/**
 * Convierte cualquier error de la API en un mensaje claro en castellano.
 * Ojo: el campo `message` del backend puede ser un texto o una lista (ValidationPipe).
 */
export function toUserMessage(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Ha ocurrido un error inesperado.';

  switch (err.status) {
    case 0:
      return 'No se puede conectar con el servidor. Comprueba que la API está en marcha.';
    case 404:
      return 'Este análisis no existe o se ha borrado.';
    case 429: {
      const retry = Number(err.headers.get('Retry-After'));
      return retry > 0
        ? `Demasiados análisis seguidos. Vuelve a intentarlo en ${retry} s.`
        : 'Demasiados análisis seguidos. Espera un minuto.';
    }
    case 503:
      return 'El servicio no está disponible ahora mismo (base de datos caída).';
  }

  const message = (err.error as Partial<ApiError> | null)?.message;
  if (Array.isArray(message)) return message.join('. ');
  if (typeof message === 'string' && message) return message;
  return err.status >= 500 ? 'Error interno del servidor.' : 'No se ha podido completar la operación.';
}
