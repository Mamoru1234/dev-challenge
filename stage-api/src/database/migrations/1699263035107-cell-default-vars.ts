import { MigrationInterface, QueryRunner } from 'typeorm';

export class CellDefaultVars1699263035107 implements MigrationInterface {
  name = 'CellDefaultVars1699263035107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9084ec9012a3406356291b4c3"`,
    );
    await queryRunner.query(`ALTER TABLE "cell" ADD "defaultVars" jsonb`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a9084ec9012a3406356291b4c3" ON "external-value" ("url") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9084ec9012a3406356291b4c3"`,
    );
    await queryRunner.query(`ALTER TABLE "cell" DROP COLUMN "defaultVars"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_a9084ec9012a3406356291b4c3" ON "external-value" ("url") `,
    );
  }
}
