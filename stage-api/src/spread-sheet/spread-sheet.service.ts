import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import {
  CellData,
  CreateCellInput,
  GetSheetOutput,
} from './spread-sheet.interface';
import { CellEquationParser } from './cell-equation.parser';
import { evalEquation, findVariables } from './equation.utils';
import { EquationVariablesService } from './equation-variables.service';
import { EquationNode } from 'equation-parser';
import { CellLinkEntity } from '../database/entity/cell-link.entity';

@Injectable()
export class SpreadSheetService {
  constructor(
    @InjectRepository(CellEntity)
    private readonly cellRepository: Repository<CellEntity>,
    @InjectRepository(CellLinkEntity)
    private readonly cellLinkRepository: Repository<CellLinkEntity>,
    private readonly cellEquationParser: CellEquationParser,
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

  async createCell(input: CreateCellInput): Promise<CellData> {
    const { cellId, sheetId, value } = input;
    const equation = this.cellEquationParser.parse(value);
    const result = equation
      ? await this.calculateResult(sheetId, equation)
      : value;
    const cell = await this.cellRepository.save({
      sheetId,
      cellId,
      value,
      result,
      equation,
    });
    if (equation) {
      await this.saveEquationLinks(sheetId, cell.id, equation);
    }
    return {
      result: value,
      value,
    };
  }

  private async calculateResult(
    sheetId: string,
    equation: EquationNode,
  ): Promise<string> {
    const variablesService = new EquationVariablesService(this.cellRepository);
    const variableNames = findVariables(equation);
    const varIds = await this.mapVarNamesToIds(sheetId, variableNames);
    const varValues = await variablesService.populateVariables(varIds);
    return evalEquation(equation, varValues);
  }

  private async saveEquationLinks(
    sheetId: string,
    id: string,
    equation: EquationNode,
  ): Promise<void> {
    const variableNames = findVariables(equation);
    const varIds = await this.mapVarNamesToIds(sheetId, variableNames);
    // TODO remove outdated links
    const links: Partial<CellLinkEntity>[] = varIds.map((it) => ({
      fromCellId: it,
      toCellId: id,
    }));
    await this.cellLinkRepository.save(links);
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
      throw new BadRequestException(
        `Wrong link some variables are not defined ${JSON.stringify(
          wrongVars,
        )}`,
      );
    }
    return varsInDb.map((it) => it.id);
  }
}
