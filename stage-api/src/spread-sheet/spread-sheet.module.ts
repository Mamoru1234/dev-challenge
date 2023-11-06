import { Module } from '@nestjs/common';
import { SpreadSheetController } from './spread-sheet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { SpreadSheetService } from './spread-sheet.service';
import { CellLinkEntity } from '../database/entity/cell-link.entity';
import { CellWebhookModule } from '../cell-webhook/cell-webhook.module';
import { EvaluationContextFactory } from './evaluation/evaluation-context.factory';
import { EquationRecalculateService } from './equation-recalculation.service';
import { HttpModule } from '@nestjs/axios';
import { EquationPreProcessingService } from './evaluation/equation-pre-processing.service';
import { ExternalValueEntity } from '../database/entity/external-value.entity';
import { ExternalValueUpdateService } from './external-value-update.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CellEntity, CellLinkEntity, ExternalValueEntity]),
    CellWebhookModule,
    HttpModule,
  ],
  controllers: [SpreadSheetController],
  providers: [
    SpreadSheetService,
    EvaluationContextFactory,
    EquationRecalculateService,
    ExternalValueUpdateService,
    EquationPreProcessingService,
  ],
})
export class SpreadSheetModule {}
