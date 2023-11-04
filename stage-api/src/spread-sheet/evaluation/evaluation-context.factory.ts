import { Injectable } from '@nestjs/common';
import { EvaluationContext } from './evaluation-context';
import { ExternalArgsFetcher } from './external-args.fetcher';
import { EntityManager } from 'typeorm';
import { CellEntity } from '../../database/entity/cell.entity';
import { EquationVariablesService } from './equation-variables.service';

@Injectable()
export class EvaluationContextFactory {
  constructor(private readonly externalArgsFetcher: ExternalArgsFetcher) {}

  createContext(tx: EntityManager): EvaluationContext {
    const cellRepository = tx.getRepository(CellEntity);
    const variablesService = new EquationVariablesService(cellRepository);
    return new EvaluationContext(this.externalArgsFetcher, variablesService);
  }
}
