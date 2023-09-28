import { In, Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { BadRequestException, Logger } from '@nestjs/common';
import { has } from 'lodash';

export interface PopulatedData {
  cellId: string;
  value: number;
}

export class EquationVariablesService {
  private readonly populated: Record<string, PopulatedData> = {};
  private readonly logger = new Logger(EquationVariablesService.name);
  constructor(private readonly cellRepository: Repository<CellEntity>) {}

  async populateVariables(
    variables: string[],
  ): Promise<Record<string, number>> {
    const populatedVars = Object.keys(this.populated);
    const missingVars = variables.filter((it) => !populatedVars.includes(it));
    this.logger.log('Vars to be loaded from DB', {
      missingVars,
    });
    const varsInDb = await this.cellRepository.find({
      where: {
        id: In(missingVars),
      },
      select: ['id', 'result', 'cellId'],
    });
    if (missingVars.length !== varsInDb.length) {
      const dbVars = varsInDb.map((it) => it.id);
      const wrongVars = missingVars.filter((it) => !dbVars.includes(it));
      throw new BadRequestException(
        `Wrong link some variables are not defined ${JSON.stringify(
          wrongVars,
        )}`,
      );
    }
    const dbResult = varsInDb.reduce(
      (prev, it) => {
        prev[it.id] = {
          cellId: it.cellId,
          value: +it.result,
        };
        return prev;
      },
      {} as Record<string, PopulatedData>,
    );
    Object.assign(this.populated, dbResult);
    return variables.reduce(
      (agr, it) => {
        const varData = this.populated[it];
        agr[varData.cellId] = varData.value;
        return agr;
      },
      {} as Record<string, number>,
    );
  }

  setValue(id: string, data: PopulatedData): void {
    if (has(this.populated, id)) {
      throw new Error(`Var is already populated ${id} : ${data.cellId}`);
    }
    this.populated[id] = data;
  }
}
