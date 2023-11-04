import { MigrationInterface, QueryRunner } from 'typeorm';

export class CellWebhook1699088644781 implements MigrationInterface {
  name = 'CellWebhook1699088644781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cell-value-webhook" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cellId" uuid NOT NULL, "url" text NOT NULL, CONSTRAINT "PK_f2db43962687e5dbb08c8b1abc0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "cell-value-webhook" ADD CONSTRAINT "FK_93a29d06bb30d4531596559ccce" FOREIGN KEY ("cellId") REFERENCES "cell"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cell-value-webhook" DROP CONSTRAINT "FK_93a29d06bb30d4531596559ccce"`,
    );
    await queryRunner.query(`DROP TABLE "cell-value-webhook"`);
  }
}
