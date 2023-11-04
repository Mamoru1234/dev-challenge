import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { enableValidation } from '../src/app.utils';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { CellValueWebhookEntity } from '../src/database/entity/cell-value-webhook';
import { pick } from 'lodash';

describe('Cell webhooks', () => {
  let app: INestApplication;
  let cellValueWebhookRepository: Repository<CellValueWebhookEntity>;

  const client = {
    subscribe: (sheetId: string, cellId: string, body: any) =>
      request(app.getHttpServer())
        .post(`/${sheetId}/${cellId}/subscribe`)
        .send(body),
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
    enableValidation(app);
    await app.init();
    const dataSource: DataSource = app.get(getDataSourceToken('default'));
    cellValueWebhookRepository = dataSource.getRepository(
      CellValueWebhookEntity,
    );
    await dataSource.query('TRUNCATE TABLE cell CASCADE;');
  });

  afterEach(async () => {
    app?.close();
  });

  describe('POST /:sheet_id/:cell_id/subscribe', () => {
    describe('invalid request', () => {
      it('no webhook url', async () => {
        const { body } = await client
          .subscribe('test', 'test', {})
          .expect(HttpStatus.BAD_REQUEST);
        expect(body).toMatchSnapshot();
      });
      it('webhook is invalid url', async () => {
        const { body } = await client
          .subscribe('test', 'test', {
            webhook_url: 'test',
          })
          .expect(HttpStatus.BAD_REQUEST);
        expect(body).toMatchSnapshot();
      });
      it('url without protocol', async () => {
        const { body } = await client
          .subscribe('test', 'test', {
            webhook_url: '//www.google.com',
          })
          .expect(HttpStatus.BAD_REQUEST);
        expect(body).toMatchSnapshot();
      });
      it('url without https', async () => {
        const { body } = await client
          .subscribe('test', 'test', {
            webhook_url: 'http://www.google.com',
          })
          .expect(HttpStatus.BAD_REQUEST);
        expect(body).toMatchSnapshot();
      });
      it('no cell', async () => {
        await client
          .subscribe('test', 'test', {
            webhook_url: 'https://www.google.com',
          })
          .expect(HttpStatus.NOT_FOUND);
      });
    });

    it.only('should create subscription', async () => {
      await client
        .createCell('test', 'test', 'aTestValue')
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'test', {
          webhook_url: 'https://www.google.com',
        })
        .expect(HttpStatus.CREATED);
      const webhooks = await cellValueWebhookRepository.find();
      expect(webhooks.map((it) => pick(it, 'url'))).toMatchSnapshot();
    });
  });
});
