import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794948829666 implements MigrationInterface {
  name = 'InitialSchema1794948829666';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `CREATE UNIQUE INDEX "UQ_users_email" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "action" character varying(64) NOT NULL, "ip" inet, "user_agent" character varying(512), "metadata" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action_created" ON "audit_logs"  ("action", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_user_created" ON "audit_logs"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created" ON "audit_logs"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_type" AS ENUM('api_error', 'api_timeout', 'rate_limit', 'security', 'system')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."incident_severity" AS ENUM('low', 'medium', 'high', 'critical')`,
    );
    await queryRunner.query(
      `CREATE TABLE "incidents" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" "public"."incident_type" NOT NULL, "severity" "public"."incident_severity" NOT NULL DEFAULT 'low', "source" character varying(64) NOT NULL, "message" text NOT NULL, "metadata" jsonb, "resolved" boolean NOT NULL DEFAULT false, "resolved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ccb34c01719889017e2246469f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_incidents_open" ON "incidents"  ("created_at") WHERE "resolved" = false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_incidents_type_created" ON "incidents"  ("type", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_incidents_created" ON "incidents"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reputation_source" AS ENUM('virustotal', 'google_safe_browsing', 'phishtank')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."check_status" AS ENUM('ok', 'timeout', 'rate_limited', 'error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reputation_checks" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "analysis_id" uuid NOT NULL, "source" "public"."reputation_source" NOT NULL, "status" "public"."check_status" NOT NULL, "malicious" boolean, "score" smallint, "raw_response" jsonb, "response_time_ms" integer, CONSTRAINT "CHK_reputation_checks_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100), CONSTRAINT "PK_30bcb642a95bb5fc9359ffa77b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_reputation_checks_analysis_source" ON "reputation_checks"  ("analysis_id", "source") `,
    );
    await queryRunner.query(
      `CREATE TABLE "heuristic_results" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "analysis_id" uuid NOT NULL, "rule_code" character varying(64) NOT NULL, "weight" smallint NOT NULL, "details" jsonb, CONSTRAINT "PK_919e2d22eb5c3da4407abe23930" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_heuristic_results_rule" ON "heuristic_results"  ("rule_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_heuristic_results_analysis" ON "heuristic_results"  ("analysis_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."analysis_status" AS ENUM('pending', 'completed', 'partial', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "url_analyses" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid, "url" text NOT NULL, "normalized_url" text NOT NULL, "url_hash" character(64) NOT NULL, "domain" character varying(253) NOT NULL, "status" "public"."analysis_status" NOT NULL DEFAULT 'pending', "score" smallint, "duration_ms" integer, CONSTRAINT "CHK_url_analyses_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100), CONSTRAINT "PK_5e39876eb5ddeefa6417a493510" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_analyses_created" ON "url_analyses"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_analyses_hash_created" ON "url_analyses"  ("url_hash", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_url_analyses_user_created" ON "url_analyses"  ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."risk_classification" AS ENUM('safe', 'suspicious', 'malicious')`,
    );
    await queryRunner.query(
      `CREATE TABLE "analysis_results" ("id" uuid NOT NULL DEFAULT uuidv7(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "analysis_id" uuid NOT NULL, "classification" "public"."risk_classification" NOT NULL, "score" smallint NOT NULL, "summary" text, CONSTRAINT "REL_3bb82aa7301f6e60370a9675f5" UNIQUE ("analysis_id"), CONSTRAINT "CHK_analysis_results_score" CHECK ("score" BETWEEN 0 AND 100), CONSTRAINT "PK_56560e3511c57e1db64a3ad93eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_analysis_results_analysis" ON "analysis_results"  ("analysis_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analysis_results_classification" ON "analysis_results"  ("classification") `,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_checks" ADD CONSTRAINT "FK_3cdf76dec1956a0e1bf3bbe75ec" FOREIGN KEY ("analysis_id") REFERENCES "url_analyses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "heuristic_results" ADD CONSTRAINT "FK_0de21bb4bf6d1dc3769e15bd78d" FOREIGN KEY ("analysis_id") REFERENCES "url_analyses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_analyses" ADD CONSTRAINT "FK_de4c446c0255c2da15f3168992e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "analysis_results" ADD CONSTRAINT "FK_3bb82aa7301f6e60370a9675f55" FOREIGN KEY ("analysis_id") REFERENCES "url_analyses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "analysis_results" DROP CONSTRAINT "FK_3bb82aa7301f6e60370a9675f55"`,
    );
    await queryRunner.query(
      `ALTER TABLE "url_analyses" DROP CONSTRAINT "FK_de4c446c0255c2da15f3168992e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "heuristic_results" DROP CONSTRAINT "FK_0de21bb4bf6d1dc3769e15bd78d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reputation_checks" DROP CONSTRAINT "FK_3cdf76dec1956a0e1bf3bbe75ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_analysis_results_classification"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_analysis_results_analysis"`,
    );
    await queryRunner.query(`DROP TABLE "analysis_results"`);
    await queryRunner.query(`DROP TYPE "public"."risk_classification"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_url_analyses_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_url_analyses_hash_created"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_url_analyses_created"`);
    await queryRunner.query(`DROP TABLE "url_analyses"`);
    await queryRunner.query(`DROP TYPE "public"."analysis_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_heuristic_results_analysis"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_heuristic_results_rule"`);
    await queryRunner.query(`DROP TABLE "heuristic_results"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_reputation_checks_analysis_source"`,
    );
    await queryRunner.query(`DROP TABLE "reputation_checks"`);
    await queryRunner.query(`DROP TYPE "public"."check_status"`);
    await queryRunner.query(`DROP TYPE "public"."reputation_source"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_incidents_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_incidents_type_created"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_incidents_open"`);
    await queryRunner.query(`DROP TABLE "incidents"`);
    await queryRunner.query(`DROP TYPE "public"."incident_severity"`);
    await queryRunner.query(`DROP TYPE "public"."incident_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_created"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_audit_logs_action_created"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."user_status"`);
    await queryRunner.query(`DROP TYPE "public"."user_role"`);
  }
}
