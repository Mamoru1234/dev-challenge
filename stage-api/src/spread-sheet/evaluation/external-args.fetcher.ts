import { HttpService } from '@nestjs/axios';
import { BadRequestException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { ExternalResourceResponse } from './dto/external-resource.response';
import { validate } from 'class-validator';
import { ExternalValueEntity } from '../../database/entity/external-value.entity';
import { Repository } from 'typeorm';

export class ExternalArgsFetcher {
  private readonly logger = new Logger(ExternalArgsFetcher.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly externalValueRepository: Repository<ExternalValueEntity>,
  ) {}

  async fetch(url: string): Promise<string> {
    try {
      const existingExternal = await this.externalValueRepository.findOne({
        where: {
          url,
        },
        select: ['id', 'result'],
      });
      if (existingExternal) {
        return existingExternal.result;
      }
      const newExternal = await this.initExternalValue(url);
      return newExternal.result;
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn('Error during fetch', e);
      throw new BadRequestException('External arg cannot be fetched');
    }
  }

  private async fetchExternalValue(url: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        maxContentLength: 2048,
      }),
    );
    const payload = plainToInstance(ExternalResourceResponse, data, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
    const errors = await validate(payload);
    if (errors.length) {
      this.logger.log('Errors validating payload', {
        payload,
        errors,
      });
      throw new BadRequestException('External resource response is not valid');
    }
    return payload;
  }

  private async subscribeOnUpdate(id: number, url: string) {
    await firstValueFrom(
      this.httpService.post(
        `${url}/subscribe`,
        {
          webhook_url: `${process.env.SERVER_BASE}/subscriptions/${id}`,
        },
        {
          maxContentLength: 1024,
        },
      ),
    );
  }

  async initExternalValue(url: string): Promise<ExternalValueEntity> {
    const { result } = await this.fetchExternalValue(url);
    const entity = await this.externalValueRepository.save({
      url,
      result,
    });
    await this.subscribeOnUpdate(entity.id, url);
    return entity;
  }
}
