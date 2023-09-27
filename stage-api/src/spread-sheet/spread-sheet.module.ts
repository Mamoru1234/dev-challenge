import { Module } from '@nestjs/common';
import { SpreadSheetController } from './spread-sheet.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellEntity } from '../database/entity/cell.entity';
import { SpreadSheetService } from './spread-sheet.service';
import { CellEquationParser } from './cell-equation.parser';
import { CellLinkEntity } from '../database/entity/cell-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CellEntity, CellLinkEntity])],
  controllers: [SpreadSheetController],
  providers: [SpreadSheetService, CellEquationParser],
})
export class SpreadSheetModule {}
