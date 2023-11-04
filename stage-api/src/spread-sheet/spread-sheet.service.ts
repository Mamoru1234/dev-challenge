import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import {
  CellData,
  CreateCellInput,
  GetSheetOutput,
} from './spread-sheet.interface';
import { evalEquation, findVariables, parseEquation } from './equation.utils';
import { EquationVariablesService } from './equation-variables.service';
import { EquationNode } from 'equation-parser';
import { CellLinkEntity } from '../database/entity/cell-link.entity';
import { EquationRecalculateService } from './equation-recalculation.service';

export interface CalculateEquationOutput {
  varIds: string[];
  result: number;
}

@Injectable()
export class SpreadSheetService {
  constructor(
    @InjectRepository(CellEntity)
    private readonly cellRepository: Repository<CellEntity>,
    private dataSource: DataSource,
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
        cellId: cellId.toLowerCase(),
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
    const { cellId: rawCellId, sheetId, value } = input;
    const cellId = rawCellId.toLowerCase();
    return this.dataSource.transaction(async (tx) => {
      const cellRepository = tx.getRepository(CellEntity);
      const cellLinkRepository = tx.getRepository(CellLinkEntity);
      const existingCell = await cellRepository.findOne({
        where: {
          sheetId,
          cellId,
        },
        select: ['id'],
      });
      const equation = parseEquation(value);
      const variablesService = new EquationVariablesService(cellRepository);
      const calculationOutput = equation
        ? await this.calculateEquation(sheetId, equation, variablesService)
        : undefined;
      const result = calculationOutput
        ? calculationOutput.result.toString()
        : value;
      const cell = await cellRepository.save({
        id: existingCell?.id,
        sheetId,
        cellId,
        value,
        result,
        equation,
      });
      if (calculationOutput) {
        if (calculationOutput.varIds.includes(cell.id)) {
          throw new UnprocessableEntityException(
            'Self reference is not allowed',
          );
        }
        variablesService.setValue(cell.id, {
          cellId,
          value: +result,
        });
        await this.saveEquationLinks(
          cellLinkRepository,
          cell.id,
          calculationOutput.varIds,
        );
      }
      if (existingCell) {
        const equationRecalculateService = new EquationRecalculateService(
          cellLinkRepository,
          cellRepository,
          variablesService,
        );
        await equationRecalculateService.recalculate({
          id: cell.id,
        });
      }
      return {
        result: value,
        value,
      };
    });
  }

  private async calculateEquation(
    sheetId: string,
    equation: EquationNode,
    variablesService: EquationVariablesService,
  ): Promise<CalculateEquationOutput> {
    const variableNames = findVariables(equation);
    const varIds = await this.mapVarNamesToIds(sheetId, variableNames);
    const varValues = await variablesService.populateVariables(varIds);
    const result = evalEquation(equation, varValues);
    return {
      result,
      varIds,
    };
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
  ): Promise<string[]> {
    const varsInDb = await this.cellRepository.find({
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
