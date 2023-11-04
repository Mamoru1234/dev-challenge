import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/data-source';
import { SpreadSheetModule } from './spread-sheet/spread-sheet.module';
import { CellWebhookModule } from './cell-webhook/cell-webhook.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
    }),
    SpreadSheetModule,
    CellWebhookModule,
  ],
})
export class AppModule {}
