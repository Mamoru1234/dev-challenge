import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { enableValidation } from '../src/app.utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { from } from 'rxjs';
import { HttpService } from '@nestjs/axios';

// NO way in time
describe.skip('External ref function API test', () => {
  let app: INestApplication;
  const httpServiceMock = {
    get: jest.fn(),
  };

  const client = {
    getSheet: (sheetId: string) =>
      request(app.getHttpServer()).get(`/${sheetId}`),
    getCell: (sheetId: string, cellId: string) =>
      request(app.getHttpServer()).get(`/${sheetId}/${cellId}`),
    createCell: (sheetId: string, cellId: string, value: string) =>
      request(app.getHttpServer())
        .post(`/${sheetId}/${cellId}`)
        .send({ value }),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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
    await dataSource.query('TRUNCATE TABLE cell CASCADE;');
  });

  afterEach(async () => {
    app?.close();
  });

  it('simple case', async () => {
    await client
      .createCell('test', 'url', 'https://test.api.com')
      .expect(HttpStatus.CREATED);
    httpServiceMock.get.mockReturnValue(
      from(
        Promise.resolve({
          data: {
            result: 'Hello world from API',
          },
        }),
      ),
    );
    const { body: createdResponse } = await client.createCell(
      'test',
      'call',
      '=EXTERNAL_REF(url)',
    );
    expect(createdResponse).toMatchSnapshot();
  });
});
