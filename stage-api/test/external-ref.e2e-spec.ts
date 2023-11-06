import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { enableValidation } from '../src/app.utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { from } from 'rxjs';
import { HttpService } from '@nestjs/axios';

describe('External ref function API test', () => {
  let app: INestApplication;
  const httpServiceMock = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockResponse = (data: any) => from(Promise.resolve({ data }));

  const getSubscriptionURL = (call: number) => {
    const { webhook_url } = httpServiceMock.post.mock.calls[call][1];
    return webhook_url.replace(process.env.SERVER_BASE, '');
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
    notify: (url: string, result: string) =>
      request(app.getHttpServer()).post(url).send({ result }),
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
    await dataSource.query('TRUNCATE TABLE "external-value" CASCADE;');
  });

  afterEach(async () => {
    app?.close();
  });

  it('simple case', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: 'Hello world from API',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: createdResponse } = await client
      .createCell('test', 'call', '=EXTERNAL_REF(https://test.api.com)')
      .expect(HttpStatus.CREATED);
    expect(createdResponse).toMatchSnapshot();
    expect(httpServiceMock.get).toHaveBeenCalledTimes(1);
    expect(httpServiceMock.post).toHaveBeenCalledTimes(1);
  });

  it('several cells same URL', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: 'Hello world from API',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', '=EXTERNAL_REF(https://test.api.com)')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
    expect(httpServiceMock.get).toHaveBeenCalledTimes(1);
    expect(httpServiceMock.post).toHaveBeenCalledTimes(1);
    const { body: cell2 } = await client
      .createCell('test', 'cell2', '=EXTERNAL_REF(https://test.api.com)')
      .expect(HttpStatus.CREATED);

    expect(cell2).toMatchSnapshot();
    expect(httpServiceMock.get).toHaveBeenCalledTimes(1);
    expect(httpServiceMock.post).toHaveBeenCalledTimes(1);
  });

  it('invalid url', async () => {
    const { body } = await client
      .createCell('test', 'cell1', '=EXTERNAL_REF(query://fewf/f//wef)')
      .expect(HttpStatus.BAD_REQUEST);
    expect(body).toMatchSnapshot();
  });

  it('calculation with external', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: '23',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', '=EXTERNAL_REF(https://test.api.com)+32')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
  });

  it('external url as var with calculation var combined', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: '23',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', 'https://test.api.com')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
    const { body: cell2 } = await client
      .createCell('test', 'cell2', '32')
      .expect(HttpStatus.CREATED);
    expect(cell2).toMatchSnapshot();
    const { body: cell3 } = await client
      .createCell('test', 'cell3', '=EXTERNAL_REF(cell1)+cell2')
      .expect(HttpStatus.CREATED);
    expect(cell3).toMatchSnapshot();
  });

  it('should fail if external ref var got updated to invalid url', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: '23',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', 'https://test.api.com')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
    const { body: cell2 } = await client
      .createCell('test', 'cell2', '=EXTERNAL_REF(cell1)+32')
      .expect(HttpStatus.CREATED);
    expect(cell2).toMatchSnapshot();
    const { body: errorBody } = await client
      .createCell('test', 'cell1', 'some_invalid_url')
      .expect(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(errorBody).toMatchSnapshot();
  });

  it('simple update case', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: '23',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', '=EXTERNAL_REF(https://test.api.com)+32')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
    const subscriptionUrl = getSubscriptionURL(0);
    expect(subscriptionUrl).toBeTruthy();
    await client.notify(subscriptionUrl, '45').expect(HttpStatus.CREATED);
    const { body: updatedCell } = await client
      .getCell('test', 'cell1')
      .expect(HttpStatus.OK);
    expect(updatedCell).toMatchSnapshot();
  });

  it('more complicated case', async () => {
    httpServiceMock.get.mockReturnValue(
      mockResponse({
        result: '2',
      }),
    );
    httpServiceMock.post.mockReturnValue(mockResponse({}));
    const { body: cell1 } = await client
      .createCell('test', 'cell1', '=EXTERNAL_REF(https://test.api.com)+1')
      .expect(HttpStatus.CREATED);
    expect(cell1).toMatchSnapshot();
    const { body: cell2 } = await client
      .createCell('test', 'cell2', '=cell1+2')
      .expect(HttpStatus.CREATED);
    expect(cell2).toMatchSnapshot();
    const { body: cell3 } = await client
      .createCell('test', 'cell3', '=EXTERNAL_REF(https://test.api.com)+cell2')
      .expect(HttpStatus.CREATED);
    expect(cell3).toMatchSnapshot();
    const subscriptionUrl = getSubscriptionURL(0);
    expect(subscriptionUrl).toBeTruthy();
    await client.notify(subscriptionUrl, '4').expect(HttpStatus.CREATED);
    const { body: sheetData } = await client
      .getSheet('test')
      .expect(HttpStatus.OK);
    expect(sheetData).toMatchSnapshot();
    await client.notify(subscriptionUrl, '8').expect(HttpStatus.CREATED);
    const { body: sheetData1 } = await client
      .getSheet('test')
      .expect(HttpStatus.OK);
    expect(sheetData1).toMatchSnapshot();
  });
});
