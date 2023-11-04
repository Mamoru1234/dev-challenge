import { EntityManager, In, Repository } from 'typeorm';
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
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CellEntity } from '../database/entity/cell.entity';
import { evalEquation } from './equation.utils';
import { EvaluationContext } from './evaluation/evaluation-context';

export interface RecalculationInput {
  id: string;
  context: EvaluationContext;
  tx: EntityManager;
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
  }
  result = reverse(result);
  return result;
}

@Injectable()
export class EquationRecalculateService {
  private readonly logger = new Logger(EquationRecalculateService.name);

  constructor() {}

  async recalculate(input: RecalculationInput): Promise<CellEntity[]> {
    const cellLinkRepository = input.tx.getRepository(CellLinkEntity);
    const cellRepository = input.tx.getRepository(CellEntity);
    const { context } = input;
    const deps = await this.buildUpstreamDeps(cellLinkRepository, input.id);
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
    let updatedCells: CellEntity[] = [];
    for (const stage of rest) {
      this.logger.debug('recalculating stage', {
        stage,
      });
      const stageDepIds = await this.findDownstreamDeps(
        cellLinkRepository,
        stage,
      );
      const vars =
        await context.variablesService.populateVariables(stageDepIds);
      const stageCells = await cellRepository.find({
        where: {
          id: In(stage),
        },
        select: ['id', 'cellId', 'equation', 'result', 'value'],
      });
      const cellsUpdateInStage = [];
      for (const cell of stageCells) {
        const { equation } = cell;
        if (!equation) {
          throw new InternalServerErrorException(
            `Found cell in upsteam deps without equation ${cell.cellId}`,
          );
        }
        const newResult = await evalEquation(equation, vars, context);
        context.variablesService.setValue(cell.id, {
          cellId: cell.cellId,
          value: newResult,
        });
        if (newResult !== +cell.result) {
          cell.result = newResult.toString();
          cellsUpdateInStage.push(cell);
        }
      }
      updatedCells = updatedCells.concat(cellsUpdateInStage);
    }
    if (updatedCells.length) {
      await cellRepository.save(updatedCells);
    }
    return updatedCells;
  }

  private async buildUpstreamDeps(
    cellLinkRepository: Repository<CellLinkEntity>,
    id: string,
  ): Promise<Record<string, string[]>> {
    let varsToCheck = [id];
    const result: Record<string, string[]> = {};
    while (varsToCheck.length) {
      const defaults = varsToCheck.reduce(
        (result, it) => {
          result[it] = [];
          return result;
        },
        {} as Record<string, string[]>,
      );
      const current = await this.findUpstreamDeps(
        cellLinkRepository,
        varsToCheck,
      );
      Object.assign(result, defaults, current);
      const upstreamVars = uniq(flatten(Object.values(current)));
      if (upstreamVars.includes(id)) {
        throw new UnprocessableEntityException('Circular reference found');
      }
      const newVars = upstreamVars.filter((it) => !has(result, it));
      varsToCheck = newVars;
    }
    return result;
  }

  private async findUpstreamDeps(
    cellLinkRepository: Repository<CellLinkEntity>,
    ids: string[],
  ): Promise<Record<string, string[]>> {
    const entries = await cellLinkRepository.find({
      where: {
        fromCellId: In(ids),
      },
      select: ['toCellId', 'fromCellId'],
    });
    return mapValues(groupBy(entries, 'fromCellId'), (group) =>
      group.map((it) => it.toCellId),
    );
  }

  private async findDownstreamDeps(
    cellLinkRepository: Repository<CellLinkEntity>,
    ids: string[],
  ): Promise<string[]> {
    const entries = await cellLinkRepository.find({
      where: {
        toCellId: In(ids),
      },
      select: ['toCellId', 'fromCellId'],
    });
    return uniq(entries.map((it) => it.fromCellId));
  }
}
