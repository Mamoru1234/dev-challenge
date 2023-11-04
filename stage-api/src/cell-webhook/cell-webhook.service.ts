import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SubscribeCellInput } from './cell-webhook.interface';
import { Repository } from 'typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CellValueWebhookEntity } from '../database/entity/cell-value-webhook';

@Injectable()
export class CellWebhookService {
  constructor(
    @InjectRepository(CellEntity)
    private readonly cellRepository: Repository<CellEntity>,

    @InjectRepository(CellValueWebhookEntity)
    private readonly cellValueWebhookRepository: Repository<CellValueWebhookEntity>,
  ) {}
  private readonly logger = new Logger(CellWebhookService.name);

  async subscribe(input: SubscribeCellInput) {
    this.logger.log('Subscribing on cell', {
      input,
    });
    const cell = await this.cellRepository.findOne({
      where: {
        cellId: input.cellId.toLowerCase(),
        sheetId: input.sheetId.toLowerCase(),
      },
    });
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }
    await this.cellValueWebhookRepository.save({
      cellId: cell.id,
      url: input.webhookUrl,
    });
  }
}
