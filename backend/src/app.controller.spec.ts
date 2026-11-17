import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const query = vi.fn();

  beforeEach(async () => {
    query.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: DataSource, useValue: { query } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('health devuelve ok si la BD responde', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);
    await expect(appController.health()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  it('health lanza 503 si la BD no responde', async () => {
    query.mockRejectedValue(new Error('down'));
    await expect(appController.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
