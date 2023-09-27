import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SpreadSheetService } from './spread-sheet.service';
import { CellData, GetSheetOutput } from './spread-sheet.interface';

@Controller()
export class SpreadSheetController {
  constructor(private readonly spreadSheetService: SpreadSheetService) {}

  @Get('/:sheet_id')
  getSheet(@Param('sheet_id') sheetId: string): Promise<GetSheetOutput> {
    return this.spreadSheetService.getSheet(sheetId);
  }

  @Post('/:sheet_id/:cell_id')
  createCell(
    @Param('sheet_id') sheetId: string,
    @Param('cell_id') cellId: string,
    @Body() body: { value: string },
  ): Promise<CellData> {
    return this.spreadSheetService.createCell({
      sheetId,
      cellId,
      value: body.value,
    });
  }
}
