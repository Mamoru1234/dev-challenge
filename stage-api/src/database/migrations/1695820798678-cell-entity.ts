import { MigrationInterface, QueryRunner } from 'typeorm';

export class CellEntity1695820798678 implements MigrationInterface {
  name = 'CellEntity1695820798678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cell" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cellId" text NOT NULL, "sheetId" text NOT NULL, "value" text NOT NULL, "result" text NOT NULL, "equation" jsonb, CONSTRAINT "PK_6f34717c251843e5ca32fc1b2b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4fd9ed2cbdeea8b6e7406b1f56" ON "cell" ("sheetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cf8926b80e2963f99c06020171" ON "cell" ("cellId", "sheetId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cf8926b80e2963f99c06020171"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4fd9ed2cbdeea8b6e7406b1f56"`,
    );
    await queryRunner.query(`DROP TABLE "cell"`);
  }
}
