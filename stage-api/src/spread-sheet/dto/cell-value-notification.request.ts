import { Expose } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class CellValueNotificationRequest {
  @IsString()
  @Expose()
  @MaxLength(1024)
  result: string;
}
