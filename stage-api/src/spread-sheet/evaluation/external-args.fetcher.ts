import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { ExternalResourceResponse } from './dto/external-resource.response';
import { validate } from 'class-validator';

@Injectable()
export class ExternalArgsFetcher {
  private readonly logger = new Logger(ExternalArgsFetcher.name);

  constructor(private readonly httpService: HttpService) {}

  async fetch(url: string): Promise<string> {
    try {
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
        throw new BadRequestException(
          'External resource response is not valid',
        );
      }
      return payload.result;
    } catch (e) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      this.logger.warn('Error during fetch', e);
      throw new BadRequestException('External arg cannot be fetched');
    }
  }
}
