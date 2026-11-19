import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** Assets de Angular con hash en el nombre (ej. main-ABC12345.js). */
const HASHED_ASSET = /-[A-Z0-9]{8}\.(js|css)$/;

/**
 * Sirve el frontend Angular compilado desde el mismo proceso que la API.
 * - `/api/*` queda excluido (lo atienden los controladores).
 * - Rutas desconocidas -> index.html (navegación de la SPA).
 * - Si no existe la carpeta (modo desarrollo con `ng serve`), no se registra.
 */
@Module({})
export class FrontendModule {
  static register(): DynamicModule {
    const rootPath = resolve(
      process.env.STATIC_DIR ?? join(import.meta.dirname, '..', '..', 'public'),
    );

    if (!existsSync(join(rootPath, 'index.html'))) {
      new Logger(FrontendModule.name).log(
        `Sin frontend compilado en ${rootPath}: solo se sirve la API`,
      );
      return { module: FrontendModule };
    }

    return {
      module: FrontendModule,
      imports: [
        ServeStaticModule.forRoot({
          rootPath,
          exclude: ['/api/{*path}'],
          serveStaticOptions: {
            index: 'index.html',
            setHeaders: (
              res: { setHeader(k: string, v: string): void },
              path: string,
            ) => {
              res.setHeader(
                'Cache-Control',
                HASHED_ASSET.test(path)
                  ? 'public, max-age=31536000, immutable'
                  : 'no-cache',
              );
            },
          },
        }),
      ],
    };
  }
}
