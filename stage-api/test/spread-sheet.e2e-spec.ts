import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CellLinkEntity } from '../src/database/entity/cell-link.entity';

describe('SpreadSheetController (e2e)', () => {
  let app: INestApplication;
  let cellLinkRepository: Repository<CellLinkEntity>;
  const client = {
    getSheet: (sheetId: string) =>
      request(app.getHttpServer()).get(`/${sheetId}`),
    createCell: (sheetId: string, cellId: string, value: string) =>
      request(app.getHttpServer())
        .post(`/${sheetId}/${cellId}`)
        .send({ value }),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const dataSource: DataSource = app.get(getDataSourceToken('default'));
    cellLinkRepository = dataSource.getRepository(CellLinkEntity);
    await dataSource.query('TRUNCATE TABLE cell CASCADE;');
  });

  afterEach(async () => {
    app?.close();
  });

  describe('/:sheet_id (GET)', () => {
    it('should return not found if no cells', async () => {
      const { body } = await client
        .getSheet('test')
        .expect(HttpStatus.NOT_FOUND);
      expect(body.message).toBe('sheet is missing');
    });

    async function createCells(sheetId: string, cells: [string, string][]) {
      for (const cell of cells) {
        await client
          .createCell(sheetId, cell[0], cell[1])
          .expect(HttpStatus.CREATED);
      }
    }

    it('should return value of single cell', async () => {
      await client.createCell('test', 'test_id', 'test_value');
      const { body } = await client.getSheet('test').expect(HttpStatus.OK);
      expect(body).toEqual({
        test_id: { value: 'test_value', result: 'test_value' },
      });
    });

    it('should return all values for this sheet only', async () => {
      await createCells('test', [
        ['test_id', 'test_value'],
        ['test_id_2', 'test_value_2'],
      ]);
      await client.createCell('test_2', 'test_id_3', 'test_value');
      const { body } = await client.getSheet('test').expect(HttpStatus.OK);
      expect(body).toEqual({
        test_id: { value: 'test_value', result: 'test_value' },
        test_id_2: {
          value: 'test_value_2',
          result: 'test_value_2',
        },
      });
    });

    it('simple case', async () => {
      await createCells('test', [
        ['var1', '2'],
        ['var2', '3'],
        ['var3', '=var1+var2'],
      ]);
      const { body } = await client.getSheet('test').expect(HttpStatus.OK);
      expect(body).toMatchSnapshot();
    });

    it('complicated case', async () => {
      await createCells('test', [
        ['a', '2'],
        ['b', '3'],
        ['c', '=a+b'],
        ['d', '=b*a'],
        ['e', '=c + d'],
      ]);
      const { body } = await client.getSheet('test').expect(HttpStatus.OK);
      expect(body).toMatchSnapshot();
      const links = await cellLinkRepository.count();
      expect(links).toBe(6);
    });
  });
});
