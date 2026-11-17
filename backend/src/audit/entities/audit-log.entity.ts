import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('audit_logs')
@Index('IDX_audit_logs_created', ['createdAt'])
@Index('IDX_audit_logs_user_created', ['userId', 'createdAt'])
@Index('IDX_audit_logs_action_created', ['action', 'createdAt'])
export class AuditLog extends BaseEntity {
  // Se conserva el log aunque se borre el usuario (sin datos personales).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  // Ej.: ANALYSIS_CREATED, LOGIN_SUCCESS, LOGIN_FAILED, USER_DELETED...
  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'inet', nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
