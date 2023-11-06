import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { ExternalValueEntity } from '../database/entity/external-value.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExternalResourceResponse } from './evaluation/dto/external-resource.response';

export interface FindAndReplaceOutput {
  value: string;
  externals: ExternalValueEntity[];
}

@Injectable()
export class EquationExternalsProcessing {
  private readonly logger = new Logger(EquationExternalsProcessing.name);

  constructor(private readonly httpService: HttpService) {}
  async findAndReplaceExternals(
    tx: EntityManager,
    value: string,
  ): Promise<FindAndReplaceOutput> {
    if (!value.startsWith('=')) {
      return { value, externals: [] };
    }
    let replacedValue = value;
    const externals = [];
    const externalsRepository = tx.getRepository(ExternalValueEntity);
    const externalRefRegExp = new RegExp('external_ref([^)]+)', 'gi');
    let matched;
    while ((matched = externalRefRegExp.exec(value)) !== null) {
      const url = matched[1].slice(1);
      const external = await externalsRepository.findOne({
        where: {
          url,
        },
      });
      const stringToReplace = matched[0] + ')';
      replacedValue = value.replaceAll(
        stringToReplace,
        `external-${external.id}`,
      );
    }
    return {
      value: replacedValue,
      externals,
    };
  }

  async ensureExternal(
    url: string,
    externalsRepository: Repository<ExternalValueEntity>,
  ): Promise<ExternalValueEntity> {
    const existing = await externalsRepository.findOne({
      where: {
        url,
      },
    });
    if (existing) {
      return existing;
    }
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
    const newExternal = await externalsRepository.save({
      url,
      result: payload.result,
    });
    await firstValueFrom(
      this.httpService.post(`${url}/subsribe`, {
        webhook_url: `${process.env.SERVER_BASE}/subscriptions/${newExternal.id}`,
      }),
    );
    return newExternal;
  }
}
