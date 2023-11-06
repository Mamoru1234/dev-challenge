import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ExternalValueEntity } from '../database/entity/external-value.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { EvaluationContextFactory } from './evaluation/evaluation-context.factory';
import { SpreadSheetService } from './spread-sheet.service';
import { isEqualValues, parseValue, valueToString } from './equation-value';
import { EquationRecalculateService } from './equation-recalculation.service';
import { CellWebhookProcessingService } from '../cell-webhook/cell-webhook-processing.service';

@Injectable()
export class ExternalValueUpdateService {
  constructor(
    @InjectRepository(ExternalValueEntity)
    private readonly externalValueRepository: Repository<ExternalValueEntity>,
    private readonly dataSource: DataSource,
    private readonly evaluationContextFactory: EvaluationContextFactory,
    private readonly spreadSheetService: SpreadSheetService,
    private readonly equationRecalculateService: EquationRecalculateService,
    private readonly cellWebhookProcessingService: CellWebhookProcessingService,
  ) {}

  async handleUpdate(id: number, result: string): Promise<void> {
    const externalValue = await this.externalValueRepository.findOne({
      where: {
        id,
      },
      select: ['id', 'result'],
    });
    if (!externalValue) {
      throw new BadRequestException('Unknown external value notification');
    }
    if (externalValue.result === result) {
      return;
    }
    await this.externalValueRepository.update(
      {
        id,
      },
      {
        result,
      },
    );
    return this.dataSource.transaction(async (tx) => {
      const cells = await this.getCellsToUpdate(tx, id);
      for (const cell of cells) {
        await this.recalculateCell(tx, cell);
      }
    });
  }

  private async recalculateCell(
    tx: EntityManager,
    cell: CellEntity,
  ): Promise<void> {
    const context = this.evaluationContextFactory.createContext(tx);
    const cellRepository = tx.getRepository(CellEntity);
    const { result: newResult } =
      await this.spreadSheetService.calculateEquation(
        cell.sheetId,
        cell.equation!,
        context,
        cell.defaultVars!,
        cellRepository,
      );
    if (isEqualValues(newResult, parseValue(cell.result))) {
      return;
    }
    await cellRepository.save({
      id: cell.id,
      result: valueToString(newResult),
    });
    const updatedCells = await this.equationRecalculateService.recalculate({
      id: cell.id,
      context,
      tx,
    });
    await this.cellWebhookProcessingService.processHooks(
      updatedCells.concat([cell]),
    );
  }

  private getCellsToUpdate(tx: EntityManager, id: number) {
    return tx
      .getRepository(CellEntity)
      .createQueryBuilder('cell')
      .select([
        'cell.id',
        'cell.equation',
        'cell.result',
        'cell.defaultVars',
        'cell.sheetId',
        'cell.cellId',
      ])
      .innerJoin('cell.externals', 'external')
      .where('external.id = :externalId', {
        externalId: id,
      })
      .getMany();
  }
}
