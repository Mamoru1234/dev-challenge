import { Injectable } from '@nestjs/common';
import { EvaluationContext } from './evaluation-context';
import { ExternalArgsFetcher } from './external-args.fetcher';
import { EntityManager } from 'typeorm';
import { CellEntity } from '../../database/entity/cell.entity';
import { EquationVariablesService } from './equation-variables.service';
import { HttpService } from '@nestjs/axios';
import { ExternalValueEntity } from '../../database/entity/external-value.entity';

@Injectable()
export class EvaluationContextFactory {
  constructor(private readonly httpService: HttpService) {}

  createContext(tx: EntityManager): EvaluationContext {
    const cellRepository = tx.getRepository(CellEntity);
    const variablesService = new EquationVariablesService(cellRepository);
    const externalArgsFetcher = new ExternalArgsFetcher(
      this.httpService,
      tx.getRepository(ExternalValueEntity),
    );
    return new EvaluationContext(externalArgsFetcher, variablesService);
  }
}
