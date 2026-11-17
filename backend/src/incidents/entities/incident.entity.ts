import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';

export enum IncidentType {
  API_ERROR = 'api_error',
  API_TIMEOUT = 'api_timeout',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  SYSTEM = 'system',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('incidents')
@Index('IDX_incidents_created', ['createdAt'])
@Index('IDX_incidents_type_created', ['type', 'createdAt'])
// Índice parcial: solo incidencias abiertas (consulta habitual del panel).
@Index('IDX_incidents_open', ['createdAt'], { where: '"resolved" = false' })
export class Incident extends BaseEntity {
  @Column({ type: 'enum', enum: IncidentType, enumName: 'incident_type' })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: IncidentSeverity,
    enumName: 'incident_severity',
    default: IncidentSeverity.LOW,
  })
  severity: IncidentSeverity;

  @Column({ type: 'varchar', length: 64 })
  source: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
