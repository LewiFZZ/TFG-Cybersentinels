import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle()
  @Get('health')
  async health() {
    const result = await this.appService.health();
    if (result.status !== 'ok') throw new ServiceUnavailableException(result);
    return result;
  }
}
