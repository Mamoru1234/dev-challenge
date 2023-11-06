import { Module } from '@nestjs/common';
import { SpreadSheetController } from './spread-sheet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { SpreadSheetService } from './spread-sheet.service';
import { CellLinkEntity } from '../database/entity/cell-link.entity';
import { CellWebhookModule } from '../cell-webhook/cell-webhook.module';
import { ExternalArgsFetcher } from './evaluation/external-args.fetcher';
import { EvaluationContextFactory } from './evaluation/evaluation-context.factory';
import { EquationRecalculateService } from './equation-recalculation.service';
import { HttpModule } from '@nestjs/axios';
import { EquationExternalsProcessing } from './equation-externals-processing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CellEntity, CellLinkEntity]),
    CellWebhookModule,
    HttpModule,
  ],
  controllers: [SpreadSheetController],
  providers: [
    SpreadSheetService,
    ExternalArgsFetcher,
    EvaluationContextFactory,
    EquationRecalculateService,
    EquationExternalsProcessing,
  ],
})
export class SpreadSheetModule {}
