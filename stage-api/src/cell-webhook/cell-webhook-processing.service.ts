import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CellValueWebhookEntity } from '../database/entity/cell-value-webhook';
import { In, Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CellWebhookProcessingService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(CellValueWebhookEntity)
    private readonly cellValueWebhookRepository: Repository<CellValueWebhookEntity>,
  ) {}

  async processHooks(cells: CellEntity[]): Promise<void> {
    const hooks = await this.cellValueWebhookRepository.find({
      where: {
        cellId: In(cells.map((it) => it.id)),
      },
      select: ['id', 'url', 'cellId'],
    });
    // TODO batching or rabbit
    await Promise.all(
      hooks.map((hook) => {
        const cell = cells.find((cell) => cell.id == hook.cellId);
        if (!cell) {
          throw new InternalServerErrorException('Cell for hook not found');
        }
        return this.sendNotification(cell, hook);
      }),
    );
  }

  private async sendNotification(
    cell: CellEntity,
    hook: CellValueWebhookEntity,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.post(hook.url, {
        value: cell.value,
        result: cell.result,
      }),
    );
  }
}
