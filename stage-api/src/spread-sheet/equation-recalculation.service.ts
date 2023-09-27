import { In, Repository } from 'typeorm';
import { CellLinkEntity } from '../database/entity/cell-link.entity';
import {
  cloneDeep,
  flatten,
  groupBy,
  has,
  isEmpty,
  mapValues,
  omit,
  pickBy,
  reverse,
  uniq,
} from 'lodash';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export interface RecalculationInput {
  id: string;
  newValue: number;
}

export function buildRecalculationStages(
  logger: Logger,
  deps: Record<string, string[]>,
): string[][] {
  let _deps = cloneDeep(deps);
  let result: string[][] = [];
  while (!isEmpty(_deps)) {
    const availableNodes = Object.keys(
      pickBy(_deps, (it: string[]) => it.length === 0),
    );
    debugger;
    if (availableNodes.length === 0) {
      logger.error('No available nodes', {
        _deps,
      });
      throw new InternalServerErrorException(
        'Something wrong with dep detection',
      );
    }
    result.push(availableNodes);
    _deps = omit(_deps, availableNodes);
    _deps = mapValues(_deps, (group) =>
      group.filter((it) => !availableNodes.includes(it)),
    );
    debugger;
  }
  result = reverse(result);
  return result;
}

export class EquationRecalculateService {
  private readonly logger = new Logger(EquationRecalculateService.name);

  constructor(
    private readonly cellLinkRepository: Repository<CellLinkEntity>,
  ) {}

  async recalculate(input: RecalculationInput): Promise<void> {
    const deps = await this.buildUpstreamDeps(input.id);
    const stages = buildRecalculationStages(this.logger, deps);
    if (!stages.length) {
      throw new InternalServerErrorException('Invalid empty stages');
    }
    const [root, ...rest] = stages;
    // validate that first calculated stage is target variable
    if (root.length !== 1 || root[0] !== input.id) {
      this.logger.error('Wrong stages root', {
        stages,
        cellId: input.id,
      });
      throw new InternalServerErrorException('Stages wrong root calculation');
    }
    for (const stage of rest) {
      this.logger.debug('recalculating stage', {
        stage,
      });
    }
  }

  private async buildUpstreamDeps(
    id: string,
  ): Promise<Record<string, string[]>> {
    let varsToCheck = [id];
    const result: Record<string, string[]> = {};
    while (varsToCheck.length) {
      const current = await this.findUpstreamDeps(varsToCheck);
      Object.assign(result, current);
      const upstreamVars = uniq(flatten(Object.values(current)));
      // TODO check circular dep
      const newVars = upstreamVars.filter((it) => !has(result, it));
      varsToCheck = newVars;
    }
    return result;
  }

  private async findUpstreamDeps(
    ids: string[],
  ): Promise<Record<string, string[]>> {
    const entries = await this.cellLinkRepository.find({
      where: {
        fromCellId: In(ids),
      },
      select: ['toCellId', 'fromCellId'],
    });
    return mapValues(groupBy(entries, 'fromCellId'), (group) =>
      group.map((it) => it.toCellId),
    );
  }
}
