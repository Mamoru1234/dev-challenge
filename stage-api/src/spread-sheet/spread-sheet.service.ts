import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import {
  CellData,
  CreateCellInput,
  GetSheetOutput,
} from './spread-sheet.interface';
import {
  evalEquation,
  findExternalRefs,
  findVariables,
  parseEquation,
} from './equation.utils';
import { EquationNode } from 'equation-parser';
import { CellLinkEntity } from '../database/entity/cell-link.entity';
import { EquationRecalculateService } from './equation-recalculation.service';
import { CellWebhookProcessingService } from '../cell-webhook/cell-webhook-processing.service';
import { EvaluationContextFactory } from './evaluation/evaluation-context.factory';
import { EvaluationContext } from './evaluation/evaluation-context';
import { EquationValue, isStringValue, valueToString } from './equation-value';
import { EquationPreProcessingService } from './evaluation/equation-pre-processing.service';
import { ExternalValueEntity } from '../database/entity/external-value.entity';
import { uniq } from 'lodash';

export interface CalculateEquationOutput {
  varIds: string[];
  result: EquationValue;
  vars: Record<string, EquationValue>;
}

@Injectable()
export class SpreadSheetService {
  constructor(
    @InjectRepository(CellEntity)
    private readonly cellRepository: Repository<CellEntity>,
    private readonly dataSource: DataSource,
    private readonly cellWebhookProcessingService: CellWebhookProcessingService,
    private readonly evaluationContextFactory: EvaluationContextFactory,
    private readonly equationRecalculateService: EquationRecalculateService,
    private readonly equationPreProcessingService: EquationPreProcessingService,
  ) {}

  async getSheet(sheetId: string): Promise<GetSheetOutput> {
    const cells = await this.cellRepository.find({
      where: {
        sheetId,
      },
      select: ['cellId', 'result', 'value'],
    });
    if (!cells.length) {
      throw new NotFoundException('sheet is missing');
    }
    return cells.reduce((result, cell) => {
      result[cell.cellId] = {
        value: cell.value,
        result: cell.result,
      };
      return result;
    }, {} as GetSheetOutput);
  }

  async getCell(sheetId: string, cellId: string): Promise<CellData> {
    const cell = await this.cellRepository.findOne({
      where: {
        sheetId,
        cellId: cellId,
      },
      select: ['value', 'result'],
    });
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }
    return {
      value: cell.value,
      result: cell.result,
    };
  }

  postCell(input: CreateCellInput): Promise<CellData> {
    const { cellId, sheetId, value } = input;
    return this.dataSource.transaction(async (tx) => {
      const cellRepository = tx.getRepository(CellEntity);
      const cellLinkRepository = tx.getRepository(CellLinkEntity);
      const existingCell = await cellRepository.findOne({
        where: {
          sheetId,
          cellId,
        },
        select: ['id', 'result', 'value'],
      });
      const context = this.evaluationContextFactory.createContext(tx);
      const { value: equationValue, defaultVars } =
        await this.equationPreProcessingService.process(value);
      const equation = parseEquation(equationValue);
      const calculationOutput = equation
        ? await this.calculateEquation(
            sheetId,
            equation,
            context,
            defaultVars,
            cellRepository,
          )
        : undefined;
      const result = calculationOutput
        ? valueToString(calculationOutput.result)
        : value;
      // cell is not updated no actions needed
      if (
        existingCell &&
        existingCell.result === result &&
        existingCell.value === value
      ) {
        return {
          result: value,
          value,
        };
      }
      const externals = calculationOutput
        ? await this.findExternals(equation, calculationOutput.vars, tx)
        : [];
      const cell = await cellRepository.save({
        id: existingCell?.id,
        sheetId,
        cellId,
        value,
        result,
        equation,
        defaultVars,
        externals,
      });
      if (calculationOutput) {
        if (calculationOutput.varIds.includes(cell.id)) {
          throw new UnprocessableEntityException(
            'Self reference is not allowed',
          );
        }
        context.variablesService.setValue(cell.id, {
          cellId,
          value: calculationOutput.result,
        });
        await this.saveEquationLinks(
          cellLinkRepository,
          cell.id,
          calculationOutput.varIds,
        );
      }
      if (existingCell && !calculationOutput) {
        await cellLinkRepository.delete({
          toCellId: existingCell.id,
        });
      }
      if (existingCell) {
        const updatedCells = await this.equationRecalculateService.recalculate({
          id: cell.id,
          context,
          tx,
        });
        await this.cellWebhookProcessingService.processHooks(
          updatedCells.concat([existingCell]),
        );
      }
      return {
        result,
        value,
      };
    });
  }

  async calculateEquation(
    sheetId: string,
    equation: EquationNode,
    context: EvaluationContext,
    defaultVars: Record<string, EquationValue>,
    cellRepository: Repository<CellEntity>,
  ): Promise<CalculateEquationOutput> {
    const variableNames = findVariables(equation);
    const varIds = await this.mapVarNamesToIds(
      sheetId,
      variableNames,
      cellRepository,
    );
    const varValues = await context.variablesService.populateVariables(varIds);
    const vars = Object.assign({}, varValues, defaultVars);
    const result = await evalEquation(equation, vars, context);
    return {
      result,
      varIds,
      vars,
    };
  }

  private async findExternals(
    equation: EquationNode,
    vars: Record<string, EquationValue>,
    tx: EntityManager,
  ): Promise<ExternalValueEntity[]> {
    const externalVars = findExternalRefs(equation);
    if (!externalVars.length) {
      return [];
    }
    const externalsRepository = tx.getRepository(ExternalValueEntity);
    const urls = uniq(
      externalVars.map((it) => {
        const varValue = vars[it];
        if (!isStringValue(varValue)) {
          throw new UnprocessableEntityException('Unknown var value recieved');
        }
        return varValue.value;
      }),
    );
    const externals = await externalsRepository.find({
      where: {
        url: In(urls),
      },
    });
    if (externals.length !== urls.length) {
      throw new InternalServerErrorException(
        'inconsistent external values state',
      );
    }
    return externals;
  }

  private async saveEquationLinks(
    cellLinkRepository: Repository<CellLinkEntity>,
    id: string,
    varIds: string[],
  ): Promise<void> {
    await cellLinkRepository.delete({
      fromCellId: Not(In(varIds)),
      toCellId: id,
    });
    const links: Partial<CellLinkEntity>[] = varIds.map((it) => ({
      fromCellId: it,
      toCellId: id,
    }));
    await cellLinkRepository.save(links);
  }

  private async mapVarNamesToIds(
    sheetId: string,
    vars: string[],
    cellRepository: Repository<CellEntity>,
  ): Promise<string[]> {
    const varsInDb = await cellRepository.find({
      where: {
        sheetId,
        cellId: In(vars),
      },
      select: ['id', 'cellId'],
    });
    if (varsInDb.length !== vars.length) {
      const dbVars = varsInDb.map((it) => it.cellId);
      const wrongVars = vars.filter((it) => !dbVars.includes(it));
      throw new UnprocessableEntityException(
        `Wrong link some variables are not defined ${JSON.stringify(
          wrongVars,
        )}`,
      );
    }
    return varsInDb.map((it) => it.id);
  }
}
