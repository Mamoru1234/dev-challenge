import { Module } from '@nestjs/common';
import { CellWebhookService } from './cell-webhook.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { CellValueWebhookEntity } from '../database/entity/cell-value-webhook';
import { CellWebhookProcessingService } from './cell-webhook-processing.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([CellEntity, CellValueWebhookEntity]),
    HttpModule,
  ],
  providers: [CellWebhookService, CellWebhookProcessingService],
  exports: [CellWebhookService, CellWebhookProcessingService],
})
export class CellWebhookModule {}
