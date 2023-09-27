import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/data-source';
import { SpreadSheetModule } from './spread-sheet/spread-sheet.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
    }),
    SpreadSheetModule,
  ],
})
export class AppModule {}
