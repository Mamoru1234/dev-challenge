import { MigrationInterface, QueryRunner } from 'typeorm';

export class CellLinkEntity1695821358156 implements MigrationInterface {
  name = 'CellLinkEntity1695821358156';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cell-link" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromCellId" uuid NOT NULL, "toCellId" uuid NOT NULL, CONSTRAINT "PK_e5eda6adc734ad7d5df51083636" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cell-link" ADD CONSTRAINT "FK_18f13cb6b050b2f4afd90262bfd" FOREIGN KEY ("fromCellId") REFERENCES "cell"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cell-link" ADD CONSTRAINT "FK_b21859b61694e5da8658510dda5" FOREIGN KEY ("toCellId") REFERENCES "cell"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cell-link" DROP CONSTRAINT "FK_b21859b61694e5da8658510dda5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cell-link" DROP CONSTRAINT "FK_18f13cb6b050b2f4afd90262bfd"`,
    );
    await queryRunner.query(`DROP TABLE "cell-link"`);
  }
}
