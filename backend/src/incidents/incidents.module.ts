import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Incident } from './entities/incident.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Incident])],
  exports: [TypeOrmModule],
})
export class IncidentsModule {}
