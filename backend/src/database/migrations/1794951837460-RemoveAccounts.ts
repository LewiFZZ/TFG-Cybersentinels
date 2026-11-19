import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * URLSentinel pasa a distribuirse como herramienta local sin cuentas:
 * se eliminan usuarios y auditoría, y los análisis dejan de tener propietario.
 * Se añade un índice por dominio para el dashboard.
 */
export class RemoveAccounts1794951837460 implements MigrationInterface {
  name = 'RemoveAccounts1794951837460';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // url_analyses: fuera la relación con users
    await queryRunner.query(
      `ALTER TABLE "url_analyses" DROP CONSTRAINT "FK_de4c446c0255c2da15f3168992e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_url_analyses_user_created"`,
    );
    await queryRunner.query(`ALTER TABLE "url_analyses" DROP COLUMN "user_id"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_url_analyses_domain" ON "url_analyses" ("domain")`,
    );

    // audit_logs y users (TypeORM no genera los DROP de tablas sin entidad)
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(254) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" "public"."user_role" NOT NULL DEFAULT 'user', "status" "public"."user_status" NOT NULL DEFAULT 'active', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "action" character varying(64) NOT NULL, "ip" inet, "user_agent" character varying(512), "metadata" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action_created" ON "audit_logs" ("action", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_user_created" ON "audit_logs" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created" ON "audit_logs" ("created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`DROP INDEX "public"."IDX_url_analyses_domain"`);
    await queryRunner.query(`ALTER TABLE "url_analyses" ADD "user_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_url_analyses_user_created" ON "url_analyses" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_analyses" ADD CONSTRAINT "FK_de4c446c0255c2da15f3168992e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
