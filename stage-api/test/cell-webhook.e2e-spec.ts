import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { enableValidation } from '../src/app.utils';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { CellValueWebhookEntity } from '../src/database/entity/cell-value-webhook';
import { pick } from 'lodash';
import { HttpService } from '@nestjs/axios';
import { from } from 'rxjs';

const TEST_SERVICE = 'https://test.service.com';

describe('Cell webhooks', () => {
  let app: INestApplication;
  let cellValueWebhookRepository: Repository<CellValueWebhookEntity>;
  const httpServiceMock = {
    post: jest.fn(),
  };

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
    jest.resetAllMocks();
    httpServiceMock.post.mockReturnValue(from(Promise.resolve()));
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(httpServiceMock)
      .compile();

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

    it('should create subscription', async () => {
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

    it('should not execute hook if nothing changed', async () => {
      await client
        .createCell('test', 'test', 'aTestValue')
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'test', {
          webhook_url: `${TEST_SERVICE}/hook`,
        })
        .expect(HttpStatus.CREATED);
      await client
        .createCell('test', 'test', 'aTestValue')
        .expect(HttpStatus.CREATED);
      expect(httpServiceMock.post).not.toHaveBeenCalled();
    });

    it('should call hook when value update', async () => {
      await client
        .createCell('test', 'test', 'aTestValue')
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'test', {
          webhook_url: `${TEST_SERVICE}/hook`,
        })
        .expect(HttpStatus.CREATED);
      await client
        .createCell('test', 'test', 'newValue')
        .expect(HttpStatus.CREATED);
      expect(httpServiceMock.post).toHaveBeenCalled();
      expect(httpServiceMock.post.mock.calls).toMatchSnapshot();
    });

    it('should call hook for cells updated', async () => {
      await client.createCell('test', 'a', '2').expect(HttpStatus.CREATED);
      await client.createCell('test', 'b', '=a+1').expect(HttpStatus.CREATED);
      await client.createCell('test', 'c', '=B+1').expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'b', {
          webhook_url: `${TEST_SERVICE}/hook`,
        })
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'c', {
          webhook_url: `${TEST_SERVICE}/hook_c`,
        })
        .expect(HttpStatus.CREATED);
      await client.createCell('test', 'a', '3').expect(HttpStatus.CREATED);
      expect(httpServiceMock.post).toHaveBeenCalledTimes(2);
      expect(httpServiceMock.post.mock.calls).toMatchSnapshot();
    });

    it('should call hook only for cells updated', async () => {
      await client.createCell('test', 'a', '2').expect(HttpStatus.CREATED);
      await client.createCell('test', 'b', '=a+1').expect(HttpStatus.CREATED);
      await client
        .createCell('test', 'c', '=MIN(B+1, 1)')
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'b', {
          webhook_url: `${TEST_SERVICE}/hook`,
        })
        .expect(HttpStatus.CREATED);
      await client
        .subscribe('test', 'c', {
          webhook_url: `${TEST_SERVICE}/hook_c`,
        })
        .expect(HttpStatus.CREATED);
      await client.createCell('test', 'a', '3').expect(HttpStatus.CREATED);
      expect(httpServiceMock.post).toHaveBeenCalledTimes(1);
      expect(httpServiceMock.post.mock.calls).toMatchSnapshot();
    });
  });
});
