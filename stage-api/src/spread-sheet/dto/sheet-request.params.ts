import { Expose, Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class SheetRequestParams {
  @Expose({
    name: 'sheet_id',
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsString()
  @MaxLength(1024)
  sheetId: string;
}
