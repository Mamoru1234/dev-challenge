import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExternalValue1699114853557 implements MigrationInterface {
  name = 'ExternalValue1699114853557';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "external-value" ("id" SERIAL NOT NULL, "url" text NOT NULL, "result" text NOT NULL, CONSTRAINT "PK_4167ce73202d6cb9c6b022c5dde" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9084ec9012a3406356291b4c3" ON "external-value" ("url") `,
    );
    await queryRunner.query(
      `CREATE TABLE "external-value_cells_cell" ("externalValueId" integer NOT NULL, "cellId" uuid NOT NULL, CONSTRAINT "PK_d08d27e7f400b0594334d5b9573" PRIMARY KEY ("externalValueId", "cellId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5797d73935fc96eddc9a61c7da" ON "external-value_cells_cell" ("externalValueId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9369673d1e66ae95ae77f337d6" ON "external-value_cells_cell" ("cellId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "external-value_cells_cell" ADD CONSTRAINT "FK_5797d73935fc96eddc9a61c7da2" FOREIGN KEY ("externalValueId") REFERENCES "external-value"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "external-value_cells_cell" ADD CONSTRAINT "FK_9369673d1e66ae95ae77f337d65" FOREIGN KEY ("cellId") REFERENCES "cell"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "external-value_cells_cell" DROP CONSTRAINT "FK_9369673d1e66ae95ae77f337d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "external-value_cells_cell" DROP CONSTRAINT "FK_5797d73935fc96eddc9a61c7da2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9369673d1e66ae95ae77f337d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5797d73935fc96eddc9a61c7da"`,
    );
    await queryRunner.query(`DROP TABLE "external-value_cells_cell"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9084ec9012a3406356291b4c3"`,
    );
    await queryRunner.query(`DROP TABLE "external-value"`);
  }
}
