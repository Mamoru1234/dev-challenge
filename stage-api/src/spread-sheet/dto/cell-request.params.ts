import { Expose, Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class CellRequestParams {
  @Expose({
    name: 'cell_id',
  })
  @IsString()
  @MaxLength(1024)
  @Transform(({ value }) => value.toLowerCase())
  cellId: string;

  @Expose({
    name: 'sheet_id',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsString()
  @MaxLength(1024)
  sheetId: string;
}
