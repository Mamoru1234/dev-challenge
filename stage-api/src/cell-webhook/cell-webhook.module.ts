import { Module } from '@nestjs/common';
import { CellWebhookService } from './cell-webhook.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { CellValueWebhookEntity } from '../database/entity/cell-value-webhook';

@Module({
  imports: [TypeOrmModule.forFeature([CellEntity, CellValueWebhookEntity])],
  providers: [CellWebhookService],
  exports: [CellWebhookService],
})
export class CellWebhookModule {}
