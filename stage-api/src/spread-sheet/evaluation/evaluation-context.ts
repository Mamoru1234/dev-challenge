import { EquationVariablesService } from './equation-variables.service';
import { ExternalArgsFetcher } from './external-args.fetcher';

export class EvaluationContext {
  constructor(
    readonly externalArgsFetcher: ExternalArgsFetcher,
    readonly variablesService: EquationVariablesService,
  ) {}
}
